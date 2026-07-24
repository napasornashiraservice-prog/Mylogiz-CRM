import React, { useState } from "react";
import { Lead, Note } from "../types";
import { MessageSquare, Search, Plus, Calendar, User, Eye, Sparkles } from "lucide-react";
import { motion } from "motion/react";

interface NotesViewProps {
  leads: Lead[];
  salespersons?: string[];
  currentUser?: string | null;
  onAddNote: (leadId: string, text: string, author: string) => void;
  onSelectLead: (lead: Lead) => void;
}

export default function NotesView({ 
  leads, 
  salespersons = [], 
  currentUser = null, 
  onAddNote, 
  onSelectLead 
}: NotesViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLeadId, setSelectedLeadId] = useState(leads[0]?.id || "");
  const [newNoteText, setNewNoteText] = useState("");
  const [noteAuthor, setNoteAuthor] = useState(currentUser || salespersons[0] || "Phere");

  React.useEffect(() => {
    if (currentUser) {
      setNoteAuthor(currentUser);
    } else if (salespersons.length > 0 && !noteAuthor) {
      setNoteAuthor(salespersons[0]);
    }
  }, [salespersons, currentUser, noteAuthor]);

  // Collect all notes with their corresponding lead info
  const allNotesWithLeadInfo = leads.flatMap(lead => {
    return (lead.notes || []).map(note => ({
      ...note,
      leadId: lead.id,
      shopName: lead.shopName,
      leadObject: lead
    }));
  }).sort((a, b) => {
    return b.createdAt.localeCompare(a.createdAt);
  });

  const filteredNotes = allNotesWithLeadInfo.filter(n => {
    return (
      n.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.shopName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.author.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const handleQuickAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim() || !selectedLeadId) return;

    onAddNote(selectedLeadId, newNoteText, noteAuthor);
    setNewNoteText("");
  };

  return (
    <div className="space-y-6" id="notes-view-container">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-gray-800">ระบบบันทึกจดโน้ตช่วยจำ (CRM Shared Notes)</h2>
        <p className="text-xs text-gray-500 mt-0.5">ศูนย์กลางจัดเก็บข้อมูลสรุป คำแนะนำ หรือข้อคิดเห็นเพิ่มเติมที่ได้จากการประสานงานของลูกค้าทุกรายรวมกัน</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Quick Add Note Sidebar */}
        <div id="notes-quick-add-card" className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs h-fit space-y-4">
          <div className="flex items-center gap-1.5 border-b border-slate-100 pb-2">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <h3 className="text-slate-800 font-semibold text-xs uppercase tracking-wider">บันทึกด่วนนอกสถานที่</h3>
          </div>

          <form onSubmit={handleQuickAddNote} className="space-y-3.5 text-xs">
            {/* Customer Dropdown */}
            <div>
              <label className="block text-slate-500 font-bold mb-1">เลือกร้านค้า / Lead</label>
              <select
                id="notes-quick-lead-select"
                value={selectedLeadId}
                onChange={(e) => setSelectedLeadId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {leads.map(l => (
                  <option key={l.id} value={l.id}>{l.shopName}</option>
                ))}
              </select>
            </div>

            {/* Author */}
            <div>
              <label className="block text-slate-500 font-bold mb-1">ผู้จดบันทึก</label>
              <select
                id="notes-quick-author-select"
                value={noteAuthor}
                onChange={(e) => setNoteAuthor(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {(salespersons.length > 0 ? salespersons : ["Phere", "Nalin", "Beer"]).map((sp) => (
                  <option key={sp} value={sp}>{sp}</option>
                ))}
              </select>
            </div>

            {/* Content text */}
            <div>
              <label className="block text-slate-500 font-bold mb-1">ข้อความโน้ตช่วยจำ</label>
              <textarea
                id="notes-quick-text-area"
                rows={4}
                required
                placeholder="เช่น 'ชอบให้โทรหลังเลิกงาน', 'คุยง่าย สุภาพ แฟนเป็นคนตัดสินใจโอนเงิน', 'สนใจเรทราคา DHL'"
                value={newNoteText}
                onChange={(e) => setNewNoteText(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-xs text-slate-800"
              />
            </div>

            <button
              id="notes-quick-submit-btn"
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-lg transition-colors cursor-pointer text-center text-xs shadow-2xs"
            >
              บันทึกลงระบบทันที
            </button>
          </form>
        </div>

        {/* Central Notes Feed (2/3 cols) */}
        <div id="notes-feed-card" className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs lg:col-span-2 space-y-4 flex flex-col">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h3 className="text-slate-800 font-semibold text-sm">ประวัติโน้ตช่วยจำย้อนหลัง (Notes Audit Trail)</h3>
              <p className="text-[11px] text-slate-400">ค้นหารายละเอียดคำตอบจากบันทึกเก่าทั้งหมด</p>
            </div>

            {/* Search filter input */}
            <div className="relative w-full sm:w-64 text-xs">
              <input
                id="notes-search-input"
                type="text"
                placeholder="ค้นหาโน้ต, ชื่อร้าน, เซลส์..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-3 pr-8 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white text-slate-700"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
            </div>
          </div>

          {/* Notes list Feed layout */}
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {filteredNotes.map(item => (
              <div 
                key={item.id} 
                id={`notes-feed-item-${item.id}`}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-blue-100 transition-all space-y-2 relative"
              >
                {/* Meta details */}
                <div className="flex justify-between items-center text-[10px] text-slate-400">
                  <div className="flex items-center gap-1.5 font-medium">
                    <User className="w-3 h-3 text-blue-500" />
                    <span className="font-bold text-blue-700">{item.author}</span>
                    <span>จดให้</span>
                    <span 
                      id={`notes-feed-shop-link-${item.id}`}
                      onClick={() => onSelectLead(item.leadObject)}
                      className="font-bold text-slate-800 hover:underline cursor-pointer flex items-center gap-0.5"
                    >
                      {item.shopName} <Eye className="w-3 h-3 text-slate-400 inline" />
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-1 text-slate-400 font-mono">
                    <Calendar className="w-3 h-3" />
                    <span>
                      {new Date(item.createdAt).toLocaleDateString("th-TH")} | {new Date(item.createdAt).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>

                {/* Notes Text */}
                <p className="text-xs text-slate-700 font-medium leading-relaxed bg-white p-3 rounded-lg border border-slate-100">
                  {item.text}
                </p>
              </div>
            ))}
            {filteredNotes.length === 0 && (
              <div className="py-20 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
                <MessageSquare className="w-8 h-8 text-slate-300" />
                <span>ยังไม่มีโน้ตที่ตรงกับคำค้นหานี้</span>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
