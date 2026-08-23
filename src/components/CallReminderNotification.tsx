import React, { useState, useEffect, useCallback, useRef } from "react";
import { Lead, TimelineItem } from "../types";
import { 
  PhoneCall, Clock, CheckCircle2, X, Bell, BellRing, 
  ExternalLink, ChevronRight, Volume2, VolumeX, AlertCircle,
  Calendar, PhoneForwarded, Copy, Check
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface CallReminderNotificationProps {
  leads: Lead[];
  currentUser?: string | null;
  onSelectLead: (lead: Lead) => void;
  onUpdateLead: (lead: Lead) => Promise<void> | void;
}

// LocalStorage key to track dismissed/processed reminder keys
const PROCESSED_REMINDERS_STORAGE_KEY = "crm_processed_reminder_keys";
const SOUND_MUTED_STORAGE_KEY = "crm_reminder_sound_muted";

// Helper to get processed reminder keys
function getProcessedReminderKeys(): Set<string> {
  try {
    const raw = localStorage.getItem(PROCESSED_REMINDERS_STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

// Helper to mark a reminder key as processed
function markReminderKeyProcessed(key: string) {
  try {
    const keys = getProcessedReminderKeys();
    keys.add(key);
    // Keep max 200 recent keys
    const arr = Array.from(keys).slice(-200);
    localStorage.setItem(PROCESSED_REMINDERS_STORAGE_KEY, JSON.stringify(arr));
  } catch (err) {
    console.error("Failed to save processed reminder key:", err);
  }
}

// Synthesize a pleasant chime using Web Audio API
function playChimeSound() {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    
    const ctx = new AudioContextClass();
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    
    // Pleasant 3-note harmonic chime (G5 -> C6 -> E6)
    const notes = [
      { freq: 783.99, start: 0, duration: 0.18 },    // G5
      { freq: 1046.50, start: 0.12, duration: 0.22 }, // C6
      { freq: 1318.51, start: 0.24, duration: 0.45 }  // E6
    ];

    notes.forEach(({ freq, start, duration }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + start);

      gain.gain.setValueAtTime(0, now + start);
      gain.gain.linearRampToValueAtTime(0.12, now + start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + start + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + start);
      osc.stop(now + start + duration);
    });

    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 1200);
  } catch (err) {
    // Browsers may block audio if no prior user gesture - ignore gracefully
    console.debug("Audio reminder muted by browser policy:", err);
  }
}

export default function CallReminderNotification({
  leads,
  currentUser,
  onSelectLead,
  onUpdateLead
}: CallReminderNotificationProps) {
  const [processedKeys, setProcessedKeys] = useState<Set<string>>(() => getProcessedReminderKeys());
  const [activeLeadIndex, setActiveLeadIndex] = useState(0);
  const [isSnoozeMenuOpen, setIsSnoozeMenuOpen] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isMuted, setIsMuted] = useState<boolean>(() => {
    try {
      return localStorage.getItem(SOUND_MUTED_STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });

  // Track the current time, re-evaluated every 10 seconds for real-time alerts
  const [currentTick, setCurrentTick] = useState<Date>(new Date());
  
  // Track keys that have already played audio during this session to avoid repeated chimes
  const playedSoundKeysRef = useRef<Set<string>>(new Set());

  // Periodically update current tick (every 10 seconds)
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTick(new Date());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    try {
      localStorage.setItem(SOUND_MUTED_STORAGE_KEY, String(nextMuted));
    } catch {}
  };

  // Find due leads based on current date & time
  const todayStr = currentTick.toISOString().split("T")[0]; // YYYY-MM-DD
  const currentHour = String(currentTick.getHours()).padStart(2, "0");
  const currentMin = String(currentTick.getMinutes()).padStart(2, "0");
  const currentHourMinute = `${currentHour}:${currentMin}`;

  const isSpecialManager = currentUser?.trim().toLowerCase() === "phere" || currentUser?.trim().toLowerCase() === "jack";

  const dueLeads = leads.filter(lead => {
    // Check permission: sales role vs manager
    if (!isSpecialManager && currentUser && lead.salesPerson && lead.salesPerson !== currentUser) {
      return false;
    }

    // Must have followUp with date and not completed
    if (!lead.followUp || !lead.followUp.date || lead.followUp.isCompleted) {
      return false;
    }

    const followUpDate = lead.followUp.date.trim();
    const followUpTime = (lead.followUp.time || "10:00").trim();
    const reminderKey = `${lead.id}_${followUpDate}_${followUpTime}`;

    // Skip if already processed or dismissed
    if (processedKeys.has(reminderKey)) {
      return false;
    }

    // Check if time has arrived
    // 1. Overdue from previous days
    if (followUpDate < todayStr) {
      return true;
    }

    // 2. Due today and time has reached or passed
    if (followUpDate === todayStr) {
      if (followUpTime <= currentHourMinute) {
        return true;
      }
    }

    return false;
  });

  const activeLead = dueLeads[activeLeadIndex] || dueLeads[0];

  // Play audio chime once when a new due lead pop-up appears
  useEffect(() => {
    if (!activeLead || isMuted) return;

    const followUpDate = activeLead.followUp.date.trim();
    const followUpTime = (activeLead.followUp.time || "10:00").trim();
    const reminderKey = `${activeLead.id}_${followUpDate}_${followUpTime}`;

    if (!playedSoundKeysRef.current.has(reminderKey)) {
      playedSoundKeysRef.current.add(reminderKey);
      playChimeSound();
    }
  }, [activeLead?.id, activeLead?.followUp?.date, activeLead?.followUp?.time, isMuted]);

  // Adjust active index if count changes
  useEffect(() => {
    if (activeLeadIndex >= dueLeads.length && dueLeads.length > 0) {
      setActiveLeadIndex(0);
    }
  }, [dueLeads.length, activeLeadIndex]);

  if (!activeLead) {
    return null;
  }

  const activeReminderKey = `${activeLead.id}_${activeLead.followUp.date}_${activeLead.followUp.time || "10:00"}`;

  // 1. DISMISS / CLOSE POP-UP
  const handleDismiss = () => {
    markReminderKeyProcessed(activeReminderKey);
    setProcessedKeys(prev => new Set([...prev, activeReminderKey]));
    setIsSnoozeMenuOpen(false);
  };

  // 2. SNOOZE (เลื่อนเตือน: 5 นาที, 10 นาที, 30 นาที, 1 ชั่วโมง)
  const handleSnoozeMinutes = async (minutes: number, label: string) => {
    if (isUpdating) return;
    setIsUpdating(true);

    try {
      const now = new Date();
      const newTarget = new Date(now.getTime() + minutes * 60 * 1000);
      const newDateStr = newTarget.toISOString().split("T")[0];
      const newTimeStr = `${String(newTarget.getHours()).padStart(2, "0")}:${String(newTarget.getMinutes()).padStart(2, "0")}`;

      const timelineItem: TimelineItem = {
        id: `id_${Math.random().toString(36).substring(2, 10)}`,
        title: `⏰ เลื่อนเวลาโทรติดตาม (${label})`,
        description: `เลื่อนการโทรติดตามไปเป็นวันที่ ${newDateStr} เวลา ${newTimeStr} น.`,
        date: new Date().toISOString(),
        type: "followup",
        author: currentUser || "ระบบ"
      };

      const updatedLead: Lead = {
        ...activeLead,
        followUp: {
          ...activeLead.followUp,
          date: newDateStr,
          time: newTimeStr,
          isCompleted: false,
          updatedAt: new Date().toISOString(),
          updatedBy: currentUser || "ระบบ"
        },
        timeline: [...(activeLead.timeline || []), timelineItem]
      };

      // Mark old key as processed so it won't alert immediately
      markReminderKeyProcessed(activeReminderKey);
      setProcessedKeys(prev => new Set([...prev, activeReminderKey]));

      await onUpdateLead(updatedLead);
      setIsSnoozeMenuOpen(false);
    } catch (err) {
      console.error("Failed to snooze follow-up:", err);
    } finally {
      setIsUpdating(false);
    }
  };

  // 3. CALL NOW (โทรเลย)
  const handleCallNow = async () => {
    if (isUpdating) return;
    setIsUpdating(true);

    try {
      const phoneToCall = (activeLead.phone || "").replace(/[^0-9+]/g, "");

      const timelineItem: TimelineItem = {
        id: `id_${Math.random().toString(36).substring(2, 10)}`,
        title: "📞 ดำเนินการโทรตามนัดหมายแจ้งเตือน",
        description: `โทรออกหาลูกค้า (${activeLead.shopName || activeLead.contactName}) ตามนัดหมาย ${activeLead.followUp?.date} เวลา ${activeLead.followUp?.time || "10:00"} น.`,
        date: new Date().toISOString(),
        type: "call",
        author: currentUser || "ระบบ"
      };

      const newCallLog = {
        id: `id_${Math.random().toString(36).substring(2, 10)}`,
        date: new Date().toISOString().split("T")[0],
        answered: true,
        interestLevel: activeLead.score || 3,
        notes: `โทรตามนัดหมายแจ้งเตือน: ${activeLead.followUp?.topic || activeLead.followUp?.note || "ติดตามลูกค้า"}`
      };

      const updatedLead: Lead = {
        ...activeLead,
        calls: [...(activeLead.calls || []), newCallLog],
        timeline: [...(activeLead.timeline || []), timelineItem]
      };

      // Mark this reminder as processed
      markReminderKeyProcessed(activeReminderKey);
      setProcessedKeys(prev => new Set([...prev, activeReminderKey]));

      // Trigger tel: call
      if (phoneToCall) {
        window.location.href = `tel:${phoneToCall}`;
      }

      await onUpdateLead(updatedLead);
      setIsSnoozeMenuOpen(false);
    } catch (err) {
      console.error("Failed to execute call now:", err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCopyPhone = () => {
    if (!activeLead.phone) return;
    navigator.clipboard.writeText(activeLead.phone);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  const appointmentTopic = activeLead.followUp?.topic 
    ? activeLead.followUp.topic 
    : (activeLead.followUp?.note || activeLead.followUp?.detail || "โทรติดตามความคืบหน้า");

  return (
    <div id="call-followup-reminder-popup" className="fixed bottom-5 right-5 z-50 max-w-md w-[calc(100vw-2.5rem)] sm:w-[400px]">
      <motion.div
        initial={{ opacity: 0, y: 25, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 25, scale: 0.95 }}
        transition={{ type: "spring", stiffness: 350, damping: 25 }}
        className="bg-white rounded-2xl shadow-2xl border border-amber-300 ring-4 ring-amber-400/20 overflow-hidden font-sans"
      >
        {/* Top Gradient Header */}
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 px-4 py-3 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/20 rounded-xl animate-pulse">
              <BellRing className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm tracking-wide flex items-center gap-1.5">
                <span>🔔 ถึงเวลาติดต่อลูกค้า</span>
              </h3>
              <span className="text-[11px] text-amber-100 font-medium block">
                {dueLeads.length > 1 ? `นัดหมายที่ ${activeLeadIndex + 1} จากทั้งหมด ${dueLeads.length} ราย` : "นัดหมายโทรติดตามในระบบ"}
              </span>
            </div>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-1">
            {dueLeads.length > 1 && (
              <button
                type="button"
                id="reminder-next-lead-btn"
                onClick={() => setActiveLeadIndex((prev) => (prev + 1) % dueLeads.length)}
                className="text-[10px] bg-white/20 hover:bg-white/30 text-white font-bold px-2 py-1 rounded-lg transition-colors cursor-pointer mr-1"
                title="ดูนัดหมายถัดไป"
              >
                ถัดไป ({activeLeadIndex + 1}/{dueLeads.length})
              </button>
            )}

            {/* Mute/Unmute audio button */}
            <button
              type="button"
              id="reminder-toggle-sound-btn"
              onClick={toggleMute}
              className="p-1.5 text-white/90 hover:text-white rounded-lg hover:bg-white/20 transition-colors cursor-pointer"
              title={isMuted ? "เปิดเสียงเตือน" : "ปิดเสียงเตือน"}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-amber-200" /> : <Volume2 className="w-4 h-4" />}
            </button>

            {/* Close button */}
            <button
              type="button"
              id="reminder-close-popup-btn"
              onClick={handleDismiss}
              className="p-1.5 text-white/90 hover:text-white rounded-lg hover:bg-white/20 transition-colors cursor-pointer"
              title="ปิดการแจ้งเตือน"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 space-y-3.5 bg-slate-50/50">
          {/* Main Appointment Details Card */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-2 text-xs">
            {/* Customer Name */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <span className="text-[11px] font-bold text-slate-400 block">ลูกค้า:</span>
                <p className="font-bold text-slate-900 text-sm truncate">
                  {activeLead.shopName || activeLead.contactName || "ไม่ระบุชื่อลูกค้า"}
                </p>
                {activeLead.contactName && activeLead.shopName && (
                  <p className="text-[11px] text-slate-500 truncate">ผู้ติดต่อ: {activeLead.contactName}</p>
                )}
              </div>

              <button
                type="button"
                id="reminder-view-lead-details-btn"
                onClick={() => onSelectLead(activeLead)}
                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] rounded-lg transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                title="ดูข้อมูลลูกค้าฉบับเต็ม"
              >
                <span>ดูข้อมูล</span>
                <ExternalLink className="w-3 h-3 text-slate-500" />
              </button>
            </div>

            {/* Phone Number */}
            <div className="flex items-center justify-between pt-1 border-t border-slate-100">
              <span className="text-[11px] font-bold text-slate-400">เบอร์:</span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-bold text-slate-800 text-sm">
                  {activeLead.phone || "-"}
                </span>
                {activeLead.phone && (
                  <button
                    type="button"
                    onClick={handleCopyPhone}
                    className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-700 transition-colors"
                    title="คัดลอกเบอร์โทร"
                  >
                    {copiedPhone ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>
            </div>

            {/* Appointment Topic */}
            <div className="pt-1 border-t border-slate-100">
              <span className="text-[11px] font-bold text-slate-400 block">นัดหมาย:</span>
              <p className="font-medium text-slate-800 mt-0.5 leading-snug">
                {appointmentTopic}
              </p>
            </div>

            {/* Appointment Time */}
            <div className="flex items-center justify-between pt-1 border-t border-slate-100">
              <span className="text-[11px] font-bold text-slate-400">เวลา:</span>
              <div className="flex items-center gap-1.5 font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                <Clock className="w-3 h-3 text-amber-600" />
                <span>
                  {activeLead.followUp.date === todayStr ? "วันนี้ " : `${activeLead.followUp.date} `}
                  {activeLead.followUp.time || "10:00"} น.
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons Row: 📞 โทรเลย | ⏰ เลื่อนเตือน | ✕ ปิด */}
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              {/* Button: โทรเลย */}
              <button
                type="button"
                id="reminder-call-now-btn"
                disabled={isUpdating || !activeLead.phone}
                onClick={handleCallNow}
                className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <PhoneCall className="w-4 h-4" />
                <span>📞 โทรเลย</span>
              </button>

              {/* Button: เลื่อนเตือน */}
              <button
                type="button"
                id="reminder-snooze-toggle-btn"
                disabled={isUpdating}
                onClick={() => setIsSnoozeMenuOpen(!isSnoozeMenuOpen)}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 border cursor-pointer ${
                  isSnoozeMenuOpen 
                    ? "bg-amber-100 text-amber-900 border-amber-300" 
                    : "bg-white hover:bg-slate-100 text-slate-700 border-slate-200 shadow-2xs"
                }`}
              >
                <Clock className="w-4 h-4 text-amber-600" />
                <span>{isSnoozeMenuOpen ? "ซ่อนตัวเลือก" : "เลื่อนเตือน"}</span>
              </button>
            </div>

            {/* Button: ปิด */}
            <button
              type="button"
              id="reminder-dismiss-bottom-btn"
              disabled={isUpdating}
              onClick={handleDismiss}
              className="w-full py-1.5 text-center text-slate-400 hover:text-slate-600 font-semibold text-xs transition-colors cursor-pointer hover:underline"
            >
              ปิด (รับทราบแล้ว)
            </button>
          </div>

          {/* Snooze Options Selection Popover/Menu */}
          <AnimatePresence>
            {isSnoozeMenuOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.18 }}
                className="pt-2 border-t border-slate-200 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500">เลือกเวลาที่ต้องการเลื่อนเตือน:</span>
                </div>

                <div className="grid grid-cols-4 gap-1.5">
                  <button
                    type="button"
                    id="snooze-5m-btn"
                    disabled={isUpdating}
                    onClick={() => handleSnoozeMinutes(5, "5 นาที")}
                    className="py-2 px-1 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 rounded-xl font-bold text-xs text-center transition-colors cursor-pointer"
                  >
                    5 นาที
                  </button>

                  <button
                    type="button"
                    id="snooze-10m-btn"
                    disabled={isUpdating}
                    onClick={() => handleSnoozeMinutes(10, "10 นาที")}
                    className="py-2 px-1 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 rounded-xl font-bold text-xs text-center transition-colors cursor-pointer"
                  >
                    10 นาที
                  </button>

                  <button
                    type="button"
                    id="snooze-30m-btn"
                    disabled={isUpdating}
                    onClick={() => handleSnoozeMinutes(30, "30 นาที")}
                    className="py-2 px-1 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 rounded-xl font-bold text-xs text-center transition-colors cursor-pointer"
                  >
                    30 นาที
                  </button>

                  <button
                    type="button"
                    id="snooze-1h-btn"
                    disabled={isUpdating}
                    onClick={() => handleSnoozeMinutes(60, "1 ชั่วโมง")}
                    className="py-2 px-1 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 rounded-xl font-bold text-xs text-center transition-colors cursor-pointer"
                  >
                    1 ชั่วโมง
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
