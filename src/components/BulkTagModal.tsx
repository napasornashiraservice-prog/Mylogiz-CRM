import React, { useState } from "react";
import { PRESET_TAG_CATEGORIES, Lead, TagCategory } from "../types";
import { getTagInfo, canManageTags } from "../utils/crmHelpers";
import { X, Check, Tag as TagIcon, Plus, Trash2, Layers, AlertCircle, Lock } from "lucide-react";
import { motion } from "motion/react";

interface BulkTagModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedLeadIds: string[];
  leads: Lead[];
  currentUser?: string | null;
  salespersons?: string[];
  onApplyTags: (tagsToAdd: string[], tagsToRemove: string[]) => Promise<void>;
}

export default function BulkTagModal({
  isOpen,
  onClose,
  selectedLeadIds,
  leads,
  currentUser,
  salespersons,
  onApplyTags
}: BulkTagModalProps) {
  const [activeMode, setActiveMode] = useState<"add" | "remove">("add");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customTagInput, setCustomTagInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const isTagAdmin = canManageTags(currentUser, salespersons);
  const affectedLeads = leads.filter(l => selectedLeadIds.includes(l.id));

  // Find all existing tags among the selected leads for remove mode
  const existingSelectedTags = Array.from(
    new Set(affectedLeads.flatMap(l => l.tags || []))
  ).filter(Boolean);

  const toggleTag = (tag: string) => {
    if (!isTagAdmin) return;
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleAddCustomTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isTagAdmin) return;
    const trimmed = customTagInput.trim();
    if (trimmed && !selectedTags.includes(trimmed)) {
      setSelectedTags([...selectedTags, trimmed]);
      setCustomTagInput("");
    }
  };

  const handleSubmit = async () => {
    if (!isTagAdmin || selectedTags.length === 0) return;
    setIsSubmitting(true);
    try {
      if (activeMode === "add") {
        await onApplyTags(selectedTags, []);
      } else {
        await onApplyTags([], selectedTags);
      }
      onClose();
    } catch (err) {
      console.error("Bulk tag failed", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-4 px-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
              <TagIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                จัดการ Tags พร้อมกัน (Bulk Tag Management)
              </h3>
              <p className="text-xs text-slate-500">
                ปรับปรุงป้ายกำกับสำหรับ <strong className="text-blue-600 font-bold">{selectedLeadIds.length} รายการ</strong> ที่เลือกไว้
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector */}
        {isTagAdmin ? (
          <div className="p-4 px-6 border-b border-slate-100 bg-white flex gap-3 text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                setActiveMode("add");
                setSelectedTags([]);
              }}
              className={`flex-1 py-2.5 px-4 rounded-xl border flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeMode === "add"
                  ? "bg-blue-50 border-blue-300 text-blue-700 shadow-xs"
                  : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Plus className="w-4 h-4 text-blue-600" />
              <span>เพิ่ม Tags ให้ Lead ที่เลือก (+ Add Tags)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveMode("remove");
                setSelectedTags([]);
              }}
              className={`flex-1 py-2.5 px-4 rounded-xl border flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeMode === "remove"
                  ? "bg-rose-50 border-rose-300 text-rose-700 shadow-xs"
                  : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Trash2 className="w-4 h-4 text-rose-600" />
              <span>ลบ Tags ออกจาก Lead ที่เลือก (- Remove Tags)</span>
            </button>
          </div>
        ) : (
          <div className="p-4 px-6 bg-amber-50 border-b border-amber-200 flex items-center gap-2.5 text-amber-900 text-xs font-medium">
            <Lock className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              สิทธิ์การเข้าถึง: ฟังก์ชันจัดการ Tags พร้อมกัน (Bulk Actions) สงวนสิทธิ์เฉพาะบัญชี <strong>Phere</strong> (ผู้จัดการ) เท่านั้น
            </span>
          </div>
        )}

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs flex-1">
          {!isTagAdmin ? (
            <div className="p-8 text-center space-y-3 bg-slate-50 rounded-2xl border border-slate-200">
              <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
                <Lock className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-800">ไม่มีสิทธิ์แก้ไข Tags</h4>
              <p className="text-slate-500 max-w-sm mx-auto text-xs">
                เฉพาะบัญชี <strong>Phere</strong> เท่านั้นที่สามารถเพิ่มหรือลบ Tags ของ Lead หลายรายการพร้อมกันได้ กรุณาติดต่อ Phere หากต้องการปรับปรุงป้ายกำกับ
              </p>
            </div>
          ) : activeMode === "add" ? (
            <>
              {/* Custom Tag Input */}
              <div>
                <label className="text-slate-600 font-bold block mb-1.5">
                  พิมพ์ชื่อ Tag เอง (หรือเลือกจากหมวดหมู่ด้านล่าง)
                </label>
                <form onSubmit={handleAddCustomTag} className="flex gap-2">
                  <input
                    type="text"
                    value={customTagInput}
                    onChange={(e) => setCustomTagInput(e.target.value)}
                    placeholder="เช่น สนใจ COD, ร้านค้า TikTok, VIP..."
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-800"
                  />
                  <button
                    type="submit"
                    disabled={!customTagInput.trim()}
                    className="px-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    + เพิ่ม
                  </button>
                </form>
              </div>

              {/* Selected Tags Preview */}
              {selectedTags.length > 0 && (
                <div className="bg-blue-50/60 p-3.5 rounded-xl border border-blue-200/80 space-y-2">
                  <span className="text-[11px] font-bold text-blue-900 block">
                    Tags ที่เลือกเพื่อเพิ่มให้ {selectedLeadIds.length} รายการ ({selectedTags.length} ป้าย):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedTags.map(tag => {
                      const tagInfo = getTagInfo(tag);
                      return (
                        <span
                          key={tag}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-bold text-xs ${tagInfo.badgeClass}`}
                        >
                          <span>{tag}</span>
                          <button
                            type="button"
                            onClick={() => toggleTag(tag)}
                            className="hover:opacity-75 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Preset Tag Groups */}
              <div className="space-y-4">
                <span className="text-slate-500 font-bold block uppercase tracking-wider text-[11px]">
                  เลือกจากหมวดหมู่มาตรฐาน:
                </span>

                {PRESET_TAG_CATEGORIES.map(category => (
                  <div key={category.name} className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-slate-700 font-semibold text-[11px]">
                      <span className="w-2 h-2 rounded-full" style={{
                        backgroundColor: category.colorName === "blue" ? "#3b82f6" :
                          category.colorName === "purple" ? "#a855f7" :
                          category.colorName === "green" ? "#10b981" :
                          category.colorName === "orange" ? "#f59e0b" : "#ef4444"
                      }} />
                      <span>{category.name}</span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {category.tags.map(tag => {
                        const isSelected = selectedTags.includes(tag);
                        const tagInfo = getTagInfo(tag);
                        return (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => toggleTag(tag)}
                            className={`px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                              isSelected
                                ? "bg-slate-900 border-slate-900 text-white shadow-xs"
                                : tagInfo.badgeClass
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3 text-emerald-400" />}
                            <span>{tag}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              {/* Remove Mode */}
              <div className="space-y-3">
                <p className="text-slate-600">
                  เลือก Tags ที่ต้องการลบออกจากทั้ง <strong className="text-slate-900 font-bold">{selectedLeadIds.length} รายการ</strong>:
                </p>

                {existingSelectedTags.length > 0 ? (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {existingSelectedTags.map(tag => {
                      const isSelected = selectedTags.includes(tag);
                      const tagInfo = getTagInfo(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => toggleTag(tag)}
                          className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                            isSelected
                              ? "bg-rose-600 border-rose-600 text-white shadow-xs"
                              : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                          }`}
                        >
                          {isSelected ? <Trash2 className="w-3.5 h-3.5" /> : <TagIcon className="w-3.5 h-3.5 text-slate-400" />}
                          <span>{tag}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-slate-400">
                    ไม่มี Tags ในกลุ่ม Leads ที่เลือกไว้
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 px-6 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            {selectedTags.length > 0 ? `เลือก ${selectedTags.length} Tags แล้ว` : "ยังไม่ได้เลือก Tag"}
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 transition-colors cursor-pointer"
            >
              ยกเลิก
            </button>

            <button
              type="button"
              disabled={selectedTags.length === 0 || isSubmitting}
              onClick={handleSubmit}
              className={`px-5 py-2 rounded-xl text-xs font-bold text-white transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                activeMode === "add" ? "bg-blue-600 hover:bg-blue-500" : "bg-rose-600 hover:bg-rose-500"
              }`}
            >
              <Check className="w-4 h-4" />
              <span>
                {isSubmitting
                  ? "กำลังบันทึก..."
                  : activeMode === "add"
                  ? `บันทึกเพิ่ม Tags (${selectedLeadIds.length} รายการ)`
                  : `ลบ Tags ที่เลือก (${selectedLeadIds.length} รายการ)`}
              </span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
