import React, { useState } from "react";
import { Lead, TimelineItem, FollowUpPriority, StatusLabels, StatusColors } from "../types";
import { X, Clock, Calendar, CheckCircle2, ChevronRight, PhoneCall } from "lucide-react";
import { motion } from "motion/react";

interface QuickSnoozeModalProps {
  lead: Lead;
  isOpen: boolean;
  onClose: () => void;
  onUpdateLead: (lead: Lead) => Promise<void> | void;
  currentUser?: string | null;
}

export default function QuickSnoozeModal({
  lead,
  isOpen,
  onClose,
  onUpdateLead,
  currentUser
}: QuickSnoozeModalProps) {
  if (!isOpen) return null;

  const [customDays, setCustomDays] = useState<number>(1);
  const [customDate, setCustomDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  });
  const [customTime, setCustomTime] = useState<string>(lead.followUp?.time || "10:00");
  const [priority, setPriority] = useState<FollowUpPriority>(
    (lead.followUp?.priority as FollowUpPriority) || "normal"
  );
  const [note, setNote] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleApplySnooze = async (days?: number, specificDate?: string, specificTime?: string) => {
    setIsSubmitting(true);
    try {
      let targetDateStr = specificDate;
      if (!targetDateStr) {
        const d = new Date();
        d.setDate(d.getDate() + (days || 1));
        targetDateStr = d.toISOString().split("T")[0];
      }

      const targetTimeStr = specificTime || customTime || "10:00";
      const nowIso = new Date().toISOString();
      const author = currentUser || lead.salesPerson || "ระบบ";

      const timelineItem: TimelineItem = {
        id: `id_${Math.random().toString(36).substring(2, 9)}`,
        title: `⏰ เลื่อนการโทรติดตาม`,
        description: `เลื่อนนัดเป็นวันที่ ${targetDateStr} เวลา ${targetTimeStr} น. โดย ${author}${note ? ` (หมายเหตุ: ${note})` : ""}`,
        date: nowIso,
        type: "followup",
        author
      };

      const updatedLead: Lead = {
        ...lead,
        followUp: {
          ...lead.followUp,
          date: targetDateStr,
          time: targetTimeStr,
          isCompleted: false,
          priority,
          note: note ? `${note} (เลื่อนจาก ${lead.followUp?.date || "เดิม"})` : lead.followUp?.note,
          updatedAt: nowIso,
          updatedBy: author
        },
        timeline: [timelineItem, ...(lead.timeline || [])],
        updatedAt: nowIso
      };

      await onUpdateLead(updatedLead);
      onClose();
    } catch (err) {
      console.error("Failed to snooze follow-up:", err);
      alert("เกิดข้อผิดพลาดในการเลื่อนนัด กรุณาลองใหม่อีกครั้ง");
    } finally {
      setIsSubmitting(false);
    }
  };

  const statusColorClass = StatusColors[lead.status] || "bg-slate-100 text-slate-700";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden my-6"
        id="quick-snooze-modal"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-amber-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-100 text-amber-800 rounded-xl">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">เลื่อนกำหนดนัดหมาย</h3>
              <p className="text-xs text-slate-500">เลือกวันและเวลาที่ต้องการโทรติดตามลูกค้าใหม่</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Lead Details summary */}
        <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-200/60 flex items-center justify-between gap-2 text-xs">
          <div className="truncate">
            <span className="font-bold text-slate-900">{lead.shopName || "ไม่ระบุชื่อร้าน"}</span>
            {lead.contactName && <span className="text-slate-500 ml-1.5">({lead.contactName})</span>}
          </div>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusColorClass}`}>
            {StatusLabels[lead.status] || lead.status}
          </span>
        </div>

        {/* Quick presets */}
        <div className="p-5 space-y-4 text-xs">
          <div>
            <label className="block text-slate-500 font-bold text-[11px] mb-2">
              ตัวเลือกเลื่อนนัดด่วน (1-Click Presets)
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleApplySnooze(1, undefined, "10:00")}
                disabled={isSubmitting}
                className="p-3 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl text-left transition-all cursor-pointer group flex items-center justify-between"
              >
                <div>
                  <span className="font-bold text-amber-900 block text-xs">พรุ่งนี้ 10:00 น.</span>
                  <span className="text-[10px] text-amber-700">+1 วัน</span>
                </div>
                <ChevronRight className="w-4 h-4 text-amber-600 group-hover:translate-x-0.5 transition-transform" />
              </button>

              <button
                type="button"
                onClick={() => handleApplySnooze(2, undefined, "10:00")}
                disabled={isSubmitting}
                className="p-3 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl text-left transition-all cursor-pointer group flex items-center justify-between"
              >
                <div>
                  <span className="font-bold text-amber-900 block text-xs">อีก 2 วัน 10:00 น.</span>
                  <span className="text-[10px] text-amber-700">+2 วัน</span>
                </div>
                <ChevronRight className="w-4 h-4 text-amber-600 group-hover:translate-x-0.5 transition-transform" />
              </button>

              <button
                type="button"
                onClick={() => handleApplySnooze(3, undefined, "10:00")}
                disabled={isSubmitting}
                className="p-3 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl text-left transition-all cursor-pointer group flex items-center justify-between"
              >
                <div>
                  <span className="font-bold text-amber-900 block text-xs">อีก 3 วัน 10:00 น.</span>
                  <span className="text-[10px] text-amber-700">+3 วัน</span>
                </div>
                <ChevronRight className="w-4 h-4 text-amber-600 group-hover:translate-x-0.5 transition-transform" />
              </button>

              <button
                type="button"
                onClick={() => handleApplySnooze(7, undefined, "10:00")}
                disabled={isSubmitting}
                className="p-3 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl text-left transition-all cursor-pointer group flex items-center justify-between"
              >
                <div>
                  <span className="font-bold text-amber-900 block text-xs">1 สัปดาห์ 10:00 น.</span>
                  <span className="text-[10px] text-amber-700">+7 วัน</span>
                </div>
                <ChevronRight className="w-4 h-4 text-amber-600 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>

          {/* Custom Date & Time Picker */}
          <div className="pt-3 border-t border-slate-100 space-y-3">
            <label className="block text-slate-500 font-bold text-[11px]">
              หรือระบุวันและเวลาเอง
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-slate-600 text-[10px] font-bold mb-1">วันที่</label>
                <input
                  type="date"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-600 text-[10px] font-bold mb-1">เวลา</label>
                <input
                  type="time"
                  value={customTime}
                  onChange={(e) => setCustomTime(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-600 text-[10px] font-bold mb-1">ความสำคัญ (Priority)</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as FollowUpPriority)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="urgent">🔥 เร่งด่วน</option>
                <option value="important">🟠 สำคัญ</option>
                <option value="normal">⚪ ปกติ</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-600 text-[10px] font-bold mb-1">หมายเหตุการเลื่อน (ถ้ามี)</label>
              <input
                type="text"
                placeholder="เช่น ลูกค้าติดประชุม ขอโทรใหม่อีกครั้ง..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors cursor-pointer text-xs"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              id="confirm-custom-snooze-btn"
              disabled={isSubmitting || !customDate}
              onClick={() => handleApplySnooze(undefined, customDate, customTime)}
              className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl transition-all cursor-pointer text-xs flex items-center gap-1.5 shadow-xs disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? "กำลังบันทึก..." : "บันทึกการเลื่อนนัด"}</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
