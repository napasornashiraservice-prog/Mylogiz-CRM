import React, { useState } from "react";
import { Lead, StatusLabels } from "../types";
import { 
  PhoneCall, Calendar, Clock, CheckCircle, AlertCircle, 
  Search, ExternalLink, User, MapPin
} from "lucide-react";
import { motion } from "motion/react";

interface FollowUpViewProps {
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
  onUpdateLead: (lead: Lead) => void;
}

export default function FollowUpView({ leads, onSelectLead, onUpdateLead }: FollowUpViewProps) {
  const todayStr = new Date().toISOString().split("T")[0];

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "overdue" | "today" | "pending" | "completed">("all");
  const [tabFilter, setTabFilter] = useState<"pending" | "completed">("pending");

  // Filter leads with valid followUp date
  const followUpLeads = leads.filter(l => l.followUp && l.followUp.date);

  // Category counts
  const pendingCount = followUpLeads.filter(l => !l.followUp.isCompleted).length;
  const completedCount = followUpLeads.filter(l => l.followUp.isCompleted).length;
  const overdueCount = followUpLeads.filter(l => !l.followUp.isCompleted && l.followUp.date < todayStr).length;
  const todayCount = followUpLeads.filter(l => !l.followUp.isCompleted && l.followUp.date === todayStr).length;

  // Toggle completion
  const handleToggleComplete = (lead: Lead, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    onUpdateLead({
      ...lead,
      followUp: {
        ...lead.followUp,
        isCompleted: !lead.followUp.isCompleted
      }
    });
  };

  // Filtered list
  const filteredListLeads = followUpLeads.filter(l => {
    const matchesSearch = 
      l.shopName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.contactName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.phone.includes(searchQuery) ||
      l.province.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesTab = tabFilter === "completed" 
      ? l.followUp.isCompleted 
      : !l.followUp.isCompleted;

    const matchesStatus = 
      statusFilter === "all" ? true :
      statusFilter === "pending" ? !l.followUp.isCompleted :
      statusFilter === "overdue" ? (!l.followUp.isCompleted && l.followUp.date < todayStr) :
      statusFilter === "today" ? (!l.followUp.isCompleted && l.followUp.date === todayStr) :
      statusFilter === "completed" ? l.followUp.isCompleted : true;

    return matchesSearch && matchesTab && matchesStatus;
  }).sort((a, b) => {
    if (tabFilter === "pending") {
      return a.followUp.date.localeCompare(b.followUp.date);
    } else {
      return b.followUp.date.localeCompare(a.followUp.date);
    }
  });

  return (
    <div className="space-y-6" id="followup-view-container">
      {/* 1. Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <span className="p-2.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
            <PhoneCall className="w-5 h-5" />
          </span>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">รายการนัดหมายโทรติดตามลูกค้า</h1>
            <p className="text-xs text-slate-500 mt-0.5">คิวสายโทรติดต่อและประวัติบันทึกผลการติดตามทั้งหมด</p>
          </div>
        </div>
      </div>

      {/* 2. Top Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div 
          id="followup-card-overdue"
          onClick={() => { setTabFilter("pending"); setStatusFilter("overdue"); }}
          className="bg-red-50 hover:bg-red-100/80 transition-all p-4 rounded-xl border border-red-200/80 flex items-center justify-between cursor-pointer"
        >
          <div>
            <span className="text-red-800 text-xs font-semibold flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 text-red-600" /> เลยกำหนดค้างโทร
            </span>
            <div className="text-2xl font-black text-red-950 font-mono tracking-tight mt-1">{overdueCount} ราย</div>
            <p className="text-[10px] text-red-600 mt-0.5">กรองดูเฉพาะสายเกินกำหนด</p>
          </div>
          <div className="w-10 h-10 bg-red-200/60 text-red-700 rounded-xl flex items-center justify-center font-bold">
            ⚠️
          </div>
        </div>

        <div 
          id="followup-card-today"
          onClick={() => { setTabFilter("pending"); setStatusFilter("today"); }}
          className="bg-amber-50 hover:bg-amber-100/80 transition-all p-4 rounded-xl border border-amber-200/80 flex items-center justify-between cursor-pointer"
        >
          <div>
            <span className="text-amber-800 text-xs font-semibold flex items-center gap-1">
              <PhoneCall className="w-3.5 h-3.5 text-amber-600" /> โทรวันนี้
            </span>
            <div className="text-2xl font-black text-amber-950 font-mono tracking-tight mt-1">{todayCount} ราย</div>
            <p className="text-[10px] text-amber-600 mt-0.5">นัดหมายสำคัญวันปัจจุบัน</p>
          </div>
          <div className="w-10 h-10 bg-amber-200/60 text-amber-700 rounded-xl flex items-center justify-center font-bold animate-pulse">
            📞
          </div>
        </div>

        <div 
          id="followup-card-completed"
          onClick={() => { setTabFilter("completed"); setStatusFilter("all"); }}
          className="bg-emerald-50 hover:bg-emerald-100/80 transition-all p-4 rounded-xl border border-emerald-200/80 flex items-center justify-between cursor-pointer"
        >
          <div>
            <span className="text-emerald-800 text-xs font-semibold flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> โทรเสร็จสิ้นแล้ว
            </span>
            <div className="text-2xl font-black text-emerald-950 font-mono tracking-tight mt-1">{completedCount} ราย</div>
            <p className="text-[10px] text-emerald-600 mt-0.5">ประวัติสายโทรที่บันทึกผลแล้ว</p>
          </div>
          <div className="w-10 h-10 bg-emerald-200/60 text-emerald-700 rounded-xl flex items-center justify-center font-bold">
            ✓
          </div>
        </div>
      </div>

      {/* 3. Task List Table */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4" id="followup-list-table-section">
        {/* Controls: Tabs & Search */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          
          <div className="flex items-center gap-2 flex-wrap">
            <div className="bg-slate-100 p-0.5 rounded-lg flex border border-slate-200">
              <button
                id="followup-tab-pending-btn"
                onClick={() => setTabFilter("pending")}
                className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                  tabFilter === "pending" ? "bg-white text-blue-700 shadow-xs" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                คิวต้องโทร ({pendingCount})
              </button>
              <button
                id="followup-tab-completed-btn"
                onClick={() => setTabFilter("completed")}
                className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                  tabFilter === "completed" ? "bg-white text-blue-700 shadow-xs" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                ประวัติโทรแล้ว ({completedCount})
              </button>
            </div>

            {/* Status Filter Dropdown */}
            <select
              id="followup-status-filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-slate-50 border border-slate-200 text-xs text-slate-700 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">สถานะทั้งหมด</option>
              <option value="overdue">⚠️ เลยกำหนด</option>
              <option value="today">🔴 ต้องโทรวันนี้</option>
              <option value="pending">⏳ รอดำเนินการ</option>
              <option value="completed">✓ โทรเสร็จสิ้น</option>
            </select>
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
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800"
            />
          </div>

        </div>

        {/* Schedule Queue Table */}
        <div className="overflow-x-auto pt-1">
          <table id="followup-queue-table" className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
                <th className="p-3.5 pl-4">วันที่นัดหมาย / เวลา</th>
                <th className="p-3.5">ประเภทแจ้งเตือน</th>
                <th className="p-3.5">ร้านค้า / ผู้ติดต่อ</th>
                <th className="p-3.5">เบอร์โทรศัพท์</th>
                <th className="p-3.5">สถานะงานขาย</th>
                <th className="p-3.5">เซลส์ผู้ดูแล</th>
                <th className="p-3.5 text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredListLeads.map(lead => {
                const fDate = lead.followUp.date;
                const isOverdue = !lead.followUp.isCompleted && fDate < todayStr;
                const isToday = !lead.followUp.isCompleted && fDate === todayStr;

                return (
                  <tr
                    key={lead.id}
                    id={`followup-queue-row-${lead.id}`}
                    onClick={() => onSelectLead(lead)}
                    className={`hover:bg-slate-50/80 cursor-pointer transition-colors ${
                      isOverdue ? "bg-red-50/10" : isToday ? "bg-amber-50/10" : ""
                    }`}
                  >
                    <td className="p-3.5 pl-4 font-semibold text-slate-800">
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
                    <td className="p-3.5">
                      {lead.followUp.isCompleted ? (
                        <span className="text-[10px] bg-green-50 border border-green-200 text-green-700 px-2 py-0.5 rounded-full font-bold">
                          ✓ โทรเรียบร้อย
                        </span>
                      ) : isOverdue ? (
                        <span className="flex items-center gap-1 text-[10px] bg-red-100 text-red-800 px-2 py-0.5 rounded-full font-bold shrink-0 border border-red-200">
                          <AlertCircle className="w-3 h-3" /> ⚠️ เลยกำหนด
                        </span>
                      ) : isToday ? (
                        <span className="flex items-center gap-1 text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold shrink-0 border border-amber-200 animate-pulse">
                          <PhoneCall className="w-3 h-3" /> 🔴 ต้องโทรวันนี้
                        </span>
                      ) : (
                        <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-semibold shrink-0 border border-slate-200">
                          📅 นัดหมายเร็วๆ นี้
                        </span>
                      )}
                    </td>
                    <td className="p-3.5">
                      <div className="space-y-0.5">
                        <span className="font-bold text-slate-900 block">{lead.shopName}</span>
                        <span className="text-slate-400 text-[10px]">{lead.contactName || "-"}</span>
                      </div>
                    </td>
                    <td className="p-3.5 text-slate-600 font-mono">
                      <a 
                        href={`tel:${lead.phone}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-blue-600 hover:underline font-bold"
                      >
                        {lead.phone}
                      </a>
                    </td>
                    <td className="p-3.5 text-slate-500 font-medium">
                      {StatusLabels[lead.status]}
                    </td>
                    <td className="p-3.5 text-slate-500">{lead.salesPerson}</td>
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          id={`followup-complete-btn-${lead.id}`}
                          onClick={(e) => handleToggleComplete(lead, e)}
                          className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                            lead.followUp.isCompleted 
                              ? "bg-green-100 border-green-200 text-green-800 hover:bg-green-200" 
                              : "bg-white border-slate-200 hover:bg-slate-50 text-slate-600"
                          }`}
                          title={lead.followUp.isCompleted ? "เปลี่ยนกลับเป็นค้างโทร" : "ทำเครื่องหมายเป็นโทรแล้ว"}
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                        <button
                          id={`followup-details-btn-${lead.id}`}
                          onClick={() => onSelectLead(lead)}
                          className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-blue-600 cursor-pointer"
                          title="ดูข้อมูลรายละเอียด"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredListLeads.length === 0 && (
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
