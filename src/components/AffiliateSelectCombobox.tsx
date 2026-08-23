import React, { useState, useRef, useEffect } from "react";
import { Affiliate } from "../types";
import { Search, ChevronDown, Check, X, Megaphone, User, Phone } from "lucide-react";

interface AffiliateSelectComboboxProps {
  value: string;
  onChange: (affiliateId: string) => void;
  affiliates: Affiliate[];
  id?: string;
  placeholder?: string;
  className?: string;
}

export default function AffiliateSelectCombobox({
  value,
  onChange,
  affiliates = [],
  id = "affiliate-select-combobox",
  placeholder = "-- ไม่ระบุ (ไม่มีผู้แนะนำ) --",
  className = ""
}: AffiliateSelectComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Find currently selected affiliate object
  const selectedAffiliate = affiliates.find(
    (a) => a.affiliateId.trim().toUpperCase() === (value || "").trim().toUpperCase()
  );

  // Close dropdown when clicked outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      // Auto focus search input when opened
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
      setSearchTerm("");
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Filtered list
  const filteredAffiliates = affiliates.filter((aff) => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return true;
    return (
      aff.name.toLowerCase().includes(q) ||
      aff.affiliateId.toLowerCase().includes(q) ||
      (aff.phone && aff.phone.includes(q)) ||
      (aff.lineId && aff.lineId.toLowerCase().includes(q)) ||
      (aff.contactChannel && aff.contactChannel.toLowerCase().includes(q))
    );
  });

  const handleSelect = (affId: string) => {
    onChange(affId);
    setIsOpen(false);
    setSearchTerm("");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
    setIsOpen(false);
    setSearchTerm("");
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`} id={`${id}-container`}>
      {/* Trigger Button */}
      <div
        id={id}
        tabIndex={0}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setIsOpen(!isOpen);
          }
        }}
        className="w-full min-h-[38px] bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-lg p-2 flex items-center justify-between gap-2 cursor-pointer transition-all text-xs"
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {selectedAffiliate ? (
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="px-1.5 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-700 font-mono font-bold rounded text-[11px] shrink-0">
                {selectedAffiliate.affiliateId}
              </span>
              <span className="font-semibold text-slate-800 truncate text-xs">
                {selectedAffiliate.name}
              </span>
              {selectedAffiliate.status === "inactive" && (
                <span className="text-[10px] text-slate-400 shrink-0">[ปิดใช้งาน]</span>
              )}
            </div>
          ) : value ? (
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="px-1.5 py-0.5 bg-purple-50 border border-purple-200 text-purple-700 font-mono font-bold rounded text-[11px] shrink-0">
                {value}
              </span>
            </div>
          ) : (
            <span className="text-slate-400 truncate text-xs">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0 text-slate-400">
          {(value || selectedAffiliate) && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 hover:text-rose-600 hover:bg-slate-200/60 rounded transition-colors"
              title="ล้างค่า / ไม่ระบุผู้แนะนำ"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? "rotate-180 text-indigo-600" : ""}`} />
        </div>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
          {/* Search Box */}
          <div className="p-2 border-b border-slate-100 bg-slate-50/70 flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="พิมพ์ค้นหาชื่อ, รหัส AFF0001, เบอร์โทร..."
              className="w-full bg-transparent text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Options List */}
          <div className="max-h-56 overflow-y-auto p-1 divide-y divide-slate-50 text-xs">
            {/* Option: No Affiliate */}
            <div
              onClick={() => handleSelect("")}
              className={`p-2 rounded-lg cursor-pointer flex items-center justify-between gap-2 transition-colors ${
                !value ? "bg-indigo-50/70 text-indigo-700 font-semibold" : "hover:bg-slate-50 text-slate-600"
              }`}
            >
              <span className="text-slate-500 italic">-- ไม่ระบุ (ไม่มีผู้แนะนำ) --</span>
              {!value && <Check className="w-3.5 h-3.5 text-indigo-600" />}
            </div>

            {filteredAffiliates.length === 0 ? (
              <div className="p-4 text-center text-slate-400 text-xs">
                ไม่พบข้อมูลผู้แนะนำที่ตรงกับ "{searchTerm}"
              </div>
            ) : (
              filteredAffiliates.map((aff) => {
                const isSelected = aff.affiliateId.trim().toUpperCase() === (value || "").trim().toUpperCase();

                return (
                  <div
                    key={aff.id}
                    onClick={() => handleSelect(aff.affiliateId)}
                    className={`p-2 rounded-lg cursor-pointer flex items-center justify-between gap-2 transition-colors ${
                      isSelected
                        ? "bg-indigo-50 text-indigo-900 font-semibold"
                        : "hover:bg-slate-50 text-slate-800"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="px-1.5 py-0.5 bg-slate-100 group-hover:bg-indigo-100 border border-slate-200 text-indigo-700 font-mono font-bold rounded text-[10px] shrink-0">
                        {aff.affiliateId}
                      </span>
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-800 truncate flex items-center gap-1.5">
                          <span>{aff.name}</span>
                          {aff.status === "inactive" && (
                            <span className="text-[9px] px-1 py-0.2 bg-slate-100 text-slate-500 rounded">ปิดใช้งาน</span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                          {aff.phone && <span>📞 {aff.phone}</span>}
                          {aff.lineId && <span>LINE: {aff.lineId}</span>}
                        </div>
                      </div>
                    </div>

                    {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
