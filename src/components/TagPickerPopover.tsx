import React, { useState, useRef, useEffect } from "react";
import { PRESET_TAG_CATEGORIES } from "../types";
import { renderTagIcon } from "./TagPill";
import { getTagInfo } from "../utils/crmHelpers";
import { Plus, Search, X, Check, Tag as TagIcon } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface TagPickerPopoverProps {
  currentTags?: string[];
  leadTags?: string[];
  onToggleTag: (tag: string) => void;
  onAddCustomTag?: (tag: string) => void;
  allKnownTags?: string[];
  disabled?: boolean;
  buttonLabel?: string;
  buttonClassName?: string;
  id?: string;
}

export default function TagPickerPopover({
  currentTags,
  leadTags,
  onToggleTag,
  onAddCustomTag,
  allKnownTags = [],
  disabled = false,
  buttonLabel = "+ เพิ่ม Tag",
  buttonClassName = "",
  id = "tag-picker-btn"
}: TagPickerPopoverProps) {
  const effectiveTags = currentTags || leadTags || [];
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [customTagInput, setCustomTagInput] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleCreateCustom = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = customTagInput.trim();
    if (!clean) return;
    if (onAddCustomTag) {
      onAddCustomTag(clean);
    } else {
      onToggleTag(clean);
    }
    setCustomTagInput("");
  };

  const query = searchQuery.trim().toLowerCase();

  // Preset categories filtered by search query
  const filteredCategories = PRESET_TAG_CATEGORIES.map(category => ({
    ...category,
    tags: category.tags.filter(t => !query || t.toLowerCase().includes(query))
  })).filter(c => c.tags.length > 0);

  // Legacy/other system tags
  const presetSet = new Set(PRESET_TAG_CATEGORIES.flatMap(c => c.tags.map(t => t.toLowerCase())));
  const otherTags = allKnownTags.filter(
    t => t && !presetSet.has(t.toLowerCase()) && (!query || t.toLowerCase().includes(query))
  );

  const totalMatching = filteredCategories.reduce((acc, c) => acc + c.tags.length, 0) + otherTags.length;

  return (
    <div className="relative inline-block" ref={containerRef}>
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={buttonClassName || "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition-all cursor-pointer select-none disabled:opacity-50 disabled:cursor-not-allowed"}
      >
        <Plus className="w-3 h-3 text-blue-600" />
        <span>{buttonLabel}</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 4 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 top-full mt-1.5 w-[320px] sm:w-[350px] bg-white rounded-2xl shadow-xl border border-slate-200 z-50 overflow-hidden flex flex-col max-h-[460px]"
          >
            {/* Header & Search */}
            <div className="p-3 border-b border-slate-100 bg-slate-50/80 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  <TagIcon className="w-3.5 h-3.5 text-blue-600" />
                  <span>เลือกป้ายกำกับ (Tags)</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-md cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="🔍 ค้นหา Tags เช่น VIP, ร้านค้า..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-7 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 placeholder-slate-400"
                  autoFocus
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Tags List */}
            <div className="p-3 overflow-y-auto space-y-3 text-xs flex-1 divide-y divide-slate-100">
              {totalMatching === 0 ? (
                <div className="py-6 text-center text-slate-400 space-y-1">
                  <p className="text-xs font-medium">ไม่พบ Tags ที่ค้นหา</p>
                  <p className="text-[11px] text-slate-400">สามารถพิมพ์ด้านล่างเพื่อเพิ่มเป็น Tag ใหม่ได้</p>
                </div>
              ) : (
                <>
                  {filteredCategories.map((cat, idx) => (
                    <div key={cat.name} className={idx > 0 ? "pt-2.5 space-y-1.5" : "space-y-1.5"}>
                      <span className="text-[11px] font-bold text-slate-700 block">
                        {cat.name}
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {cat.tags.map(tagName => {
                          const isAttached = effectiveTags.includes(tagName);
                          const tagInfo = getTagInfo(tagName);

                          return (
                            <button
                              key={tagName}
                              type="button"
                              onClick={() => onToggleTag(tagName)}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all cursor-pointer select-none ${
                                isAttached
                                  ? "bg-slate-900 border-slate-900 text-white shadow-2xs"
                                  : `${tagInfo.badgeClass} hover:border-slate-300`
                              }`}
                            >
                              {isAttached ? (
                                <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                              ) : (
                                renderTagIcon(tagInfo.iconName, "w-3 h-3 shrink-0 opacity-80")
                              )}
                              <span>{tagName}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  {otherTags.length > 0 && (
                    <div className="pt-2.5 space-y-1.5">
                      <span className="text-[11px] font-bold text-slate-500 block">
                        Tags อื่นๆ ในระบบ
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {otherTags.map(tagName => {
                          const isAttached = effectiveTags.includes(tagName);
                          const tagInfo = getTagInfo(tagName);

                          return (
                            <button
                              key={tagName}
                              type="button"
                              onClick={() => onToggleTag(tagName)}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all cursor-pointer select-none ${
                                isAttached
                                  ? "bg-slate-900 border-slate-900 text-white shadow-2xs"
                                  : `${tagInfo.badgeClass} hover:border-slate-300`
                              }`}
                            >
                              {isAttached ? (
                                <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                              ) : (
                                renderTagIcon(tagInfo.iconName, "w-3 h-3 shrink-0 opacity-80")
                              )}
                              <span>{tagName}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Custom Tag Input & Done Button */}
            <div className="p-2.5 px-3 bg-slate-50 border-t border-slate-100 space-y-2">
              <form onSubmit={handleCreateCustom} className="flex gap-1.5">
                <input
                  type="text"
                  placeholder="พิมพ์ Tag ใหม่เอง..."
                  value={customTagInput}
                  onChange={(e) => setCustomTagInput(e.target.value)}
                  className="flex-1 px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 placeholder-slate-400"
                />
                <button
                  type="submit"
                  disabled={!customTagInput.trim()}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  + เพิ่ม
                </button>
              </form>

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="w-full py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-colors shadow-2xs cursor-pointer text-center"
                >
                  เสร็จสิ้น
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
