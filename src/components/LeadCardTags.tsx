import React, { useState, useRef, useEffect } from "react";
import TagPill from "./TagPill";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";

interface LeadCardTagsProps {
  tags?: string[];
  maxVisible?: number;
  size?: "xs" | "sm";
  className?: string;
}

export default function LeadCardTags({
  tags = [],
  maxVisible = 3,
  size = "xs",
  className = ""
}: LeadCardTagsProps) {
  const [showPopover, setShowPopover] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setShowPopover(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!tags || tags.length === 0) return null;

  const visibleTags = tags.slice(0, maxVisible);
  const remainingTags = tags.slice(maxVisible);

  return (
    <div className={`flex flex-wrap items-center gap-1 ${className}`} onClick={(e) => e.stopPropagation()}>
      {visibleTags.map((tag) => (
        <TagPill key={tag} tag={tag} size={size} />
      ))}

      {remainingTags.length > 0 && (
        <div className="relative inline-block" ref={popoverRef}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowPopover(!showPopover);
            }}
            className="inline-flex items-center justify-center px-1.5 h-[22px] rounded-full text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 transition-colors cursor-pointer select-none"
            title="ดูป้ายกำกับทั้งหมด"
          >
            +{remainingTags.length}
          </button>

          <AnimatePresence>
            {showPopover && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 2 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 2 }}
                transition={{ duration: 0.12 }}
                className="absolute left-0 bottom-full mb-1.5 w-60 bg-white rounded-xl shadow-lg border border-slate-200 p-2.5 z-50 space-y-1.5"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-1">
                  <span className="text-[10px] font-bold text-slate-600 uppercase">
                    ป้ายกำกับทั้งหมด ({tags.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowPopover(false)}
                    className="p-0.5 text-slate-400 hover:text-slate-600 rounded"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-1 max-h-36 overflow-y-auto pt-0.5">
                  {tags.map((tag) => (
                    <TagPill key={tag} tag={tag} size="xs" />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
