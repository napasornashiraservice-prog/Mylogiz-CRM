import React, { useState, useEffect } from "react";
import { Lead, TimelineItem } from "../types";
import { getFollowUpStatus } from "../utils/crmHelpers";
import { 
  PhoneCall, Clock, CheckCircle2, X, Bell, BellRing, 
  ExternalLink, ChevronRight, PhoneForwarded, Calendar,
  Volume2, VolumeX, AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface CallReminderNotificationProps {
  leads: Lead[];
  currentUser?: string | null;
  onSelectLead: (lead: Lead) => void;
  onUpdateLead: (lead: Lead) => Promise<void> | void;
}

export default function CallReminderNotification({
  leads,
  currentUser,
  onSelectLead,
  onUpdateLead
}: CallReminderNotificationProps) {
  const [dismissedLeadIds, setDismissedLeadIds] = useState<Record<string, number>>({});
  const [activeLeadIndex, setActiveLeadIndex] = useState(0);
  const [isSnoozeOpen, setIsSnoozeOpen] = useState(false);
  const [customSnoozeDate, setCustomSnoozeDate] = useState("");
  const [customSnoozeTime, setCustomSnoozeTime] = useState("10:00");
  const [notificationsAllowed, setNotificationsAllowed] = useState(
    typeof window !== "undefined" && "Notification" in window 
      ? Notification.permission === "granted" 
      : false
  );
  const [isMuted, setIsMuted] = useState(false);

  // Request browser notifications permission
  const handleRequestNotificationPermission = async () => {
    if (typeof window !== "undefined" && "Notification" in window) {
      const perm = await Notification.requestPermission();
      setNotificationsAllowed(perm === "granted");
    }
  };

  // Find leads requiring immediate call follow-up
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0]; // YYYY-MM-DD
  const currentHourMinute = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  const dueLeads = leads.filter(lead => {
    // Check if user is the assigned salesperson or manager
    if (currentUser && currentUser !== "Phere" && lead.salesPerson && lead.salesPerson !== currentUser) {
      return false;
    }

    if (!lead.followUp || !lead.followUp.date || lead.followUp.isCompleted) {
      return false;
    }

    // Check if snoozed / dismissed recently
    const dismissedUntil = dismissedLeadIds[lead.id];
    if (dismissedUntil && Date.now() < dismissedUntil) {
      return false;
    }

    const followUpDate = lead.followUp.date;
    const followUpTime = lead.followUp.time || "09:00";

    // Overdue or due today
    if (followUpDate < todayStr) {
      return true; // Overdue
    }

    if (followUpDate === todayStr) {
      // Due today
      return true;
    }

    return false;
  });

  const activeLead = dueLeads[activeLeadIndex] || dueLeads[0];

  // Send desktop notification when a new reminder surfaces
  useEffect(() => {
    if (activeLead && notificationsAllowed && !isMuted) {
      try {
        const title = `📞 ถึงเวลาโทรหา: ${activeLead.shopName}`;
        const body = `เบอร์: ${activeLead.phone} | เรื่อง: ${activeLead.followUp?.topic || activeLead.followUp?.note || "ติดตามลูกค้า"}`;
        new Notification(title, {
          body,
          icon: "/favicon.ico"
        });
      } catch (err) {
        console.error("Browser notification failed", err);
      }
    }
  }, [activeLead?.id, notificationsAllowed, isMuted]);

  if (!activeLead) {
    return null;
  }

  const followUpStatus = getFollowUpStatus(activeLead.followUp);

  const handleDismiss = () => {
    // Dismiss for 30 minutes in local session
    const dismissExpiry = Date.now() + 30 * 60 * 1000;
    setDismissedLeadIds(prev => ({ ...prev, [activeLead.id]: dismissExpiry }));
    setIsSnoozeOpen(false);
  };

  const handleSnooze = async (minutes: number, label: string) => {
    const target = new Date(Date.now() + minutes * 60 * 1000);
    const targetDate = target.toISOString().split("T")[0];
    const targetTime = `${String(target.getHours()).padStart(2, "0")}:${String(target.getMinutes()).padStart(2, "0")}`;

    const timelineItem: TimelineItem = {
      id: `id_${Math.random().toString(36).substring(2, 9)}`,
      title: `⏰ เลื่อนเวลาโทร (${label})`,
      description: `เลื่อนการโทรติดตามไปเป็นวันที่ ${targetDate} เวลา ${targetTime} น.`,
      date: new Date().toISOString(),
      type: "followup",
      author: currentUser || "ระบบ"
    };

    const updatedLead: Lead = {
      ...activeLead,
      followUp: {
        ...activeLead.followUp,
        date: targetDate,
        time: targetTime,
        isCompleted: false
      },
      timeline: [...(activeLead.timeline || []), timelineItem]
    };

    await onUpdateLead(updatedLead);
    setIsSnoozeOpen(false);
    // Dismiss temporarily
    setDismissedLeadIds(prev => ({ ...prev, [activeLead.id]: Date.now() + minutes * 60 * 1000 }));
  };

  const handleSnoozeTomorrow = async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const targetDate = tomorrow.toISOString().split("T")[0];
    const targetTime = "09:30";

    const timelineItem: TimelineItem = {
      id: `id_${Math.random().toString(36).substring(2, 9)}`,
      title: "⏰ เลื่อนเวลาโทรไปพรุ่งนี้เช้า",
      description: `เลื่อนการโทรติดตามไปเป็นวันที่ ${targetDate} เวลา ${targetTime} น.`,
      date: new Date().toISOString(),
      type: "followup",
      author: currentUser || "ระบบ"
    };

    const updatedLead: Lead = {
      ...activeLead,
      followUp: {
        ...activeLead.followUp,
        date: targetDate,
        time: targetTime,
        isCompleted: false
      },
      timeline: [...(activeLead.timeline || []), timelineItem]
    };

    await onUpdateLead(updatedLead);
    setIsSnoozeOpen(false);
    setDismissedLeadIds(prev => ({ ...prev, [activeLead.id]: Date.now() + 60 * 60 * 1000 }));
  };

  const handleCustomSnooze = async () => {
    if (!customSnoozeDate) return;
    const timelineItem: TimelineItem = {
      id: `id_${Math.random().toString(36).substring(2, 9)}`,
      title: "⏰ เลื่อนเวลาโทร (ระบุเอง)",
      description: `เลื่อนการโทรติดตามไปเป็นวันที่ ${customSnoozeDate} เวลา ${customSnoozeTime} น.`,
      date: new Date().toISOString(),
      type: "followup",
      author: currentUser || "ระบบ"
    };

    const updatedLead: Lead = {
      ...activeLead,
      followUp: {
        ...activeLead.followUp,
        date: customSnoozeDate,
        time: customSnoozeTime || "10:00",
        isCompleted: false
      },
      timeline: [...(activeLead.timeline || []), timelineItem]
    };

    await onUpdateLead(updatedLead);
    setIsSnoozeOpen(false);
    setDismissedLeadIds(prev => ({ ...prev, [activeLead.id]: Date.now() + 10 * 60 * 1000 }));
  };

  const handleMarkCompleted = async () => {
    const timelineItem: TimelineItem = {
      id: `id_${Math.random().toString(36).substring(2, 9)}`,
      title: "✓ โทรติดตามเรียบร้อยแล้ว",
      description: `เสร็จสิ้นการโทรติดตามตามนัดหมาย (${activeLead.followUp?.date} ${activeLead.followUp?.time || ""})`,
      date: new Date().toISOString(),
      type: "followup",
      author: currentUser || "ระบบ"
    };

    const updatedLead: Lead = {
      ...activeLead,
      followUp: {
        ...activeLead.followUp,
        isCompleted: true
      },
      timeline: [...(activeLead.timeline || []), timelineItem]
    };

    await onUpdateLead(updatedLead);
    setIsSnoozeOpen(false);
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 max-w-md w-full sm:w-96">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-2xl border-2 border-amber-300 ring-4 ring-amber-400/20 overflow-hidden"
      >
        {/* Top Header Strip */}
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 px-4 py-2.5 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-white/20 rounded-lg animate-bounce">
              <PhoneCall className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="font-bold text-xs uppercase tracking-wider block">
                🔔 แจ้งเตือนโทรหาลูกค้า (Call Reminder)
              </span>
              <span className="text-[10px] text-amber-100 block">
                {dueLeads.length > 1 ? `รายการที่ ${activeLeadIndex + 1} จากทั้งหมด ${dueLeads.length} ราย` : "ถึงเวลาติดตามดีลนี้"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {dueLeads.length > 1 && (
              <button
                type="button"
                onClick={() => setActiveLeadIndex((prev) => (prev + 1) % dueLeads.length)}
                className="text-[10px] bg-white/20 hover:bg-white/30 px-2 py-0.5 rounded font-bold transition-colors cursor-pointer mr-1"
                title="ดูรายถัดไป"
              >
                ถัดไป ({activeLeadIndex + 1}/{dueLeads.length})
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsMuted(!isMuted)}
              className="p-1 text-white/80 hover:text-white rounded hover:bg-white/10 transition-colors"
              title={isMuted ? "เปิดเสียง" : "ปิดเสียง"}
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="p-1 text-white/80 hover:text-white rounded hover:bg-white/10 transition-colors cursor-pointer"
              title="ซ่อนชั่วคราว"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Lead Content Box */}
        <div className="p-4 space-y-3">
          {/* Shop Name & Status */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h4 className="font-bold text-slate-900 text-sm truncate flex items-center gap-1.5">
                <span>{activeLead.shopName || "ไม่ระบุชื่อร้าน"}</span>
                {activeLead.customerType === "corporate" && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                    🏢 นิติบุคคล
                  </span>
                )}
              </h4>
              <p className="text-xs text-slate-500 truncate mt-0.5">
                ผู้ติดต่อ: <span className="font-semibold text-slate-700">{activeLead.contactName || "ไม่ระบุ"}</span>
              </p>
            </div>

            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${followUpStatus.badgeClass}`}>
              {followUpStatus.label}
            </span>
          </div>

          {/* Follow-up Note / Details */}
          {(activeLead.followUp?.topic || activeLead.followUp?.note || activeLead.followUp?.detail) && (
            <div className="bg-amber-50/80 border border-amber-200/80 rounded-xl p-2.5 text-xs text-amber-900">
              <span className="text-[10px] font-bold text-amber-800 block uppercase">หัวข้อ / เรื่องที่ต้องติดตาม:</span>
              <p className="font-medium mt-0.5 leading-snug">
                {activeLead.followUp.topic ? <strong>{activeLead.followUp.topic}: </strong> : null}
                {activeLead.followUp.note || activeLead.followUp.detail || "ติดตามความคืบหน้าการสมัคร"}
              </p>
            </div>
          )}

          {/* Phone Call Quick Strip */}
          <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl p-2.5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                <PhoneCall className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-semibold">เบอร์โทรศัพท์</span>
                <span className="font-mono font-bold text-slate-800 text-sm">{activeLead.phone || "ไม่มีเบอร์"}</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {activeLead.phone && (
                <a
                  href={`tel:${activeLead.phone}`}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1 shadow-xs"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  <span>โทรออก</span>
                </a>
              )}
              <button
                type="button"
                onClick={() => onSelectLead(activeLead)}
                className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-lg border border-blue-200 transition-colors flex items-center gap-1"
                title="เปิดดูรายละเอียด Lead"
              >
                <span>เปิดดู</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Action Buttons Row */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsSnoozeOpen(!isSnoozeOpen)}
              className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 border border-slate-200 cursor-pointer"
            >
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              <span>{isSnoozeOpen ? "ปิดเมนูเลื่อน" : "เลื่อนเวลา (Snooze)"}</span>
            </button>

            <button
              type="button"
              onClick={handleMarkCompleted}
              className="py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>โทรเสร็จแล้ว</span>
            </button>
          </div>

          {/* Snooze Options Drawer */}
          <AnimatePresence>
            {isSnoozeOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="pt-2 border-t border-slate-100 space-y-2 text-xs"
              >
                <span className="text-[10px] font-bold text-slate-400 block uppercase">เลือกเวลาเลื่อนการโทร:</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleSnooze(15, "+15 นาที")}
                    className="p-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 rounded font-semibold text-[11px] text-center cursor-pointer"
                  >
                    +15 นาที
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSnooze(30, "+30 นาที")}
                    className="p-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 rounded font-semibold text-[11px] text-center cursor-pointer"
                  >
                    +30 นาที
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSnooze(60, "+1 ชั่วโมง")}
                    className="p-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 rounded font-semibold text-[11px] text-center cursor-pointer"
                  >
                    +1 ชม.
                  </button>
                  <button
                    type="button"
                    onClick={handleSnoozeTomorrow}
                    className="p-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-900 rounded font-semibold text-[11px] text-center cursor-pointer"
                  >
                    พรุ่งนี้ 09:30
                  </button>
                </div>

                {/* Custom Snooze Date/Time input */}
                <div className="bg-slate-50 p-2 rounded-lg border border-slate-200 space-y-1.5 mt-1">
                  <span className="text-[10px] font-bold text-slate-500 block">ระบุวันและเวลาเอง:</span>
                  <div className="flex gap-1.5">
                    <input
                      type="date"
                      value={customSnoozeDate}
                      onChange={(e) => setCustomSnoozeDate(e.target.value)}
                      className="flex-1 bg-white border border-slate-300 rounded p-1 text-[11px] font-mono focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                    <input
                      type="time"
                      value={customSnoozeTime}
                      onChange={(e) => setCustomSnoozeTime(e.target.value)}
                      className="w-20 bg-white border border-slate-300 rounded p-1 text-[11px] font-mono focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                    <button
                      type="button"
                      disabled={!customSnoozeDate}
                      onClick={handleCustomSnooze}
                      className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold rounded text-[11px] cursor-pointer"
                    >
                      ตกลง
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Browser Notification Permission Prompt */}
          {!notificationsAllowed && typeof window !== "undefined" && "Notification" in window && (
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span className="flex items-center gap-1">
                <Bell className="w-3 h-3 text-amber-500" /> รับแจ้งเตือนบนเบราว์เซอร์
              </span>
              <button
                type="button"
                onClick={handleRequestNotificationPermission}
                className="text-blue-600 hover:underline font-bold"
              >
                เปิดใช้งาน
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
