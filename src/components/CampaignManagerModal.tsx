import React, { useState } from "react";
import { Megaphone, Plus, Trash2, X, Check, Users, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Lead } from "../types";

interface CampaignManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaigns: string[];
  onAddCampaign: (name: string) => Promise<void>;
  onDeleteCampaign: (name: string) => Promise<void>;
  onSelectCampaign?: (name: string) => void;
  leads?: Lead[];
}

export default function CampaignManagerModal({
  isOpen,
  onClose,
  campaigns = [],
  onAddCampaign,
  onDeleteCampaign,
  onSelectCampaign,
  leads = []
}: CampaignManagerModalProps) {
  const [newCampaignName, setNewCampaignName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [deletingCampaign, setDeletingCampaign] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCampaignName.trim();
    if (!trimmed) {
      setErrorMsg("กรุณากรอกชื่อแคมเปญ");
      return;
    }
    if (campaigns.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
      setErrorMsg("มีแคมเปญชื่อนี้ในระบบแล้ว");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg("");
      await onAddCampaign(trimmed);
      if (onSelectCampaign) {
        onSelectCampaign(trimmed);
      }
      setNewCampaignName("");
    } catch (err) {
      console.error("Error adding campaign:", err);
      setErrorMsg("เกิดข้อผิดพลาดในการบันทึกแคมเปญ");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (campaignName: string) => {
    try {
      setDeletingCampaign(campaignName);
      await onDeleteCampaign(campaignName);
    } catch (err) {
      console.error("Error deleting campaign:", err);
    } finally {
      setDeletingCampaign(null);
    }
  };

  // Calculate leads count per campaign
  const getLeadCountForCampaign = (name: string) => {
    return leads.filter(l => l.campaign === name).length;
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-5"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
              <Megaphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">จัดการแคมเปญการตลาด (+ / -)</h3>
              <p className="text-xs text-slate-500">เพิ่มหรือลบชื่อแคมเปญสำหรับเลือกบันทึกที่มาของลูกค้า</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Add Campaign Form */}
        <form onSubmit={handleAdd} className="space-y-2">
          <label className="text-xs font-bold text-slate-700 block">
            ➕ เพิ่มแคมเปญใหม่
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={newCampaignName}
              onChange={(e) => {
                setNewCampaignName(e.target.value);
                if (errorMsg) setErrorMsg("");
              }}
              placeholder="เช่น แคมเปญ 8.8 Sales Shock, TikTok Ads..."
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
            />
            <button
              type="submit"
              disabled={isSubmitting || !newCampaignName.trim()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>{isSubmitting ? "กำลังเพิ่ม..." : "เพิ่มแคมเปญ"}</span>
            </button>
          </div>

          {errorMsg && (
            <p className="text-[11px] text-rose-600 font-semibold flex items-center gap-1 mt-1">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{errorMsg}</span>
            </p>
          )}
        </form>

        {/* Campaign List */}
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between text-xs font-bold text-slate-600">
            <span>รายการแคมเปญทั้งหมด ({campaigns.length})</span>
            <span className="text-[11px] font-normal text-slate-400">คลิกที่ถังขยะเพื่อลบออก</span>
          </div>

          {campaigns.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-xl text-xs text-slate-400">
              ยังไม่มีรายการแคมเปญในระบบ เพิ่มแคมเปญแรกได้จากช่องด้านบน
            </div>
          ) : (
            <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
              {campaigns.map((camp) => {
                const count = getLeadCountForCampaign(camp);
                const isDeleting = deletingCampaign === camp;

                return (
                  <div
                    key={camp}
                    className="flex items-center justify-between p-2.5 bg-slate-50 hover:bg-indigo-50/40 border border-slate-200/80 rounded-xl transition-all group"
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <Megaphone className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      <span className="text-xs font-bold text-slate-800 truncate">{camp}</span>
                      {count > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded-full shrink-0">
                          <Users className="w-2.5 h-2.5" /> {count} ลูกค้า
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      disabled={isDeleting}
                      onClick={() => handleDelete(camp)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer shrink-0 opacity-80 group-hover:opacity-100"
                      title={`ลบแคมเปญ "${camp}"`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs transition-all cursor-pointer"
          >
            เสร็จสิ้น / ปิดหน้าต่าง
          </button>
        </div>
      </motion.div>
    </div>
  );
}
