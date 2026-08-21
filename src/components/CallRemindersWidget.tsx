import React, { useState } from "react";
import { Lead, TimelineItem } from "../types";
import { getFollowUpStatus, getTagInfo } from "../utils/crmHelpers";
import { 
  PhoneCall, Clock, CheckCircle2, AlertTriangle, Calendar, 
  ChevronRight, Filter, Plus, User, Search, ArrowRight, ExternalLink
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface CallRemindersWidgetProps {
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
  onUpdateLead?: (lead: Lead) => Promise<void> | void;
  currentUser?: string | null;
}

export default function CallRemindersWidget({
  leads,
  onSelectLead,
  onUpdateLead,
  currentUser
}: CallRemindersWidgetProps) {
  const [selectedFilter, setSelectedFilter] = useState<"all" | "overdue" | "today" | "upcoming" | "completed">("today");
  const [selectedSalesperson, setSelectedSalesperson] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const salespersonsList = Array.from(
    new Set(leads.map(l => l.salesPerson).filter(Boolean))
  );

  // Group leads by follow-up status
  const leadsWithFollowUp = leads.filter(l => l.followUp && l.followUp.date);

  const categorized = leadsWithFollowUp.reduce(
    (acc, lead) => {
      const statusInfo = getFollowUpStatus(lead.followUp);
      acc[statusInfo.status].push(lead);
      return acc;
    },
    {
      overdue: [] as Lead[],
      today: [] as Lead[],
      upcoming: [] as Lead[],
      completed: [] as Lead[],
      no_followup: [] as Lead[]
    }
  );

  const overdueCount = categorized.overdue.length;
  const todayCount = categorized.today.length;
  const upcomingCount = categorized.upcoming.length;
  const completedCount = categorized.completed.length;

  // Filter leads for active tab
  const displayedLeads = leadsWithFollowUp.filter(lead => {
    const statusInfo = getFollowUpStatus(lead.followUp);

    if (selectedFilter !== "all" && statusInfo.status !== selectedFilter) {
      return false;
    }

    if (selectedSalesperson !== "all" && lead.salesPerson !== selectedSalesperson) {
      return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        (lead.shopName && lead.shopName.toLowerCase().includes(q)) ||
        (lead.contactName && lead.contactName.toLowerCase().includes(q)) ||
        (lead.phone && lead.phone.includes(q)) ||
        (lead.followUp?.note && lead.followUp.note.toLowerCase().includes(q)) ||
        (lead.followUp?.topic && lead.followUp.topic.toLowerCase().includes(q));
      if (!match) return false;
    }

    return true;
  });

  // Sort displayed leads: overdue first, then by date/time ascending
  displayedLeads.sort((a, b) => {
    const dateA = `${a.followUp.date} ${a.followUp.time || "00:00"}`;
    const dateB = `${b.followUp.date} ${b.followUp.time || "00:00"}`;
    return dateA.localeCompare(dateB);
  });

  const handleMarkCompleted = async (lead: Lead, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onUpdateLead) return;

    const timelineItem: TimelineItem = {
      id: `id_${Math.random().toString(36).substring(2, 9)}`,
      title: "✓ โทรติดตามเรียบร้อยแล้ว",
      description: `เสร็จสิ้นการโทรติดตามตามนัดหมาย (${lead.followUp?.date} ${lead.followUp?.time || ""})`,
      date: new Date().toISOString(),
      type: "followup",
      author: currentUser || "ระบบ"
    };

    const updated: Lead = {
      ...lead,
      followUp: {
        ...lead.followUp,
        isCompleted: true
      },
      timeline: [...(lead.timeline || []), timelineItem]
    };

    await onUpdateLead(updated);
  };

  const handleQuickSnooze = async (lead: Lead, days: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onUpdateLead) return;

    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + days);
    const dateStr = targetDate.toISOString().split("T")[0];

    const timelineItem: TimelineItem = {
      id: `id_${Math.random().toString(36).substring(2, 9)}`,
      title: `⏰ เลื่อนการโทรไปอีก +${days} วัน`,
      description: `เลื่อนการโทรติดตามไปเป็นวันที่ ${dateStr} เวลา ${lead.followUp.time || "10:00"} น.`,
      date: new Date().toISOString(),
      type: "followup",
      author: currentUser || "ระบบ"
    };

    const updated: Lead = {
      ...lead,
      followUp: {
        ...lead.followUp,
        date: dateStr,
        isCompleted: false
      },
      timeline: [...(lead.timeline || []), timelineItem]
    };

    await onUpdateLead(updated);
  };

  return (
    <div id="call-reminders-dashboard-widget" className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-amber-100 text-amber-800 rounded-xl">
            <PhoneCall className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-slate-900 font-bold text-base flex items-center gap-2">
              <span>ระบบแจ้งเตือนโทรหาลูกค้า (Call Reminders)</span>
              {overdueCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 animate-pulse">
                  🔴 มี {overdueCount} รายการเลยกำหนด
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-400">
              กำหนดการโทรติดตามลูกค้าเป้าหมาย พร้อมสวิตช์จัดการสถานะและเลื่อนเวลารวดเร็ว
            </p>
          </div>
        </div>

        {/* Salesperson filter */}
        {salespersonsList.length > 0 && (
          <div className="flex items-center gap-2 self-start sm:self-center">
            <span className="text-xs text-slate-500 font-semibold flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> เซลส์:
            </span>
            <select
              value={selectedSalesperson}
              onChange={(e) => setSelectedSalesperson(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
            >
              <option value="all">ทุกคนในทีม</option>
              {salespersonsList.map(sp => (
                <option key={sp} value={sp}>{sp}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Filter Tabs Strip */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5 text-xs font-bold">
          <button
            type="button"
            onClick={() => setSelectedFilter("today")}
            className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 transition-all cursor-pointer ${
              selectedFilter === "today"
                ? "bg-amber-500 border-amber-500 text-white shadow-xs"
                : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
            }`}
          >
            <span>🟠 ต้องโทรวันนี้</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${selectedFilter === "today" ? "bg-white/20 text-white" : "bg-amber-100 text-amber-800"}`}>
              {todayCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedFilter("overdue")}
            className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 transition-all cursor-pointer ${
              selectedFilter === "overdue"
                ? "bg-rose-600 border-rose-600 text-white shadow-xs"
                : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
            }`}
          >
            <span>🔴 เลยกำหนด (Overdue)</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${selectedFilter === "overdue" ? "bg-white/20 text-white" : "bg-rose-100 text-rose-800"}`}>
              {overdueCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedFilter("upcoming")}
            className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 transition-all cursor-pointer ${
              selectedFilter === "upcoming"
                ? "bg-blue-600 border-blue-600 text-white shadow-xs"
                : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
            }`}
          >
            <span>🔵 เร็วๆ นี้ (Upcoming)</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${selectedFilter === "upcoming" ? "bg-white/20 text-white" : "bg-blue-100 text-blue-800"}`}>
              {upcomingCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedFilter("completed")}
            className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 transition-all cursor-pointer ${
              selectedFilter === "completed"
                ? "bg-emerald-600 border-emerald-600 text-white shadow-xs"
                : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
            }`}
          >
            <span>🟢 ติดตามแล้ว</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${selectedFilter === "completed" ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-800"}`}>
              {completedCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedFilter("all")}
            className={`px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
              selectedFilter === "all"
                ? "bg-slate-800 border-slate-800 text-white shadow-xs"
                : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
            }`}
          >
            ทั้งหมด ({leadsWithFollowUp.length})
          </button>
        </div>

        {/* Search input in widget */}
        <div className="relative w-full sm:w-48">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหาชื่อร้าน/เบอร์..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white"
          />
        </div>
      </div>

      {/* Reminder Cards Grid */}
      <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
        {displayedLeads.length > 0 ? (
          displayedLeads.map(lead => {
            const statusInfo = getFollowUpStatus(lead.followUp);
            return (
              <div
                key={lead.id}
                onClick={() => onSelectLead(lead)}
                className="p-3.5 rounded-xl border border-slate-200 hover:border-amber-300 hover:shadow-xs transition-all bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer group"
              >
                {/* Left info */}
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-900 text-sm group-hover:text-amber-700 transition-colors truncate">
                      {lead.shopName || "ไม่ระบุชื่อร้าน"}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusInfo.badgeClass}`}>
                      {statusInfo.label}
                    </span>
                    {lead.salesPerson && (
                      <span className="text-[10px] text-slate-400 font-medium">
                        (ดูแลโดย {lead.salesPerson})
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                    <span>ผู้ติดต่อ: <strong className="text-slate-700 font-semibold">{lead.contactName || "-"}</strong></span>
                    <span className="font-mono font-semibold text-slate-700">📞 {lead.phone || "-"}</span>
                    <span className="text-amber-800 font-medium">
                      ⏰ นัด: {lead.followUp.date} {lead.followUp.time || "10:00"} น.
                    </span>
                  </div>

                  {(lead.followUp.topic || lead.followUp.note || lead.followUp.detail) && (
                    <p className="text-xs text-slate-600 line-clamp-1 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100 mt-1">
                      {lead.followUp.topic && <strong className="text-slate-800">{lead.followUp.topic}: </strong>}
                      {lead.followUp.note || lead.followUp.detail}
                    </p>
                  )}
                </div>

                {/* Right Quick Actions */}
                <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center" onClick={(e) => e.stopPropagation()}>
                  {lead.phone && (
                    <a
                      href={`tel:${lead.phone}`}
                      className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                      title="โทรออก"
                    >
                      <PhoneCall className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">โทร</span>
                    </a>
                  )}

                  {!lead.followUp.isCompleted ? (
                    <>
                      <button
                        type="button"
                        onClick={(e) => handleQuickSnooze(lead, 1, e)}
                        className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                        title="เลื่อนนัดเป็นวันพรุ่งนี้"
                      >
                        +1 วัน
                      </button>

                      <button
                        type="button"
                        onClick={(e) => handleMarkCompleted(lead, e)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>เสร็จแล้ว</span>
                      </button>
                    </>
                  ) : (
                    <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> เรียบร้อย
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => onSelectLead(lead)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg transition-colors cursor-pointer"
                    title="เปิดดู Lead"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-8 bg-slate-50 border border-slate-100 rounded-2xl text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
            <p className="font-bold text-slate-700 text-sm">ไม่มีรายการแจ้งเตือนในหมวดหมู่นี้</p>
            <p className="text-xs text-slate-400">คุณสามารถตั้งเวลาโทรติดตามได้ในหน้าข้อมูลของ Lead แต่ละราย</p>
          </div>
        )}
      </div>
    </div>
  );
}
