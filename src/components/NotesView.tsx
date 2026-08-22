import React, { useState, useMemo, useRef, useEffect } from "react";
import { Lead, Note, NOTE_CATEGORIES, NoteCategory, NotePriority } from "../types";
import { 
  MessageSquare, 
  Search, 
  Plus, 
  Calendar, 
  User, 
  Eye, 
  Pin, 
  PinOff,
  Edit3, 
  Trash2, 
  AlertCircle, 
  Check, 
  X, 
  Filter, 
  Sparkles, 
  Building2, 
  Tag, 
  Flame, 
  Star, 
  Clock, 
  History,
  Store,
  ChevronDown,
  RotateCcw
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface NotesViewProps {
  leads: Lead[];
  salespersons?: string[];
  currentUser?: string | null;
  onAddNote: (
    leadId: string, 
    text: string, 
    author: string, 
    category?: string, 
    priority?: NotePriority, 
    isPinned?: boolean
  ) => void;
  onUpdateNote?: (
    leadId: string, 
    noteId: string, 
    updatedFields: Partial<Note>, 
    editorName?: string
  ) => void;
  onDeleteNote?: (leadId: string, noteId: string, deleterName?: string) => void;
  onTogglePinNote?: (leadId: string, noteId: string) => void;
  onSelectLead: (lead: Lead) => void;
}

export default function NotesView({ 
  leads, 
  salespersons = [], 
  currentUser = null, 
  onAddNote, 
  onUpdateNote,
  onDeleteNote,
  onTogglePinNote,
  onSelectLead 
}: NotesViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLeadId, setSelectedLeadId] = useState(leads[0]?.id || "");
  const [selectedCategory, setSelectedCategory] = useState<string>("ข้อมูลสำคัญของลูกค้า");
  const [selectedPriority, setSelectedPriority] = useState<NotePriority>("normal");
  const [isPinnedChecked, setIsPinnedChecked] = useState(false);
  const [newNoteText, setNewNoteText] = useState("");
  const [noteAuthor, setNoteAuthor] = useState(currentUser || salespersons[0] || "Phere");

  const availableAuthors = useMemo(() => {
    return Array.from(
      new Set([
        ...(currentUser ? [currentUser] : []),
        ...(salespersons.length > 0 ? salespersons : ["Phere", "Nalin", "Beer"])
      ])
    ).filter(Boolean) as string[];
  }, [currentUser, salespersons]);

  // Searchable Lead Select state for Quick Add Note
  const [isLeadSelectOpen, setIsLeadSelectOpen] = useState(false);
  const [leadSearchText, setLeadSearchText] = useState("");
  const leadSelectDropdownRef = useRef<HTMLDivElement>(null);
  const leadSearchInputRef = useRef<HTMLInputElement>(null);

  // Filters for the notes feed
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterAuthor, setFilterAuthor] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterPinnedOnly, setFilterPinnedOnly] = useState<boolean>(false);
  const [leadFilterQuery, setLeadFilterQuery] = useState<string>("");

  // Edit Modal State
  const [editingNote, setEditingNote] = useState<{
    leadId: string;
    note: Note;
    shopName: string;
  } | null>(null);
  const [editText, setEditText] = useState("");
  const [editCategory, setEditCategory] = useState<string>("ข้อมูลสำคัญของลูกค้า");
  const [editPriority, setEditPriority] = useState<NotePriority>("normal");
  const [editPinned, setEditPinned] = useState(false);

  // Delete Confirmation State
  const [deletingNote, setDeletingNote] = useState<{
    leadId: string;
    noteId: string;
    text: string;
    shopName: string;
  } | null>(null);

  React.useEffect(() => {
    if (currentUser) {
      setNoteAuthor(currentUser);
    } else if (salespersons.length > 0 && !noteAuthor) {
      setNoteAuthor(salespersons[0]);
    }
  }, [salespersons, currentUser, noteAuthor]);

  // Keep selectedLeadId valid if leads change
  useEffect(() => {
    if (leads.length > 0 && (!selectedLeadId || !leads.some(l => l.id === selectedLeadId))) {
      setSelectedLeadId(leads[0].id);
    }
  }, [leads, selectedLeadId]);

  // Click outside listener to close lead searchable dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (leadSelectDropdownRef.current && !leadSelectDropdownRef.current.contains(event.target as Node)) {
        setIsLeadSelectOpen(false);
      }
    };
    if (isLeadSelectOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      // Auto focus search input when opened
      setTimeout(() => {
        leadSearchInputRef.current?.focus();
      }, 50);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isLeadSelectOpen]);

  // Active Lead Object for Quick Summary
  const currentSelectedLead = useMemo(() => {
    return leads.find(l => l.id === selectedLeadId) || leads[0] || null;
  }, [leads, selectedLeadId]);

  // Filtered Leads for Searchable Select Dropdown
  const selectableLeads = useMemo(() => {
    const q = leadSearchText.trim().toLowerCase();
    if (!q) return leads;
    return leads.filter(l => {
      const matchShop = l.shopName?.toLowerCase().includes(q);
      const matchContact = l.contactName?.toLowerCase().includes(q);
      const matchSp = l.salesPerson?.toLowerCase().includes(q);
      const matchPhone = l.phone?.toLowerCase().includes(q);
      const matchCode = l.customerCode?.toLowerCase().includes(q);
      const matchTags = l.tags && l.tags.some(t => t.toLowerCase().includes(q));
      return matchShop || matchContact || matchSp || matchPhone || matchCode || matchTags;
    });
  }, [leads, leadSearchText]);

  // Flatten all notes across all displayed leads
  const allNotesWithLeadInfo = useMemo(() => {
    return leads.flatMap(lead => {
      return (lead.notes || []).map(note => ({
        ...note,
        leadId: lead.id,
        shopName: lead.shopName,
        leadStatus: lead.status,
        salesPerson: lead.salesPerson,
        leadTags: lead.tags || [],
        leadObject: lead,
        category: note.category || "ข้อมูลสำคัญของลูกค้า",
        priority: note.priority || "normal",
        isPinned: Boolean(note.isPinned)
      }));
    }).sort((a, b) => {
      // Pinned notes come first
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      // Then newest first
      return b.createdAt.localeCompare(a.createdAt);
    });
  }, [leads]);

  // Filtered notes according to search and dropdown filters
  const filteredNotes = useMemo(() => {
    return allNotesWithLeadInfo.filter(n => {
      const matchesSearch = 
        !searchQuery.trim() ||
        n.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.shopName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (n.category && n.category.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (n.leadTags && n.leadTags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())));

      const matchesCategory = filterCategory === "all" || n.category === filterCategory;
      const matchesAuthor = filterAuthor === "all" || n.author === filterAuthor;
      const matchesPriority = filterPriority === "all" || n.priority === filterPriority;
      const matchesPinned = !filterPinnedOnly || n.isPinned;

      return matchesSearch && matchesCategory && matchesAuthor && matchesPriority && matchesPinned;
    });
  }, [allNotesWithLeadInfo, searchQuery, filterCategory, filterAuthor, filterPriority, filterPinnedOnly]);

  // Recent Note Activities (Recent 4 created/updated/pinned notes)
  const recentActivities = useMemo(() => {
    const sorted = [...allNotesWithLeadInfo].sort((a, b) => {
      const timeA = a.updatedAt || a.createdAt;
      const timeB = b.updatedAt || b.createdAt;
      return timeB.localeCompare(timeA);
    });
    return sorted.slice(0, 4);
  }, [allNotesWithLeadInfo]);

  // Pinned notes of the selected lead for the compact summary
  const selectedLeadPinnedNotes = useMemo(() => {
    if (!currentSelectedLead) return [];
    return (currentSelectedLead.notes || []).filter(n => n.isPinned);
  }, [currentSelectedLead]);

  const handleQuickAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim() || !selectedLeadId) return;

    onAddNote(
      selectedLeadId, 
      newNoteText.trim(), 
      noteAuthor, 
      selectedCategory, 
      selectedPriority, 
      isPinnedChecked
    );

    setNewNoteText("");
    setIsPinnedChecked(false);
    setSelectedPriority("normal");
  };

  const handleOpenEdit = (noteItem: typeof allNotesWithLeadInfo[0]) => {
    setEditingNote({
      leadId: noteItem.leadId,
      note: noteItem,
      shopName: noteItem.shopName
    });
    setEditText(noteItem.text);
    setEditCategory(noteItem.category || "ข้อมูลสำคัญของลูกค้า");
    setEditPriority(noteItem.priority || "normal");
    setEditPinned(Boolean(noteItem.isPinned));
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNote || !editText.trim()) return;

    if (onUpdateNote) {
      onUpdateNote(
        editingNote.leadId,
        editingNote.note.id,
        {
          text: editText.trim(),
          category: editCategory,
          priority: editPriority,
          isPinned: editPinned
        },
        currentUser || "ระบบ"
      );
    }
    setEditingNote(null);
  };

  const handleConfirmDelete = () => {
    if (!deletingNote) return;
    if (onDeleteNote) {
      onDeleteNote(deletingNote.leadId, deletingNote.noteId, currentUser || "ระบบ");
    }
    setDeletingNote(null);
  };

  const handleTogglePin = (leadId: string, noteId: string) => {
    if (onTogglePinNote) {
      onTogglePinNote(leadId, noteId);
    }
  };

  const resetFilters = () => {
    setSearchQuery("");
    setFilterCategory("all");
    setFilterAuthor("all");
    setFilterPriority("all");
    setFilterPinnedOnly(false);
  };

  const hasActiveFilters = 
    Boolean(searchQuery.trim()) || 
    filterCategory !== "all" || 
    filterAuthor !== "all" || 
    filterPriority !== "all" || 
    filterPinnedOnly;

  // Category styling helper
  const getCategoryBadgeClass = (category: string) => {
    switch (category) {
      case "ข้อมูลสำคัญของลูกค้า":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "ความต้องการของลูกค้า":
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
      case "ราคา / โปรโมชั่น":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "การใช้งานระบบ":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "การขนส่ง":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "คู่แข่ง":
        return "bg-orange-50 text-orange-700 border-orange-200";
      case "Follow-up":
        return "bg-cyan-50 text-cyan-700 border-cyan-200";
      case "ปัญหา / Complaint":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "การตัดสินใจ":
        return "bg-teal-50 text-teal-700 border-teal-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="space-y-5" id="notes-view-container">
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-50 rounded-xl text-blue-600 border border-blue-100">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 tracking-tight">ระบบบันทึกโน้ตช่วยจำ (CRM Shared Notes)</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                ศูนย์กลางสำหรับบันทึกข้อมูลสำคัญของลูกค้าและ Lead ที่ทีมสามารถดูและใช้ร่วมกันได้
              </p>
            </div>
          </div>
        </div>

        {/* Header Stats */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600">
            <span>โน้ตทั้งหมด:</span>
            <span className="font-bold text-blue-600 font-mono text-sm">{allNotesWithLeadInfo.length}</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-xl text-xs font-semibold text-amber-800">
            <Pin className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
            <span>ปักหมุด:</span>
            <span className="font-bold text-amber-700 font-mono text-sm">
              {allNotesWithLeadInfo.filter(n => n.isPinned).length}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* LEFT COLUMN (4/12): Note Creation Form */}
        <div className="lg:col-span-4 space-y-4">
          <div id="notes-quick-add-card" className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-600" />
                <h3 className="text-slate-800 font-bold text-xs uppercase tracking-wider">บันทึกโน้ตช่วยจำใหม่</h3>
              </div>
              <span className="text-[10px] text-slate-400 font-medium">บันทึกลง Cloud</span>
            </div>

            <form onSubmit={handleQuickAddNote} className="space-y-3 text-xs">
              {/* 1. Select Customer / Lead (Searchable Dropdown) */}
              <div className="relative" ref={leadSelectDropdownRef} id="notes-quick-lead-search-container">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-600 font-bold">
                    เลือกร้านค้า / Lead <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10px] text-slate-400 font-medium">
                    (ค้นหาได้จากชื่อร้าน, เซลส์, เบอร์โทร)
                  </span>
                </div>

                {/* Combobox Trigger Button */}
                <button
                  id="notes-quick-lead-select-trigger"
                  type="button"
                  onClick={() => setIsLeadSelectOpen(prev => !prev)}
                  className={`w-full bg-slate-50 hover:bg-slate-100/90 border transition-all rounded-xl p-2.5 flex items-center justify-between text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    isLeadSelectOpen ? "border-blue-500 bg-white ring-2 ring-blue-500/20 shadow-xs" : "border-slate-200"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 truncate">
                    <div className="p-1 bg-blue-100 text-blue-700 rounded-md shrink-0">
                      <Store className="w-3.5 h-3.5" />
                    </div>
                    <div className="truncate">
                      {currentSelectedLead ? (
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="font-bold text-slate-800 text-xs truncate">
                            {currentSelectedLead.shopName}
                          </span>
                          {currentSelectedLead.salesPerson && (
                            <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-semibold border border-blue-200 shrink-0">
                              {currentSelectedLead.salesPerson}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs font-medium">เลือกร้านค้า / Lead...</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-slate-400 shrink-0 ml-1">
                    <Search className="w-3.5 h-3.5 text-slate-400" />
                    <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isLeadSelectOpen ? "rotate-180 text-blue-600" : ""}`} />
                  </div>
                </button>

                {/* Dropdown Menu Popup */}
                <AnimatePresence>
                  {isLeadSelectOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -4, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -4, scale: 0.98 }}
                      transition={{ duration: 0.15 }}
                      className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden flex flex-col max-h-80"
                      id="notes-lead-select-dropdown"
                    >
                      {/* Search Input in Dropdown */}
                      <div className="p-2 border-b border-slate-100 bg-slate-50/70">
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                          <input
                            ref={leadSearchInputRef}
                            id="notes-lead-search-input"
                            type="text"
                            value={leadSearchText}
                            onChange={(e) => setLeadSearchText(e.target.value)}
                            placeholder="พิมพ์ค้นหาชื่อร้าน, เซลส์, ผู้ติดต่อ, เบอร์..."
                            className="w-full bg-white border border-slate-200 rounded-lg pl-8 pr-7 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder:text-slate-400"
                            onKeyDown={(e) => {
                              if (e.key === "Escape") {
                                setIsLeadSelectOpen(false);
                              }
                            }}
                          />
                          {leadSearchText && (
                            <button
                              type="button"
                              onClick={() => setLeadSearchText("")}
                              className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                              title="ล้างคำค้นหา"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-slate-400 px-1 pt-1.5">
                          <span>พบ <strong className="text-slate-700 font-bold">{selectableLeads.length}</strong> รายการ</span>
                          {leadSearchText && (
                            <button
                              type="button"
                              onClick={() => setLeadSearchText("")}
                              className="text-blue-600 hover:underline cursor-pointer font-medium"
                            >
                              ล้างการค้นหา
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Lead List Options */}
                      <div className="overflow-y-auto max-h-60 p-1 space-y-0.5 scrollbar-thin">
                        {selectableLeads.length > 0 ? (
                          selectableLeads.map((lead) => {
                            const isSelected = lead.id === selectedLeadId;
                            return (
                              <button
                                key={lead.id}
                                type="button"
                                id={`lead-option-${lead.id}`}
                                onClick={() => {
                                  setSelectedLeadId(lead.id);
                                  setIsLeadSelectOpen(false);
                                }}
                                className={`w-full p-2 rounded-lg text-left transition-colors flex items-center justify-between gap-2 cursor-pointer ${
                                  isSelected 
                                    ? "bg-blue-50 text-blue-900 border border-blue-200 font-bold shadow-2xs" 
                                    : "hover:bg-slate-50 text-slate-700 border border-transparent"
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0 truncate">
                                  <div className={`p-1 rounded-md shrink-0 ${isSelected ? 'bg-blue-200/80 text-blue-800' : 'bg-slate-100 text-slate-500'}`}>
                                    <Store className="w-3.5 h-3.5" />
                                  </div>
                                  <div className="min-w-0 truncate">
                                    <div className="flex items-center gap-1.5 truncate">
                                      <span className={`text-xs truncate ${isSelected ? "font-bold text-blue-900" : "font-semibold text-slate-800"}`}>
                                        {lead.shopName}
                                      </span>
                                      {lead.salesPerson && (
                                        <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-medium shrink-0">
                                          {lead.salesPerson}
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5 truncate">
                                      {lead.contactName && <span className="truncate">👤 {lead.contactName}</span>}
                                      {lead.phone && <span>📞 {lead.phone}</span>}
                                      {lead.customerCode && <span>🏷️ {lead.customerCode}</span>}
                                    </div>
                                  </div>
                                </div>

                                {isSelected && (
                                  <Check className="w-4 h-4 text-blue-600 shrink-0 ml-1" />
                                )}
                              </button>
                            );
                          })
                        ) : (
                          <div className="p-4 text-center text-slate-400 text-xs flex flex-col items-center gap-1.5">
                            <AlertCircle className="w-5 h-5 text-slate-300" />
                            <span className="font-semibold text-slate-600">ไม่พบร้านค้าที่ตรงกับ &ldquo;{leadSearchText}&rdquo;</span>
                            <span className="text-[10px] text-slate-400">ลองพิมพ์คำค้นอื่น เช่น ชื่อร้าน หรือ เบอร์โทร</span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* 2. Note Category */}
              <div>
                <label className="block text-slate-600 font-bold mb-1">
                  ประเภทโน้ต <span className="text-rose-500">*</span>
                </label>
                <select
                  id="notes-category-select"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-800 font-medium text-xs cursor-pointer"
                >
                  {NOTE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* 3. Priority & Author (2-Col) */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">ความสำคัญ</label>
                  <select
                    id="notes-priority-select"
                    value={selectedPriority}
                    onChange={(e) => setSelectedPriority(e.target.value as NotePriority)}
                    className={`w-full border rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs font-semibold cursor-pointer ${
                      selectedPriority === "urgent" 
                        ? "bg-rose-50 border-rose-200 text-rose-700" 
                        : selectedPriority === "important" 
                        ? "bg-amber-50 border-amber-200 text-amber-700" 
                        : "bg-slate-50 border-slate-200 text-slate-700"
                    }`}
                  >
                    <option value="normal">⚪ ปกติ</option>
                    <option value="important">⭐ สำคัญ</option>
                    <option value="urgent">🔥 สำคัญมาก</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">ผู้จดบันทึก</label>
                  <select
                    id="notes-quick-author-select"
                    value={noteAuthor}
                    onChange={(e) => setNoteAuthor(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-800 font-medium text-xs cursor-pointer"
                  >
                    {availableAuthors.map((sp) => (
                      <option key={sp} value={sp}>{sp}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 4. Pin Checkbox Option */}
              <div className="pt-1">
                <label 
                  id="notes-pin-checkbox-label"
                  className={`flex items-center gap-2 p-2.5 rounded-xl border transition-all cursor-pointer select-none ${
                    isPinnedChecked 
                      ? "bg-amber-50/80 border-amber-200 text-amber-900 font-bold" 
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <input
                    id="notes-pin-checkbox-input"
                    type="checkbox"
                    checked={isPinnedChecked}
                    onChange={(e) => setIsPinnedChecked(e.target.checked)}
                    className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                  />
                  <Pin className={`w-3.5 h-3.5 ${isPinnedChecked ? "text-amber-600 fill-amber-500" : "text-slate-400"}`} />
                  <span className="text-xs">📌 ปักหมุด Note นี้ไว้ด้านบนสุด</span>
                </label>
              </div>

              {/* 5. Note Text Field */}
              <div>
                <label className="block text-slate-600 font-bold mb-1">
                  ข้อความโน้ตช่วยจำ <span className="text-rose-500">*</span>
                </label>
                <textarea
                  id="notes-quick-text-area"
                  rows={4}
                  required
                  placeholder="เช่น 'ลูกค้าชอบติดต่อทาง LINE สะดวกรับของช่วงบ่าย', 'กำลังเปรียบเทียบราคากับเจ้าเดิม ยอดส่ง 500 ชิ้น/เดือน'..."
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-xs text-slate-800 leading-relaxed placeholder:text-slate-400"
                />
              </div>

              {/* 6. Submit Button */}
              <button
                id="notes-quick-submit-btn"
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl transition-all cursor-pointer text-center text-xs shadow-xs flex items-center justify-center gap-2 active:scale-[0.99]"
              >
                <Plus className="w-4 h-4" />
                <span>บันทึกโน้ตช่วยจำ</span>
              </button>
            </form>
          </div>
        </div>

        {/* RIGHT COLUMN (8/12): Summary + Activity + Filters + Notes Feed */}
        <div className="lg:col-span-8 space-y-4">
          
          {/* A. Quick Summary of Selected Customer */}
          {currentSelectedLead && (
            <div 
              id="notes-customer-quick-summary"
              className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2.5 transition-all"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg shrink-0">
                    <Store className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-800 text-xs sm:text-sm truncate">
                        {currentSelectedLead.shopName}
                      </h4>
                      {currentSelectedLead.contactName && (
                        <span className="text-[11px] text-slate-400 font-medium hidden sm:inline truncate">
                          ({currentSelectedLead.contactName})
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold border border-slate-200">
                    สถานะ: {currentSelectedLead.status}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold border border-blue-100">
                    เซลส์: {currentSelectedLead.salesPerson || "ไม่ระบุ"}
                  </span>
                  <button
                    id="notes-open-lead-btn"
                    type="button"
                    onClick={() => onSelectLead(currentSelectedLead)}
                    className="p-1 text-slate-400 hover:text-blue-600 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
                    title="เปิดดูรายละเอียด Lead เต็มรูปแบบ"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Tags & Pinned note glance */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 text-[11px]">
                <div className="flex flex-wrap items-center gap-1">
                  <span className="text-slate-400 text-[10px] font-medium flex items-center gap-1">
                    <Tag className="w-3 h-3 text-slate-400" /> แท็ก:
                  </span>
                  {(currentSelectedLead.tags || []).length > 0 ? (
                    currentSelectedLead.tags.map((t, idx) => (
                      <span key={idx} className="bg-slate-100 text-slate-600 text-[10px] px-1.5 py-0.5 rounded font-medium">
                        {t}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-400 text-[10px]">ไม่มีแท็ก</span>
                  )}
                </div>

                {selectedLeadPinnedNotes.length > 0 && (
                  <div className="flex items-center gap-1 text-[10px] text-amber-800 bg-amber-50/80 px-2 py-0.5 rounded-md border border-amber-200 font-medium truncate max-w-full">
                    <Pin className="w-3 h-3 text-amber-600 fill-amber-500 shrink-0" />
                    <span className="font-bold shrink-0">ข้อมูลสำคัญ:</span>
                    <span className="truncate">{selectedLeadPinnedNotes[0].text}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* B. Recent Activity Bar */}
          {recentActivities.length > 0 && (
            <div id="notes-recent-activity-bar" className="bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200 flex items-center gap-2 overflow-x-auto text-[11px] text-slate-600 shadow-2xs">
              <div className="flex items-center gap-1 text-slate-500 font-bold shrink-0 text-[10px] uppercase tracking-wider">
                <History className="w-3.5 h-3.5 text-blue-600" />
                <span>ล่าสุด:</span>
              </div>
              <div className="flex items-center gap-3 overflow-x-auto whitespace-nowrap scrollbar-none py-0.5">
                {recentActivities.map((act, idx) => (
                  <div key={act.id + idx} className="flex items-center gap-1 text-[11px] shrink-0">
                    <span className="font-bold text-slate-800">{act.author || act.updatedBy}</span>
                    <span className="text-slate-400">
                      {act.updatedAt ? "แก้ไข" : act.isPinned ? "ปักหมุด" : "บันทึก"}
                    </span>
                    <span 
                      onClick={() => onSelectLead(act.leadObject)}
                      className="text-blue-600 font-semibold hover:underline cursor-pointer"
                    >
                      {act.shopName}
                    </span>
                    {idx < recentActivities.length - 1 && <span className="text-slate-300 ml-2">•</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* C. Search & Multi-Filter Bar */}
          <div id="notes-filter-card" className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-2.5">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
              
              {/* Search Bar */}
              <div className="sm:col-span-5 relative text-xs">
                <input
                  id="notes-search-input"
                  type="text"
                  placeholder="ค้นหาข้อความ, ร้านค้า, เซลส์, แท็ก..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-3 pr-8 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-800 text-xs"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-3" />
              </div>

              {/* Category Filter */}
              <div className="sm:col-span-3">
                <select
                  id="filter-category-select"
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 text-xs cursor-pointer font-medium"
                >
                  <option value="all">📁 ทุกประเภท ({allNotesWithLeadInfo.length})</option>
                  {NOTE_CATEGORIES.map(cat => {
                    const count = allNotesWithLeadInfo.filter(n => n.category === cat).length;
                    return (
                      <option key={cat} value={cat}>
                        {cat} ({count})
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Author Filter */}
              <div className="sm:col-span-2">
                <select
                  id="filter-author-select"
                  value={filterAuthor}
                  onChange={(e) => setFilterAuthor(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 text-xs cursor-pointer font-medium"
                >
                  <option value="all">👤 ผู้บันทึก</option>
                  {availableAuthors.map(sp => (
                    <option key={sp} value={sp}>{sp}</option>
                  ))}
                </select>
              </div>

              {/* Priority Filter */}
              <div className="sm:col-span-2">
                <select
                  id="filter-priority-select"
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 text-xs cursor-pointer font-medium"
                >
                  <option value="all">⚡ ทุกความสำคัญ</option>
                  <option value="normal">⚪ ปกติ</option>
                  <option value="important">⭐ สำคัญ</option>
                  <option value="urgent">🔥 สำคัญมาก</option>
                </select>
              </div>
            </div>

            {/* Sub-filter bar: Pin toggle and reset */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 text-xs">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  id="toggle-filter-pinned-btn"
                  onClick={() => setFilterPinnedOnly(!filterPinnedOnly)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                    filterPinnedOnly 
                      ? "bg-amber-500 text-white border-amber-600 shadow-2xs" 
                      : "bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200"
                  }`}
                >
                  <Pin className={`w-3 h-3 ${filterPinnedOnly ? "fill-white" : "text-slate-400"}`} />
                  <span>เฉพาะที่ปักหมุด</span>
                </button>

                <span className="text-[11px] text-slate-400 font-medium">
                  แสดง {filteredNotes.length} จาก {allNotesWithLeadInfo.length} รายการ
                </span>
              </div>

              {hasActiveFilters && (
                <button
                  type="button"
                  id="reset-notes-filter-btn"
                  onClick={resetFilters}
                  className="flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>รีเซ็ตตัวกรอง</span>
                </button>
              )}
            </div>
          </div>

          {/* D. Notes List Feed */}
          <div id="notes-feed-container" className="space-y-3 max-h-[640px] overflow-y-auto pr-1">
            <AnimatePresence mode="popLayout">
              {filteredNotes.map(item => {
                const isUrgent = item.priority === "urgent";
                const isImportant = item.priority === "important";

                return (
                  <motion.div
                    key={item.id}
                    id={`notes-feed-item-${item.id}`}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className={`p-4 rounded-2xl border transition-all space-y-2.5 relative group ${
                      item.isPinned 
                        ? "bg-amber-50/30 border-amber-200/80 shadow-xs" 
                        : isUrgent 
                        ? "bg-rose-50/20 border-rose-200/80 shadow-2xs"
                        : isImportant
                        ? "bg-amber-50/20 border-amber-200/60 shadow-2xs"
                        : "bg-white border-slate-200 hover:border-blue-200 shadow-2xs"
                    }`}
                  >
                    {/* Header Row: Category Badge + Pin Status + Priority Badge + Action Buttons */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        
                        {/* Pinned Badge */}
                        {item.isPinned && (
                          <span 
                            id={`note-pinned-badge-${item.id}`}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-300/80"
                          >
                            <Pin className="w-2.5 h-2.5 fill-amber-700 text-amber-700" />
                            <span>ปักหมุด</span>
                          </span>
                        )}

                        {/* Category Badge */}
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${getCategoryBadgeClass(item.category || "")}`}>
                          {item.category || "ข้อมูลสำคัญของลูกค้า"}
                        </span>

                        {/* Priority Badge */}
                        {isUrgent && (
                          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-700 border border-rose-200">
                            <Flame className="w-3 h-3 text-rose-600 fill-rose-500" />
                            <span>สำคัญมาก</span>
                          </span>
                        )}
                        {isImportant && !isUrgent && (
                          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            <Star className="w-3 h-3 text-amber-600 fill-amber-500" />
                            <span>สำคัญ</span>
                          </span>
                        )}
                      </div>

                      {/* Card Actions (Pin, Edit, Delete, View) */}
                      <div className="flex items-center gap-1">
                        {/* Toggle Pin */}
                        <button
                          type="button"
                          id={`note-toggle-pin-${item.id}`}
                          onClick={() => handleTogglePin(item.leadId, item.id)}
                          className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                            item.isPinned 
                              ? "bg-amber-100 border-amber-300 text-amber-800 hover:bg-amber-200" 
                              : "bg-slate-50 border-slate-200 text-slate-400 hover:text-amber-600 hover:bg-amber-50"
                          }`}
                          title={item.isPinned ? "ยกเลิกการปักหมุด" : "ปักหมุดโน้ตนี้"}
                        >
                          {item.isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                        </button>

                        {/* Edit Note */}
                        <button
                          type="button"
                          id={`note-edit-btn-${item.id}`}
                          onClick={() => handleOpenEdit(item)}
                          className="p-1.5 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 text-slate-400 hover:text-blue-600 rounded-lg transition-colors cursor-pointer"
                          title="แก้ไขข้อความโน้ต"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete Note */}
                        <button
                          type="button"
                          id={`note-delete-btn-${item.id}`}
                          onClick={() => setDeletingNote({
                            leadId: item.leadId,
                            noteId: item.id,
                            text: item.text,
                            shopName: item.shopName
                          })}
                          className="p-1.5 bg-slate-50 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                          title="ลบโน้ตนี้"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Note Content Text */}
                    <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-100 text-xs text-slate-800 font-medium leading-relaxed whitespace-pre-wrap">
                      {item.text}
                    </div>

                    {/* Footer Row: Shop Reference + Author & Timestamp */}
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-400 pt-0.5">
                      
                      {/* Shop Reference Link */}
                      <button
                        type="button"
                        id={`notes-feed-shop-link-${item.id}`}
                        onClick={() => {
                          setSelectedLeadId(item.leadId);
                          onSelectLead(item.leadObject);
                        }}
                        className="flex items-center gap-1 font-bold text-slate-700 hover:text-blue-600 transition-colors cursor-pointer"
                        title="คลิกเพื่อเปิดดูลูกค้ารายนี้"
                      >
                        <Building2 className="w-3 h-3 text-blue-500" />
                        <span>{item.shopName}</span>
                        <Eye className="w-3 h-3 text-slate-400" />
                      </button>

                      {/* Author & Timestamp */}
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-1 font-medium">
                          <User className="w-3 h-3 text-slate-400" />
                          <span className="font-bold text-slate-700">{item.author || "ระบบ"}</span>
                        </div>

                        <div className="flex items-center gap-1 font-mono text-slate-400">
                          <Clock className="w-3 h-3" />
                          <span>
                            {new Date(item.createdAt).toLocaleDateString("th-TH")} {new Date(item.createdAt).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>

                        {/* Edited By footnote */}
                        {item.updatedAt && (
                          <span className="text-slate-400 text-[9px]">
                            (แก้ไขโดย {item.updatedBy || "ระบบ"} {new Date(item.updatedAt).toLocaleDateString("th-TH")})
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {filteredNotes.length === 0 && (
              <div className="py-20 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2 bg-white rounded-2xl border border-slate-200">
                <MessageSquare className="w-8 h-8 text-slate-300" />
                <span className="font-semibold text-slate-600">ไม่พบข้อมูลโน้ตช่วยจำที่ตรงกับเงื่อนไข</span>
                <p className="text-[11px] text-slate-400">ลองเปลี่ยนคำค้นหา หรือรีเซ็ตตัวกรองด้านบน</p>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="mt-2 px-3 py-1 bg-blue-50 text-blue-600 font-bold rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors cursor-pointer text-xs"
                  >
                    รีเซ็ตตัวกรองทั้งหมด
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* 3. EDIT NOTE MODAL DIALOG */}
      {editingNote && (
        <div id="notes-edit-modal-overlay" className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-5 space-y-4 text-xs"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-blue-600" />
                <h3 className="font-bold text-slate-800 text-sm">แก้ไขโน้ตช่วยจำ</h3>
                <span className="text-slate-400 font-medium truncate max-w-[160px]">
                  ({editingNote.shopName})
                </span>
              </div>
              <button
                type="button"
                id="close-edit-note-modal-btn"
                onClick={() => setEditingNote(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3">
              {/* Category & Priority in Edit Modal */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">ประเภทโน้ต</label>
                  <select
                    id="edit-note-category-select"
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 font-medium text-xs cursor-pointer"
                  >
                    {NOTE_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">ความสำคัญ</label>
                  <select
                    id="edit-note-priority-select"
                    value={editPriority}
                    onChange={(e) => setEditPriority(e.target.value as NotePriority)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 font-semibold text-xs cursor-pointer"
                  >
                    <option value="normal">⚪ ปกติ</option>
                    <option value="important">⭐ สำคัญ</option>
                    <option value="urgent">🔥 สำคัญมาก</option>
                  </select>
                </div>
              </div>

              {/* Pin toggle in Edit Modal */}
              <div>
                <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer select-none">
                  <input
                    id="edit-note-pin-checkbox"
                    type="checkbox"
                    checked={editPinned}
                    onChange={(e) => setEditPinned(e.target.checked)}
                    className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                  />
                  <Pin className={`w-3.5 h-3.5 ${editPinned ? "text-amber-600 fill-amber-500" : "text-slate-400"}`} />
                  <span className="font-bold text-slate-700">📌 ปักหมุด Note นี้ไว้ด้านบนสุด</span>
                </label>
              </div>

              {/* Text Field */}
              <div>
                <label className="block text-slate-600 font-bold mb-1">ข้อความโน้ต</label>
                <textarea
                  id="edit-note-textarea"
                  rows={4}
                  required
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-xs text-slate-800 leading-relaxed"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  id="cancel-edit-note-btn"
                  onClick={() => setEditingNote(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  id="save-edit-note-btn"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                >
                  <Check className="w-4 h-4" />
                  <span>บันทึกการแก้ไข</span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* 4. DELETE CONFIRMATION MODAL */}
      {deletingNote && (
        <div id="notes-delete-modal-overlay" className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-sm w-full p-5 space-y-4 text-xs"
          >
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2 bg-rose-50 rounded-xl border border-rose-100">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-sm">ยืนยันการลบโน้ต</h3>
                <p className="text-slate-400 text-[11px]">ร้าน: {deletingNote.shopName}</p>
              </div>
            </div>

            <p className="text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs italic">
              "{deletingNote.text}"
            </p>

            <p className="text-slate-500 text-[11px]">
              คุณแน่ใจหรือไม่ว่าต้องการลบโน้ตนี้ออกจากระบบ? การกระทำนี้ไม่สามารถเรียกคืนได้
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                id="cancel-delete-note-btn"
                onClick={() => setDeletingNote(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                id="confirm-delete-note-btn"
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
              >
                <Trash2 className="w-4 h-4" />
                <span>ยืนยันลบโน้ต</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}

    </div>
  );
}
