import React, { useState } from "react";
import { 
  Lead, TimelineItem, NotePriority, FOLLOWUP_OUTCOMES, 
  FollowUpOutcome, NO_CONTACT_REASONS, NoContactReason, 
  FollowUpPriority, StatusLabels, StatusColors 
} from "../types";
import { 
  X, PhoneCall, Clock, CheckCircle2, Calendar, 
  AlertTriangle, Tag, FileText, Send, User, ChevronDown, Sparkles
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface FollowUpOutcomeModalProps {
  lead: Lead;
  isOpen: boolean;
  onClose: () => void;
  onUpdateLead: (lead: Lead) => Promise<void> | void;
  onAddNote?: (leadId: string, text: string, author?: string, category?: string, priority?: NotePriority, isPinned?: boolean) => Promise<void> | void;
  currentUser?: string | null;
  salespersons?: string[];
}

export default function FollowUpOutcomeModal({
  lead,
  isOpen,
  onClose,
  onUpdateLead,
  onAddNote,
  currentUser,
  salespersons = []
}: FollowUpOutcomeModalProps) {
  if (!isOpen) return null;

  const defaultAuthor = currentUser || lead.salesPerson || salespersons[0] || "Phere";
  const [author, setAuthor] = useState<string>(defaultAuthor);
  const [outcome, setOutcome] = useState<FollowUpOutcome>("ติดต่อสำเร็จ");
  const [noContactReason, setNoContactReason] = useState<NoContactReason>("ไม่รับสาย");
  const [customOutcomeText, setCustomOutcomeText] = useState("");
  const [notes, setNotes] = useState("");
  
  // Reschedule next follow-up
  const [shouldReschedule, setShouldReschedule] = useState<boolean>(false);
  const [nextDate, setNextDate] = useState<string>("");
  const [nextTime, setNextTime] = useState<string>("10:00");
  const [nextPriority, setNextPriority] = useState<FollowUpPriority>(
    (lead.followUp?.priority as FollowUpPriority) || "normal"
  );
  const [nextTopic, setNextTopic] = useState<string>(lead.followUp?.topic || "โทรสรุปเรทราคา");
  
  // Shared Notes option
  const [saveToSharedNotes, setSaveToSharedNotes] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto configure reschedule when outcome changes
  const handleOutcomeChange = (newOutcome: FollowUpOutcome) => {
    setOutcome(newOutcome);
    if (newOutcome === "นัดติดตามอีกครั้ง" || newOutcome === "ลูกค้าขอรายละเอียดเพิ่มเติม" || newOutcome === "ลูกค้ารอพิจารณา" || newOutcome === "ติดต่อไม่ได้" || newOutcome === "ลูกค้าขอใบเสนอราคา") {
      setShouldReschedule(true);
      if (!nextDate) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + (newOutcome === "ติดต่อไม่ได้" ? 1 : 3));
        setNextDate(tomorrow.toISOString().split("T")[0]);
      }
    } else if (newOutcome === "ปิดการขาย" || newOutcome === "ปฏิเสธ" || newOutcome === "ลูกค้าไม่สนใจ") {
      setShouldReschedule(false);
    }
  };

  const handleQuickPresetDays = (days: number) => {
    const target = new Date();
    target.setDate(target.getDate() + days);
    setNextDate(target.toISOString().split("T")[0]);
    setShouldReschedule(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const nowIso = new Date().toISOString();
      const outcomeTextDisplay = outcome === "ติดต่อไม่ได้"
        ? `ติดต่อไม่ได้ (${noContactReason}${customOutcomeText ? `: ${customOutcomeText}` : ""})`
        : outcome === "อื่น ๆ" && customOutcomeText
          ? `อื่น ๆ: ${customOutcomeText}`
          : outcome;

      // 1. Build Timeline Entry
      const timelineItem: TimelineItem = {
        id: `id_${Math.random().toString(36).substring(2, 9)}`,
        title: `📝 บันทึกผลการติดตาม: ${outcomeTextDisplay}`,
        description: `ผู้บันทึก: ${author}${notes ? ` | รายละเอียด: "${notes}"` : ""}${
          shouldReschedule && nextDate ? ` | นัดครั้งถัดไป: ${nextDate} ${nextTime} น.` : ""
        }`,
        date: nowIso,
        type: "followup",
        author
      };

      // 2. Build Call Log Entry
      const isAnswered = outcome !== "ติดต่อไม่ได้";
      const callLogItem = {
        id: `id_${Math.random().toString(36).substring(2, 9)}`,
        date: nowIso,
        answered: isAnswered,
        interestLevel: outcome === "ปิดการขาย" ? 5 : outcome === "ลูกค้ารอพิจารณา" ? 4 : outcome === "ลูกค้าไม่สนใจ" || outcome === "ปฏิเสธ" ? 1 : 3,
        notes: `[ผลติดตาม: ${outcomeTextDisplay}] ${notes}`.trim(),
        nextFollowUpInDays: shouldReschedule && nextDate ? Math.max(0, Math.ceil((new Date(nextDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))) : undefined
      };

      // 3. Prepare Follow-up state
      let updatedFollowUp = { ...lead.followUp };
      if (shouldReschedule && nextDate) {
        updatedFollowUp = {
          date: nextDate,
          time: nextTime || "10:00",
          isCompleted: false,
          priority: nextPriority,
          topic: nextTopic,
          note: notes || `นัดติดตามต่อหลัง ${outcomeTextDisplay}`,
          lastOutcome: outcomeTextDisplay,
          lastOutcomeDetail: notes,
          lastOutcomeReason: outcome === "ติดต่อไม่ได้" ? noContactReason : undefined,
          updatedAt: nowIso,
          updatedBy: author
        };
      } else {
        updatedFollowUp = {
          ...lead.followUp,
          isCompleted: true,
          lastOutcome: outcomeTextDisplay,
          lastOutcomeDetail: notes,
          lastOutcomeReason: outcome === "ติดต่อไม่ได้" ? noContactReason : undefined,
          completedAt: nowIso,
          completedBy: author,
          updatedAt: nowIso,
          updatedBy: author
        };
      }

      // 4. Optionally Save to Shared Notes
      if (saveToSharedNotes && notes.trim()) {
        if (onAddNote) {
          await onAddNote(
            lead.id,
            `[ผลการติดตาม: ${outcomeTextDisplay}]\n${notes.trim()}${shouldReschedule && nextDate ? `\n(นัดหมายครั้งถัดไป: ${nextDate} ${nextTime} น.)` : ""}`,
            author,
            "ข้อมูลสำคัญของลูกค้า",
            nextPriority === "urgent" ? "urgent" : nextPriority === "important" ? "important" : "normal",
            false
          );
        }
      }

      // 5. Update Lead in Database
      const updatedLead: Lead = {
        ...lead,
        followUp: updatedFollowUp,
        timeline: [timelineItem, ...(lead.timeline || [])],
        calls: [...(lead.calls || []), callLogItem],
        updatedAt: nowIso
      };

      await onUpdateLead(updatedLead);
      onClose();
    } catch (err) {
      console.error("Failed to log follow-up outcome:", err);
      alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง");
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
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden my-6"
        id="followup-outcome-modal"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">บันทึกผลการติดตามลูกค้า</h3>
              <p className="text-xs text-slate-500">บันทึกความคืบหน้าการติดต่อ พร้อมตั้งนัดหมายครั้งถัดไป</p>
            </div>
          </div>
          <button
            type="button"
            id="close-followup-outcome-modal"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Client Context Banner */}
        <div className="px-5 py-3 bg-blue-50/50 border-b border-blue-100/60 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-slate-900 text-sm">{lead.shopName || "ไม่ระบุชื่อร้าน"}</span>
            {lead.contactName && (
              <span className="text-slate-600 font-medium">({lead.contactName})</span>
            )}
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusColorClass}`}>
              {StatusLabels[lead.status] || lead.status}
            </span>
          </div>
          {lead.phone && (
            <a 
              href={`tel:${lead.phone}`}
              className="inline-flex items-center gap-1 font-mono font-bold text-emerald-700 hover:text-emerald-800 bg-white px-2 py-0.5 rounded-md border border-emerald-200 shadow-2xs"
            >
              <PhoneCall className="w-3 h-3" /> {lead.phone}
            </a>
          )}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
          {/* Salesperson / Author */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">ผู้บันทึก / Sales</label>
              <select
                id="followup-outcome-author"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {salespersons.map((sp) => (
                  <option key={sp} value={sp}>{sp}</option>
                ))}
                {!salespersons.includes(author) && <option value={author}>{author}</option>}
              </select>
            </div>

            {/* Outcome preset selector */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                ผลการติดตาม <span className="text-rose-500">*</span>
              </label>
              <select
                id="followup-outcome-select"
                value={outcome}
                onChange={(e) => handleOutcomeChange(e.target.value as FollowUpOutcome)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                {FOLLOWUP_OUTCOMES.map((oc) => (
                  <option key={oc} value={oc}>{oc}</option>
                ))}
              </select>
            </div>
          </div>

          {/* If No Contact (ติดต่อไม่ได้) - Sub Reasons */}
          {outcome === "ติดต่อไม่ได้" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2"
            >
              <label className="block font-bold text-amber-900">เหตุผลที่ติดต่อไม่ได้</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {NO_CONTACT_REASONS.map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setNoContactReason(reason)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border text-left transition-all cursor-pointer ${
                      noContactReason === reason
                        ? "bg-amber-600 text-white border-amber-600 shadow-2xs font-bold"
                        : "bg-white border-amber-200 text-amber-800 hover:bg-amber-100/50"
                    }`}
                  >
                    {reason}
                  </button>
                ))}
              </div>
              {noContactReason === "อื่น ๆ" && (
                <input
                  type="text"
                  placeholder="ระบุเหตุผลเพิ่มเติม เช่น ตัดสายทิ้ง, โทรติดแต่ไม่พูด..."
                  value={customOutcomeText}
                  onChange={(e) => setCustomOutcomeText(e.target.value)}
                  className="w-full bg-white border border-amber-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              )}
            </motion.div>
          )}

          {/* If outcome is "อื่น ๆ" */}
          {outcome === "อื่น ๆ" && (
            <div>
              <label className="block font-bold text-slate-700 mb-1">ระบุผลการติดตาม</label>
              <input
                type="text"
                placeholder="ระบุผลการติดตามที่เกิดขึ้น..."
                value={customOutcomeText}
                onChange={(e) => setCustomOutcomeText(e.target.value)}
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {/* Details / Notes Textarea */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              สรุปรายละเอียดการพูดคุย / หมายเหตุ
            </label>
            <textarea
              id="followup-outcome-notes"
              rows={3}
              placeholder="บันทึกสาระสำคัญ เช่น ลูกค้าสนใจเปิดพอร์ต Flash 200 ชิ้น/วัน, ขอใบเสนอราคาพิเศษ, เอกสารยังขาดสำเนา..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Shared Notes Toggle */}
          <div className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200">
            <input
              type="checkbox"
              id="save-to-shared-notes-check"
              checked={saveToSharedNotes}
              onChange={(e) => setSaveToSharedNotes(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded cursor-pointer"
            />
            <label htmlFor="save-to-shared-notes-check" className="text-xs text-slate-700 font-semibold cursor-pointer select-none">
              บันทึกข้อมูลนี้ลง <span className="text-blue-700 font-bold">Shared Notes</span> ของลูกค้า (เพื่อให้ทุกคนในทีมเห็นบันทึกนี้)
            </label>
          </div>

          {/* Next Follow-up Plan Section */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800 text-xs">
                <input
                  type="checkbox"
                  id="should-reschedule-checkbox"
                  checked={shouldReschedule}
                  onChange={(e) => {
                    setShouldReschedule(e.target.checked);
                    if (e.target.checked && !nextDate) {
                      handleQuickPresetDays(1);
                    }
                  }}
                  className="w-4 h-4 text-amber-600 rounded cursor-pointer"
                />
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span>ตั้งเวลานัดติดตามครั้งถัดไป (Next Follow-up)</span>
                </span>
              </label>
            </div>

            {shouldReschedule && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="bg-amber-50/50 p-3.5 rounded-xl border border-amber-200/80 space-y-3"
              >
                {/* Presets */}
                <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                  <span className="text-amber-800 font-semibold mr-1">นัดด่วน:</span>
                  <button
                    type="button"
                    onClick={() => handleQuickPresetDays(1)}
                    className="px-2 py-1 bg-white hover:bg-amber-100 text-amber-900 border border-amber-200 rounded font-semibold transition-colors cursor-pointer"
                  >
                    พรุ่งนี้ (+1 วัน)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickPresetDays(3)}
                    className="px-2 py-1 bg-white hover:bg-amber-100 text-amber-900 border border-amber-200 rounded font-semibold transition-colors cursor-pointer"
                  >
                    3 วันถัดไป
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickPresetDays(7)}
                    className="px-2 py-1 bg-white hover:bg-amber-100 text-amber-900 border border-amber-200 rounded font-semibold transition-colors cursor-pointer"
                  >
                    1 สัปดาห์ (+7 วัน)
                  </button>
                </div>

                {/* Date, Time, Priority */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-slate-600 text-[11px] font-bold mb-1">วันที่ต้องการโทร</label>
                    <input
                      type="date"
                      required={shouldReschedule}
                      value={nextDate}
                      onChange={(e) => setNextDate(e.target.value)}
                      min={new Date().toISOString().split("T")[0]}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 text-[11px] font-bold mb-1">เวลานัดหมาย</label>
                    <input
                      type="time"
                      value={nextTime}
                      onChange={(e) => setNextTime(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 text-[11px] font-bold mb-1">ความสำคัญ (Priority)</label>
                    <select
                      value={nextPriority}
                      onChange={(e) => setNextPriority(e.target.value as FollowUpPriority)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="urgent">🔥 เร่งด่วน</option>
                      <option value="important">🟠 สำคัญ</option>
                      <option value="normal">⚪ ปกติ</option>
                    </select>
                  </div>
                </div>

                {/* Topic presets */}
                <div>
                  <label className="block text-slate-600 text-[11px] font-bold mb-1">เรื่องที่ต้องติดตาม</label>
                  <div className="flex flex-wrap gap-1 mb-1">
                    {["โทรสรุปเรทราคา", "ติดตามเอกสารยื่นสมัคร", "นัดสอนระบบ", "เสนอโปรโมชั่น", "สอบถามความพึงพอใจ"].map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setNextTopic(t)}
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-all cursor-pointer ${
                          nextTopic === t
                            ? "bg-amber-600 text-white border-amber-600"
                            : "bg-white border-amber-200 text-slate-700 hover:bg-amber-50"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={nextTopic}
                    onChange={(e) => setNextTopic(e.target.value)}
                    placeholder="หรือระบุหัวข้ออื่น ๆ..."
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </motion.div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors cursor-pointer text-xs"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              id="submit-followup-outcome-btn"
              disabled={isSubmitting}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all cursor-pointer text-xs flex items-center gap-2 shadow-xs disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? "กำลังบันทึก..." : "💾 บันทึกผลการติดตาม"}</span>
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
