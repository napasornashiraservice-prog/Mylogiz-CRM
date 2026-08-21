import React, { useState, useRef, useEffect } from "react";
import { PRESET_TAG_CATEGORIES } from "../types";
import TagPill, { renderTagIcon } from "./TagPill";
import { getTagInfo } from "../utils/crmHelpers";
import { Tag as TagIcon, Search, X, Check, ChevronDown, SlidersHorizontal } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface TagFilterDropdownProps {
  selectedTags: string[];
  onChangeTags: (tags: string[]) => void;
  tagMatchMode: "ANY" | "ALL";
  onChangeMatchMode: (mode: "ANY" | "ALL") => void;
  allKnownTags?: string[];
}

export default function TagFilterDropdown({
  selectedTags,
  onChangeTags,
  tagMatchMode,
  onChangeMatchMode,
  allKnownTags = []
}: TagFilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showRemainingPopover, setShowRemainingPopover] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const remainingRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
      if (remainingRef.current && !remainingRef.current.contains(event.target as Node)) {
        setShowRemainingPopover(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onChangeTags(selectedTags.filter(t => t !== tag));
    } else {
      onChangeTags([...selectedTags, tag]);
    }
  };

  const handleClearAll = () => {
    onChangeTags([]);
  };

  // Find any legacy tags in the system that aren't in PRESET_TAG_CATEGORIES
  const presetTagSet = new Set(PRESET_TAG_CATEGORIES.flatMap(c => c.tags.map(t => t.toLowerCase())));
  const otherSystemTags = allKnownTags.filter(
    t => t && !presetTagSet.has(t.toLowerCase())
  );

  // Filter sections by search query
  const query = searchQuery.trim().toLowerCase();

  const filteredPresetCategories = PRESET_TAG_CATEGORIES.map(category => {
    const matchingTags = category.tags.filter(tag => 
      !query || tag.toLowerCase().includes(query)
    );
    return {
      ...category,
      tags: matchingTags
    };
  }).filter(category => category.tags.length > 0);

  const filteredOtherTags = otherSystemTags.filter(tag =>
    !query || tag.toLowerCase().includes(query)
  );

  const totalMatchingTags = filteredPresetCategories.reduce((acc, cat) => acc + cat.tags.length, 0) + filteredOtherTags.length;

  return (
    <div className="flex flex-wrap items-center gap-2" ref={containerRef}>
      {/* Filter Trigger Button */}
      <div className="relative">
        <button
          id="tag-filter-trigger-btn"
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer select-none ${
            selectedTags.length > 0
              ? "bg-blue-50 border-blue-300 text-blue-700 shadow-2xs"
              : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700"
          }`}
          aria-expanded={isOpen}
        >
          <TagIcon className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span>
            {selectedTags.length > 0 ? `🏷️ Tags (${selectedTags.length})` : "🏷️ กรองตาม Tags"}
          </span>
          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 text-slate-400 ${isOpen ? "rotate-180" : ""}`} />
        </button>

        {/* Dropdown / Popover */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              id="tag-filter-popover"
              initial={{ opacity: 0, y: 6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="absolute left-0 top-full mt-1.5 w-[330px] sm:w-[370px] bg-white rounded-2xl shadow-xl border border-slate-200 z-50 overflow-hidden flex flex-col max-h-[480px]"
            >
              {/* Header & Search */}
              <div className="p-3 border-b border-slate-100 bg-slate-50/70 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                    <TagIcon className="w-3.5 h-3.5 text-blue-600" />
                    <span>กรองตามป้ายกำกับ (Tags)</span>
                  </div>
                  {selectedTags.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearAll}
                      className="text-[11px] text-rose-600 hover:text-rose-700 font-semibold cursor-pointer transition-colors"
                    >
                      ล้างทั้งหมด
                    </button>
                  )}
                </div>

                {/* Search Box */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    id="tag-filter-search-input"
                    type="text"
                    placeholder="🔍 ค้นหา Tags เช่น VIP, ร้านค้า, สัญญา..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-7 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 placeholder-slate-400 font-medium"
                    autoFocus
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Tag Categories Content */}
              <div className="p-3 overflow-y-auto space-y-3.5 text-xs flex-1 divide-y divide-slate-100">
                {totalMatchingTags === 0 ? (
                  <div className="py-8 text-center text-slate-400 space-y-1">
                    <p className="text-xs font-medium">ไม่พบ Tags ที่ค้นหา</p>
                    <p className="text-[11px] text-slate-400">ลองค้นหาด้วยคำอื่น เช่น VIP, ร้านค้า, หรือ ด่วน</p>
                  </div>
                ) : (
                  <>
                    {filteredPresetCategories.map((category, catIdx) => (
                      <div key={category.name} className={catIdx > 0 ? "pt-3 space-y-2" : "space-y-2"}>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-700 tracking-wide">
                            {category.name}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {category.tags.length} รายการ
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                          {category.tags.map(tag => {
                            const isSelected = selectedTags.includes(tag);
                            const tagInfo = getTagInfo(tag);

                            return (
                              <button
                                key={tag}
                                id={`tag-filter-option-${tag.replace(/\s+/g, "-")}`}
                                type="button"
                                onClick={() => toggleTag(tag)}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all cursor-pointer select-none ${
                                  isSelected
                                    ? "bg-slate-900 border-slate-900 text-white shadow-xs"
                                    : `${tagInfo.badgeClass} hover:border-slate-300`
                                }`}
                              >
                                {isSelected ? (
                                  <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                                ) : (
                                  renderTagIcon(tagInfo.iconName, "w-3 h-3 shrink-0 opacity-80")
                                )}
                                <span>{tag}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}

                    {/* Legacy / Other system tags (if any) */}
                    {filteredOtherTags.length > 0 && (
                      <div className="pt-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-500 tracking-wide">
                            Tags อื่นๆ ในระบบ
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {filteredOtherTags.length} รายการ
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                          {filteredOtherTags.map(tag => {
                            const isSelected = selectedTags.includes(tag);
                            const tagInfo = getTagInfo(tag);

                            return (
                              <button
                                key={tag}
                                id={`tag-filter-option-other-${tag.replace(/\s+/g, "-")}`}
                                type="button"
                                onClick={() => toggleTag(tag)}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all cursor-pointer select-none ${
                                  isSelected
                                    ? "bg-slate-900 border-slate-900 text-white shadow-xs"
                                    : `${tagInfo.badgeClass} hover:border-slate-300`
                                }`}
                              >
                                {isSelected ? (
                                  <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                                ) : (
                                  renderTagIcon(tagInfo.iconName, "w-3 h-3 shrink-0 opacity-80")
                                )}
                                <span>{tag}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Footer */}
              <div className="p-2.5 px-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-500 font-medium">
                  {selectedTags.length > 0 ? (
                    <span>เลือกแล้ว <strong className="text-blue-600 font-bold">{selectedTags.length}</strong> Tags</span>
                  ) : (
                    <span>ยังไม่ได้เลือก Tag</span>
                  )}
                </span>

                <div className="flex items-center gap-1.5">
                  {selectedTags.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearAll}
                      className="px-2.5 py-1 rounded-lg text-slate-600 hover:bg-slate-200 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      ล้างทั้งหมด
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="px-3.5 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-colors shadow-2xs cursor-pointer"
                  >
                    นำไปใช้
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Selected Tags Pill Strip (Compact Label Display) */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Display up to 3 selected tags */}
          {selectedTags.slice(0, 3).map(tag => (
            <TagPill
              key={tag}
              tag={tag}
              size="sm"
              onRemove={() => toggleTag(tag)}
            />
          ))}

          {/* If more than 3 tags, show compact +N pill with popover */}
          {selectedTags.length > 3 && (
            <div className="relative" ref={remainingRef}>
              <button
                id="tag-filter-more-btn"
                type="button"
                onClick={() => setShowRemainingPopover(!showRemainingPopover)}
                className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition-colors cursor-pointer shadow-2xs"
                title="ดู Tags ที่เลือกทั้งหมด"
              >
                +{selectedTags.length - 3}
              </button>

              <AnimatePresence>
                {showRemainingPopover && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 4 }}
                    className="absolute left-0 top-full mt-1 w-64 bg-white rounded-xl shadow-lg border border-slate-200 p-2.5 z-50 space-y-2"
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                      <span className="text-[11px] font-bold text-slate-700">Tags ทั้งหมดที่เลือก ({selectedTags.length})</span>
                      <button
                        type="button"
                        onClick={() => setShowRemainingPopover(false)}
                        className="text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-1 max-h-48 overflow-y-auto">
                      {selectedTags.map(tag => (
                        <TagPill
                          key={tag}
                          tag={tag}
                          size="xs"
                          onRemove={() => toggleTag(tag)}
                        />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Match Mode Toggle: ANY vs ALL */}
          <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-lg text-[10px] font-bold ml-1 border border-slate-200">
            <button
              type="button"
              onClick={() => onChangeMatchMode("ANY")}
              className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                tagMatchMode === "ANY"
                  ? "bg-white text-blue-700 shadow-2xs font-bold"
                  : "text-slate-500 hover:text-slate-800"
              }`}
              title="ลูกค้าที่มีอย่างน้อย 1 Tag ตรงกับที่เลือก"
            >
              ตรงข้อใดข้อหนึ่ง (ANY)
            </button>
            <button
              type="button"
              onClick={() => onChangeMatchMode("ALL")}
              className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                tagMatchMode === "ALL"
                  ? "bg-white text-blue-700 shadow-2xs font-bold"
                  : "text-slate-500 hover:text-slate-800"
              }`}
              title="ลูกค้าที่มีครบทุก Tags ที่เลือก"
            >
              ตรงทุกข้อ (ALL)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
