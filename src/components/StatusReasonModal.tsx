import React, { useState, useEffect } from "react";
import { Lead, LeadStatus, StatusLabels, REJECTION_REASONS, WON_REASONS, RejectionReason, WonReason } from "../types";
import { CheckCircle2, XCircle, X, AlertCircle, Sparkles, Building, User, Phone, Check } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface StatusReasonModalProps {
  isOpen: boolean;
  lead: Lead | null;
  targetStatus: LeadStatus | null;
  onClose: () => void;
  onConfirm: (reasonData: {
    status: LeadStatus;
    reason: string;
    reasonOther?: string;
  }) => void;
}

export default function StatusReasonModal({
  isOpen,
  lead,
  targetStatus,
  onClose,
  onConfirm
}: StatusReasonModalProps) {
  const [selectedReason, setSelectedReason] = useState<string>("");
  const [otherText, setOtherText] = useState<string>("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const isWon = targetStatus === LeadStatus.REGISTERED || targetStatus === LeadStatus.ACTIVATED || targetStatus === LeadStatus.REGULAR;
  const isRejected = targetStatus === LeadStatus.NOT_INTERESTED || targetStatus === LeadStatus.LOST;

  const reasonList = isWon ? WON_REASONS : REJECTION_REASONS;

  // Pre-fill initial values if lead already had reasons or reset on open
  useEffect(() => {
    if (isOpen && lead) {
      setValidationError(null);
      if (isWon) {
        setSelectedReason(lead.wonReason || WON_REASONS[0]);
        setOtherText(lead.wonReasonOther || "");
      } else if (isRejected) {
        setSelectedReason(lead.lostReason || REJECTION_REASONS[0]);
        setOtherText(lead.lostReasonOther || "");
      } else {
        setSelectedReason("");
        setOtherText("");
      }
    }
  }, [isOpen, lead, targetStatus, isWon, isRejected]);

  if (!isOpen || !lead || !targetStatus) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReason) {
      setValidationError("กรุณาเลือกสาเหตุจากรายการ");
      return;
    }

    if (selectedReason === "อื่น ๆ" && !otherText.trim()) {
      setValidationError("กรุณาระบุรายละเอียดเพิ่มเติมสำหรับตัวเลือก 'อื่น ๆ'");
      return;
    }

    setValidationError(null);
    onConfirm({
      status: targetStatus,
      reason: selectedReason,
      reasonOther: selectedReason === "อื่น ๆ" ? otherText.trim() : undefined
    });
  };

  return (
    <AnimatePresence>
      <div 
        id="status-reason-modal-backdrop" 
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <motion.div
          id="status-reason-modal-dialog"
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Banner with target status theme */}
          <div className={`px-5 py-4 border-b flex items-start justify-between ${
            isWon 
              ? "bg-emerald-50/80 border-emerald-100 text-emerald-950" 
              : "bg-slate-50 border-slate-200 text-slate-900"
          }`}>
            <div className="flex items-center gap-2.5">
              <div className={`p-2 rounded-xl shrink-0 ${
                isWon ? "bg-emerald-500 text-white shadow-xs" : "bg-rose-500 text-white shadow-xs"
              }`}>
                {isWon ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="text-sm font-bold leading-tight">
                  {isWon ? "บันทึกสาเหตุที่ปิดการขาย" : "บันทึกสาเหตุที่ปฏิเสธ"}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  เปลี่ยนสถานะเป็น: <span className="font-bold text-slate-700">{StatusLabels[targetStatus]}</span>
                </p>
              </div>
            </div>

            <button
              id="close-status-reason-modal-btn"
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-white/60 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
            {/* Customer Summary Box */}
            <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-3 space-y-1.5 text-slate-600">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-slate-400">ร้านค้า / ลูกค้า:</span>
                <span className="font-bold text-slate-900 text-xs truncate max-w-[200px]">{lead.shopName}</span>
              </div>
              {lead.contactName && (
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-slate-400">ผู้ติดต่อ:</span>
                  <span className="font-medium text-slate-700 text-xs">{lead.contactName}</span>
                </div>
              )}
              {lead.salesPerson && (
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-slate-400">เซลส์ผู้ดูแล:</span>
                  <span className="font-medium text-blue-700 text-xs">{lead.salesPerson}</span>
                </div>
              )}
            </div>

            {/* Dropdown Section */}
            <div className="space-y-1.5">
              <label 
                htmlFor="status-reason-select" 
                className="block font-bold text-slate-700 text-xs flex items-center justify-between"
              >
                <span>{isWon ? "สาเหตุที่ปิดการขาย" : "สาเหตุที่ปฏิเสธ"} <span className="text-rose-500">*</span></span>
                <span className="text-[10px] text-slate-400 font-normal">เลือก 1 ข้อ</span>
              </label>

              <select
                id="status-reason-select"
                value={selectedReason}
                onChange={(e) => {
                  setSelectedReason(e.target.value);
                  setValidationError(null);
                }}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-2xs cursor-pointer"
                autoFocus
              >
                {reasonList.map((reason, idx) => (
                  <option key={reason} value={reason}>
                    {idx + 1}. {reason}
                  </option>
                ))}
              </select>
            </div>

            {/* If "อื่น ๆ" selected, show required textarea / text input */}
            {selectedReason === "อื่น ๆ" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-1.5"
              >
                <label 
                  htmlFor="status-reason-other-input" 
                  className="block font-bold text-slate-700 text-xs"
                >
                  ระบุรายละเอียดเพิ่มเติม <span className="text-rose-500">* (จำเป็นต้องกรอก)</span>
                </label>
                <textarea
                  id="status-reason-other-input"
                  rows={3}
                  value={otherText}
                  onChange={(e) => {
                    setOtherText(e.target.value);
                    setValidationError(null);
                  }}
                  placeholder="พิมพ์รายละเอียดเพิ่มเติมเกี่ยวกับสาเหตุ..."
                  className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-2xs"
                />
              </motion.div>
            )}

            {/* Validation Error Message */}
            {validationError && (
              <div 
                id="status-reason-validation-error" 
                className="flex items-center gap-1.5 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold"
              >
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{validationError}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                id="cancel-status-reason-btn"
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
              >
                ยกเลิก
              </button>

              <button
                id="submit-status-reason-btn"
                type="submit"
                className={`px-4 py-2 rounded-xl text-xs font-bold text-white transition-all shadow-xs flex items-center gap-1.5 cursor-pointer ${
                  isWon
                    ? "bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800"
                    : "bg-slate-900 hover:bg-slate-800 active:bg-slate-950"
                }`}
              >
                <Check className="w-3.5 h-3.5" />
                <span>บันทึกสถานะ</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
