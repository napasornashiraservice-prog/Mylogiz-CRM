import React, { useState } from "react";
import { Lead, StatusLabels } from "../types";
import { 
  PhoneCall, Calendar, Clock, CheckCircle, AlertCircle, 
  Search, SlidersHorizontal, ArrowRight, Star, ExternalLink 
} from "lucide-react";
import { motion } from "motion/react";

interface FollowUpViewProps {
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
  onUpdateLead: (lead: Lead) => void;
}

export default function FollowUpView({ leads, onSelectLead, onUpdateLead }: FollowUpViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [tabFilter, setTabFilter] = useState<"pending" | "completed">("pending");
  const todayStr = new Date().toISOString().split("T")[0];

  // Filters leads with valid followUp settings
  const followUpLeads = leads.filter(l => l.followUp && l.followUp.date);

  const filteredLeads = followUpLeads.filter(l => {
    // Search match
    const matchesSearch = 
      l.shopName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.contactName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.phone.includes(searchQuery) ||
      l.province.toLowerCase().includes(searchQuery.toLowerCase());

    // Completed/Pending tab filter
    const matchesTab = tabFilter === "completed" 
      ? l.followUp.isCompleted 
      : !l.followUp.isCompleted;

    return matchesSearch && matchesTab;
  }).sort((a, b) => {
    // Sort pending: overdue first, then chronological. Sort completed: newest first.
    if (tabFilter === "pending") {
      return a.followUp.date.localeCompare(b.followUp.date);
    } else {
      return b.followUp.date.localeCompare(a.followUp.date);
    }
  });

  // Category counts
  const pendingCount = followUpLeads.filter(l => !l.followUp.isCompleted).length;
  const completedCount = followUpLeads.filter(l => l.followUp.isCompleted).length;
  
  const overdueCount = followUpLeads.filter(l => 
    !l.followUp.isCompleted && l.followUp.date < todayStr
  ).length;

  const todayCount = followUpLeads.filter(l => 
    !l.followUp.isCompleted && l.followUp.date === todayStr
  ).length;

  const handleToggleComplete = (lead: Lead, e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdateLead({
      ...lead,
      followUp: {
        ...lead.followUp,
        isCompleted: !lead.followUp.isCompleted
      }
    });
  };

  const getFollowUpStatusBadge = (date: string) => {
    if (date < todayStr) {
      return (
        <span className="flex items-center gap-1 text-[10px] bg-red-100 text-red-800 px-2 py-0.5 rounded-full font-bold shrink-0 border border-red-200">
          <AlertCircle className="w-3 h-3" /> ⚠️ เลยกำหนด (Overdue)
        </span>
      );
    } else if (date === todayStr) {
      return (
        <span className="flex items-center gap-1 text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold shrink-0 border border-amber-200 animate-pulse">
          <PhoneCall className="w-3 h-3" /> 🔴 ต้องโทรวันนี้
        </span>
      );
    } else {
      return (
        <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-semibold shrink-0 border border-slate-200">
          📅 นัดหมายเร็วๆ นี้
        </span>
      );
    }
  };

  return (
    <div className="space-y-6" id="follow-up-container">
      {/* View Header */}
      <div>
        <h2 className="text-xl font-bold text-gray-800">ระบบติดตามงานขายประจำวัน (Follow Up Dashboard)</h2>
        <p className="text-xs text-gray-500 mt-0.5">แจ้งเตือนสายสำคัญที่ครบกำหนดโทร และบันทึกนัดหมายลูกค้าเพื่อไม่ให้ตกหล่นดีลการขาย</p>
      </div>

      {/* Summary grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div id="followup-summary-overdue" className="bg-red-50 p-4 rounded-xl border border-red-100 flex items-center justify-between">
          <div>
            <span className="text-red-800 text-xs font-semibold">เลยนัดหมายค้างโทร</span>
            <div className="text-2xl font-black text-red-950 font-mono tracking-tight mt-0.5">{overdueCount} ราย</div>
            <p className="text-[10px] text-red-600 mt-0.5">ควรรีบโทรเพื่อกู้คืนโอกาสการขาย</p>
          </div>
          <AlertCircle className="w-8 h-8 text-red-400 shrink-0" />
        </div>

        <div id="followup-summary-today" className="bg-amber-50 p-4 rounded-xl border border-amber-100 flex items-center justify-between">
          <div>
            <span className="text-amber-800 text-xs font-semibold">มีคิวต้องโทรวันนี้</span>
            <div className="text-2xl font-black text-amber-950 font-mono tracking-tight mt-0.5">{todayCount} ราย</div>
            <p className="text-[10px] text-amber-600 mt-0.5">กำหนดโทรเช็คความก้าวหน้าวันนี้</p>
          </div>
          <PhoneCall className="w-8 h-8 text-amber-400 shrink-0" />
        </div>

        <div id="followup-summary-completed" className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 flex items-center justify-between">
          <div>
            <span className="text-emerald-800 text-xs font-semibold">โทรเสร็จสิ้นแล้ว</span>
            <div className="text-2xl font-black text-emerald-950 font-mono tracking-tight mt-0.5">{completedCount} ราย</div>
            <p className="text-[10px] text-emerald-600 mt-0.5">บันทึกความสนใจและแผนงานเรียบร้อย</p>
          </div>
          <CheckCircle className="w-8 h-8 text-emerald-400 shrink-0" />
        </div>
      </div>

      {/* Tabs list and Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          
          {/* Tab filters */}
          <div className="bg-slate-100 p-0.5 rounded-lg flex border border-slate-200">
            <button
              id="followup-tab-pending"
              onClick={() => setTabFilter("pending")}
              className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${tabFilter === "pending" ? "bg-white text-blue-700 shadow-xs" : "text-slate-500 hover:text-slate-800"}`}
            >
              คิวต้องโทร ({pendingCount})
            </button>
            <button
              id="followup-tab-completed"
              onClick={() => setTabFilter("completed")}
              className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${tabFilter === "completed" ? "bg-white text-blue-700 shadow-xs" : "text-slate-500 hover:text-slate-800"}`}
            >
              ประวัติโทรแล้ว ({completedCount})
            </button>
          </div>

          {/* Quick Search */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              id="followup-search-input"
              type="text"
              placeholder="ค้นหาชื่อร้าน, เบอร์โทร..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white text-slate-800"
            />
          </div>

        </div>

        {/* Schedule Queue List table */}
        <div className="overflow-x-auto pt-1">
          <table id="followup-table" className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
                <th className="p-4 pl-5">วันที่นัดหมาย / เวลา</th>
                <th className="p-4">ประเภทแจ้งเตือน</th>
                <th className="p-4">ร้านค้า / ผู้ติดต่อ</th>
                <th className="p-4">เบอร์โทรศัพท์</th>
                <th className="p-4">สถานะปัจจุบัน</th>
                <th className="p-4">เซลส์ผู้ดูแล</th>
                <th className="p-4 text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLeads.map(lead => {
                const fDate = lead.followUp.date;
                const isOverdue = !lead.followUp.isCompleted && fDate < todayStr;
                const isToday = !lead.followUp.isCompleted && fDate === todayStr;

                return (
                  <tr
                    key={lead.id}
                    id={`followup-row-${lead.id}`}
                    onClick={() => onSelectLead(lead)}
                    className={`hover:bg-slate-50/50 cursor-pointer transition-colors ${isOverdue ? "bg-red-50/10" : isToday ? "bg-amber-50/10" : ""}`}
                  >
                    <td className="p-4 pl-5 font-semibold text-slate-800">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <div className="space-y-0.5">
                          <span className="font-mono block">
                            {new Date(fDate).toLocaleDateString("th-TH")}
                          </span>
                          <span className="text-[10px] text-slate-400 block font-mono">
                            เวลา: {lead.followUp.time || "10:00"} น.
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      {lead.followUp.isCompleted ? (
                        <span className="text-[10px] bg-green-50 border border-green-200 text-green-700 px-2 py-0.5 rounded-full font-bold">
                          ✓ โทรเรียบร้อย
                        </span>
                      ) : (
                        getFollowUpStatusBadge(fDate)
                      )}
                    </td>
                    <td className="p-4">
                      <div className="space-y-0.5">
                        <span className="font-bold text-slate-900 block">{lead.shopName}</span>
                        <span className="text-slate-400 text-[10px]">{lead.contactName || "-"}</span>
                      </div>
                    </td>
                    <td className="p-4 text-slate-600 font-mono">{lead.phone}</td>
                    <td className="p-4 text-slate-500 font-medium">
                      {StatusLabels[lead.status]}
                    </td>
                    <td className="p-4 text-slate-500">{lead.salesPerson}</td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          id={`followup-complete-btn-${lead.id}`}
                          onClick={(e) => handleToggleComplete(lead, e)}
                          className={`p-1.5 rounded-lg border transition-colors ${lead.followUp.isCompleted ? "bg-green-100 border-green-200 text-green-800 hover:bg-green-200" : "bg-white border-slate-200 hover:bg-slate-50 text-slate-600"}`}
                          title={lead.followUp.isCompleted ? "เปลี่ยนกลับเป็นค้างโทร" : "ทำเครื่องหมายเป็นโทรแล้ว"}
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                        <button
                          id={`followup-details-link-${lead.id}`}
                          onClick={() => onSelectLead(lead)}
                          className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-blue-600"
                          title="ดูข้อมูลละเอียดเพื่อโทรคุย"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredLeads.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    ไม่มีรายการโทรนัดหมายที่ตรงเงื่อนไขในช่วงเวลานี้
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}
