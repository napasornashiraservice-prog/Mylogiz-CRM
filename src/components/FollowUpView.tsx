import React, { useState, useMemo } from "react";
import { Lead, NotePriority, StatusLabels, StatusColors, FollowUpPriority } from "../types";
import { getFollowUpStatus, getPriorityBadgeInfo } from "../utils/crmHelpers";
import FollowUpCard from "./FollowUpCard";
import FollowUpOutcomeModal from "./FollowUpOutcomeModal";
import QuickSnoozeModal from "./QuickSnoozeModal";
import MonthlyCalendar from "./MonthlyCalendar";
import FollowUpPerformanceView from "./FollowUpPerformanceView";
import { 
  PhoneCall, Calendar, Layers, Clock, CheckCircle2, 
  AlertTriangle, Filter, Search, RotateCcw, BarChart3, 
  Plus, Sparkles, ChevronDown, ChevronUp, User, ListFilter
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface FollowUpViewProps {
  leads: Lead[];
  salespersons?: string[];
  currentUser?: string | null;
  onSelectLead: (lead: Lead) => void;
  onUpdateLead: (lead: Lead) => Promise<void> | void;
  onAddNote?: (leadId: string, text: string, author?: string, category?: string, priority?: NotePriority, isPinned?: boolean) => Promise<void> | void;
}

export default function FollowUpView({
  leads,
  salespersons = [],
  currentUser = null,
  onSelectLead,
  onUpdateLead,
  onAddNote
}: FollowUpViewProps) {
  // Main Tab Navigation: "queue" | "calendar" | "performance"
  const [activeMainTab, setActiveMainTab] = useState<"queue" | "calendar" | "performance">("queue");

  // Summary Card / Category Filter: "all" | "overdue" | "today" | "upcoming" | "completed"
  const [selectedCategory, setSelectedCategory] = useState<"all" | "overdue" | "today" | "upcoming" | "completed">("all");

  // Granular Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSalesperson, setSelectedSalesperson] = useState<string>("all");
  const [selectedLeadStatus, setSelectedLeadStatus] = useState<string>("all");
  const [selectedPriority, setSelectedPriority] = useState<string>("all");
  const [selectedTimeRange, setSelectedTimeRange] = useState<string>("all");

  // Modals state
  const [outcomeModalLead, setOutcomeModalLead] = useState<Lead | null>(null);
  const [snoozeModalLead, setSnoozeModalLead] = useState<Lead | null>(null);

  // Collapsible section state for completed items in "all" mode
  const [isCompletedSectionOpen, setIsCompletedSectionOpen] = useState(false);

  const todayStr = new Date().toISOString().split("T")[0];

  // Salespersons list from leads + props
  const allSalespersons = useMemo(() => {
    return Array.from(new Set([
      ...salespersons,
      ...leads.map(l => l.salesPerson).filter(Boolean)
    ]));
  }, [salespersons, leads]);

  // Leads with valid follow-up
  const followUpLeads = useMemo(() => {
    return leads.filter(l => l.followUp && l.followUp.date);
  }, [leads]);

  // Categorize leads for Summary counts
  const summaryCounts = useMemo(() => {
    let overdue = 0;
    let today = 0;
    let upcoming = 0;
    let completed = 0;

    followUpLeads.forEach(lead => {
      const statusInfo = getFollowUpStatus(lead.followUp);
      if (statusInfo.status === "overdue") overdue++;
      else if (statusInfo.status === "today") today++;
      else if (statusInfo.status === "upcoming") upcoming++;
      else if (statusInfo.status === "completed") completed++;
    });

    return { overdue, today, upcoming, completed, total: followUpLeads.length };
  }, [followUpLeads]);

  // Filter Leads for Queue
  const filteredQueueLeads = useMemo(() => {
    return followUpLeads.filter(lead => {
      const statusInfo = getFollowUpStatus(lead.followUp);

      // 1. Category Filter (Summary Cards)
      if (selectedCategory !== "all" && statusInfo.status !== selectedCategory) {
        return false;
      }

      // 2. Salesperson Filter
      if (selectedSalesperson !== "all" && lead.salesPerson !== selectedSalesperson) {
        return false;
      }

      // 3. Lead Status Filter
      if (selectedLeadStatus !== "all" && lead.status !== selectedLeadStatus) {
        return false;
      }

      // 4. Priority Filter
      if (selectedPriority !== "all") {
        const leadPriority = lead.followUp?.priority || "normal";
        if (leadPriority !== selectedPriority) return false;
      }

      // 5. Time Range Filter
      if (selectedTimeRange !== "all") {
        const followDate = lead.followUp.date;
        if (selectedTimeRange === "today" && followDate !== todayStr) return false;
        if (selectedTimeRange === "tomorrow") {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          const tomorrowStr = tomorrow.toISOString().split("T")[0];
          if (followDate !== tomorrowStr) return false;
        }
        if (selectedTimeRange === "next_7_days") {
          const next7 = new Date();
          next7.setDate(next7.getDate() + 7);
          const next7Str = next7.toISOString().split("T")[0];
          if (followDate < todayStr || followDate > next7Str) return false;
        }
        if (selectedTimeRange === "this_month") {
          const currentYearMonth = todayStr.substring(0, 7);
          if (!followDate.startsWith(currentYearMonth)) return false;
        }
      }

      // 6. Search Query Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          (lead.shopName && lead.shopName.toLowerCase().includes(q)) ||
          (lead.contactName && lead.contactName.toLowerCase().includes(q)) ||
          (lead.phone && lead.phone.includes(q)) ||
          (lead.followUp?.note && lead.followUp.note.toLowerCase().includes(q)) ||
          (lead.followUp?.topic && lead.followUp.topic.toLowerCase().includes(q)) ||
          (lead.followUp?.lastOutcome && lead.followUp.lastOutcome.toLowerCase().includes(q)) ||
          (lead.tags && lead.tags.some(t => t.toLowerCase().includes(q)));
        if (!match) return false;
      }

      return true;
    });
  }, [followUpLeads, selectedCategory, selectedSalesperson, selectedLeadStatus, selectedPriority, selectedTimeRange, searchQuery, todayStr]);

  // Group filtered leads into Priority Sections: Overdue, Today, Upcoming, Completed
  const groupedSections = useMemo(() => {
    const overdue: Lead[] = [];
    const today: Lead[] = [];
    const upcoming: Lead[] = [];
    const completed: Lead[] = [];

    filteredQueueLeads.forEach(lead => {
      const statusInfo = getFollowUpStatus(lead.followUp);
      if (statusInfo.status === "overdue") overdue.push(lead);
      else if (statusInfo.status === "today") today.push(lead);
      else if (statusInfo.status === "upcoming") upcoming.push(lead);
      else if (statusInfo.status === "completed") completed.push(lead);
    });

    const sortByDateTime = (a: Lead, b: Lead) => {
      const dateA = `${a.followUp.date} ${a.followUp.time || "00:00"}`;
      const dateB = `${b.followUp.date} ${b.followUp.time || "00:00"}`;
      return dateA.localeCompare(dateB);
    };

    return {
      overdue: overdue.sort(sortByDateTime),
      today: today.sort(sortByDateTime),
      upcoming: upcoming.sort(sortByDateTime),
      completed: completed.sort(sortByDateTime)
    };
  }, [filteredQueueLeads]);

  const hasActiveFilters = searchQuery.trim() !== "" || selectedSalesperson !== "all" || selectedLeadStatus !== "all" || selectedPriority !== "all" || selectedTimeRange !== "all" || selectedCategory !== "all";

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedSalesperson("all");
    setSelectedLeadStatus("all");
    setSelectedPriority("all");
    setSelectedTimeRange("all");
    setSelectedCategory("all");
  };

  return (
    <div className="space-y-6" id="followup-management-container">
      {/* 1. Header with View Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl border border-blue-100 shadow-2xs">
            <PhoneCall className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span>ศูนย์ควบคุมการติดตามลูกค้า (Follow-up Management)</span>
              {summaryCounts.overdue > 0 && (
                <span className="text-[11px] bg-rose-50 text-rose-700 font-bold px-2.5 py-0.5 rounded-full border border-rose-200 animate-pulse">
                  🔴 เลยกำหนด {summaryCounts.overdue} ราย
                </span>
              )}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              ศูนย์รวมคิวงานติดตามลูกค้าเป้าหมาย นัดหมาย บันทึกผลการโทร และดูปฏิทินแบบครบวงจร
            </p>
          </div>
        </div>

        {/* View Switcher Controls */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold self-start sm:self-center">
          <button
            type="button"
            id="tab-followup-queue"
            onClick={() => setActiveMainTab("queue")}
            className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              activeMainTab === "queue" 
                ? "bg-white text-blue-700 shadow-2xs font-bold" 
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>คิวงานติดตาม ({filteredQueueLeads.length})</span>
          </button>

          <button
            type="button"
            id="tab-followup-calendar"
            onClick={() => setActiveMainTab("calendar")}
            className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              activeMainTab === "calendar" 
                ? "bg-white text-indigo-700 shadow-2xs font-bold" 
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>ปฏิทินนัดหมาย</span>
          </button>

          <button
            type="button"
            id="tab-followup-performance"
            onClick={() => setActiveMainTab("performance")}
            className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              activeMainTab === "performance" 
                ? "bg-white text-emerald-700 shadow-2xs font-bold" 
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>สรุปผลงาน Sales</span>
          </button>
        </div>
      </div>

      {/* Main Tab: Work Queue View */}
      {activeMainTab === "queue" && (
        <div className="space-y-5">
          {/* 2. Top Summary Cards (4 Compact Cards) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Card 1: Overdue (เลยกำหนด) */}
            <button
              type="button"
              id="summary-card-overdue"
              onClick={() => setSelectedCategory(selectedCategory === "overdue" ? "all" : "overdue")}
              className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden group ${
                selectedCategory === "overdue"
                  ? "bg-rose-600 border-rose-600 text-white shadow-md ring-2 ring-rose-300"
                  : "bg-white border-rose-200 hover:border-rose-300 hover:bg-rose-50/30 shadow-xs"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold flex items-center gap-1.5 ${selectedCategory === "overdue" ? "text-white" : "text-rose-700"}`}>
                  <AlertTriangle className="w-4 h-4" /> เลยกำหนด (Overdue)
                </span>
                {summaryCounts.overdue > 0 && (
                  <span className={`w-2 h-2 rounded-full ${selectedCategory === "overdue" ? "bg-white animate-ping" : "bg-rose-500 animate-ping"}`} />
                )}
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className={`text-2xl font-black ${selectedCategory === "overdue" ? "text-white" : "text-rose-700"}`}>
                  {summaryCounts.overdue}
                </span>
                <span className={`text-[11px] font-medium ${selectedCategory === "overdue" ? "text-rose-100" : "text-rose-500"}`}>
                  รายการ
                </span>
              </div>
            </button>

            {/* Card 2: Today (ต้องติดตามวันนี้) */}
            <button
              type="button"
              id="summary-card-today"
              onClick={() => setSelectedCategory(selectedCategory === "today" ? "all" : "today")}
              className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden group ${
                selectedCategory === "today"
                  ? "bg-amber-500 border-amber-500 text-white shadow-md ring-2 ring-amber-300"
                  : "bg-white border-amber-200 hover:border-amber-300 hover:bg-amber-50/30 shadow-xs"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold flex items-center gap-1.5 ${selectedCategory === "today" ? "text-white" : "text-amber-800"}`}>
                  <Clock className="w-4 h-4" /> ต้องติดตามวันนี้
                </span>
                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${selectedCategory === "today" ? "bg-white/20 text-white" : "bg-amber-100 text-amber-800"}`}>
                  Today
                </span>
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className={`text-2xl font-black ${selectedCategory === "today" ? "text-white" : "text-amber-700"}`}>
                  {summaryCounts.today}
                </span>
                <span className={`text-[11px] font-medium ${selectedCategory === "today" ? "text-amber-100" : "text-amber-600"}`}>
                  รายการ
                </span>
              </div>
            </button>

            {/* Card 3: Upcoming (กำลังจะถึง) */}
            <button
              type="button"
              id="summary-card-upcoming"
              onClick={() => setSelectedCategory(selectedCategory === "upcoming" ? "all" : "upcoming")}
              className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden group ${
                selectedCategory === "upcoming"
                  ? "bg-blue-600 border-blue-600 text-white shadow-md ring-2 ring-blue-300"
                  : "bg-white border-blue-200 hover:border-blue-300 hover:bg-blue-50/30 shadow-xs"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold flex items-center gap-1.5 ${selectedCategory === "upcoming" ? "text-white" : "text-blue-700"}`}>
                  <Calendar className="w-4 h-4" /> กำลังจะถึง (Upcoming)
                </span>
                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${selectedCategory === "upcoming" ? "bg-white/20 text-white" : "bg-blue-100 text-blue-800"}`}>
                  Soon
                </span>
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className={`text-2xl font-black ${selectedCategory === "upcoming" ? "text-white" : "text-blue-700"}`}>
                  {summaryCounts.upcoming}
                </span>
                <span className={`text-[11px] font-medium ${selectedCategory === "upcoming" ? "text-blue-100" : "text-blue-500"}`}>
                  รายการ
                </span>
              </div>
            </button>

            {/* Card 4: Completed (ติดต่อแล้ว) */}
            <button
              type="button"
              id="summary-card-completed"
              onClick={() => setSelectedCategory(selectedCategory === "completed" ? "all" : "completed")}
              className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden group ${
                selectedCategory === "completed"
                  ? "bg-emerald-600 border-emerald-600 text-white shadow-md ring-2 ring-emerald-300"
                  : "bg-white border-emerald-200 hover:border-emerald-300 hover:bg-emerald-50/30 shadow-xs"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold flex items-center gap-1.5 ${selectedCategory === "completed" ? "text-white" : "text-emerald-700"}`}>
                  <CheckCircle2 className="w-4 h-4" /> ติดต่อแล้ว (Completed)
                </span>
                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${selectedCategory === "completed" ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-800"}`}>
                  Done
                </span>
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className={`text-2xl font-black ${selectedCategory === "completed" ? "text-white" : "text-emerald-700"}`}>
                  {summaryCounts.completed}
                </span>
                <span className={`text-[11px] font-medium ${selectedCategory === "completed" ? "text-emerald-100" : "text-emerald-600"}`}>
                  รายการ
                </span>
              </div>
            </button>
          </div>

          {/* 3. Compact Filter Bar */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              {/* Search Box */}
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  id="search-followup-input"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ค้นหาชื่อร้าน / ชื่อผู้ติดต่อ / เบอร์โทร / หมายเหตุ / แท็ก..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                />
              </div>

              {/* Filter Selectors */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {/* Salesperson Filter */}
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 font-semibold hidden md:inline">Sales:</span>
                  <select
                    id="filter-salesperson"
                    value={selectedSalesperson}
                    onChange={(e) => setSelectedSalesperson(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="all">ทีม Sales ทั้งหมด</option>
                    {allSalespersons.map((sp) => (
                      <option key={sp} value={sp}>{sp}</option>
                    ))}
                  </select>
                </div>

                {/* Pipeline Status Filter */}
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 font-semibold hidden md:inline">สถานะ:</span>
                  <select
                    id="filter-lead-status"
                    value={selectedLeadStatus}
                    onChange={(e) => setSelectedLeadStatus(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="all">ทุกสถานะ Pipeline</option>
                    <option value="new">🟡 Lead ใหม่</option>
                    <option value="contacted">🔵 ติดต่อแล้ว</option>
                    <option value="qualified">🟢 ผ่านเกณฑ์</option>
                    <option value="proposal">🟣 เสนอราคา/บริการ</option>
                    <option value="negotiation">🟠 รอพิจารณา/เจรจา</option>
                    <option value="registered">🌟 ลงทะเบียนสำเร็จ</option>
                    <option value="activated">🚀 เปิดพอร์ตใช้งาน</option>
                    <option value="won">🎉 ปิดการขาย (Won)</option>
                    <option value="lost">❌ ไม่สำเร็จ (Lost)</option>
                  </select>
                </div>

                {/* Priority Filter */}
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 font-semibold hidden md:inline">Priority:</span>
                  <select
                    id="filter-priority"
                    value={selectedPriority}
                    onChange={(e) => setSelectedPriority(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="all">ทุก Priority</option>
                    <option value="urgent">🔥 เร่งด่วน</option>
                    <option value="important">🟠 สำคัญ</option>
                    <option value="normal">⚪ ปกติ</option>
                  </select>
                </div>

                {/* Time Range Filter */}
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 font-semibold hidden md:inline">ช่วงเวลา:</span>
                  <select
                    id="filter-time-range"
                    value={selectedTimeRange}
                    onChange={(e) => setSelectedTimeRange(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="all">ทุกช่วงเวลา</option>
                    <option value="today">วันนี้</option>
                    <option value="tomorrow">พรุ่งนี้</option>
                    <option value="next_7_days">7 วันข้างหน้า</option>
                    <option value="this_month">เดือนนี้</option>
                  </select>
                </div>

                {/* Reset Filters Button */}
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold transition-colors cursor-pointer flex items-center gap-1"
                    title="ล้างตัวกรองทั้งหมด"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>ล้างตัวกรอง</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 4. Filtered Queue Sections */}
          <div className="space-y-6">
            {/* If a single category filter is active (e.g. Overdue, Today, Upcoming, Completed) */}
            {selectedCategory !== "all" ? (
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3.5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                      {selectedCategory === "overdue" && <span>🔴 รายการที่เลยกำหนด (Overdue Tasks)</span>}
                      {selectedCategory === "today" && <span>📞 งานที่ต้องทำวันนี้ (Today's Tasks)</span>}
                      {selectedCategory === "upcoming" && <span>⏳ งานที่กำลังจะถึง (Upcoming Tasks)</span>}
                      {selectedCategory === "completed" && <span>✅ รายการที่ติดต่อแล้ว (Completed Tasks)</span>}
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                      {filteredQueueLeads.length} รายการ
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedCategory("all")}
                    className="text-xs text-blue-600 hover:text-blue-800 font-bold cursor-pointer"
                  >
                    ดูทุกหมวดหมู่ →
                  </button>
                </div>

                <div className="space-y-2.5">
                  {filteredQueueLeads.length > 0 ? (
                    filteredQueueLeads.map(lead => (
                      <FollowUpCard
                        key={lead.id}
                        lead={lead}
                        onSelectLead={onSelectLead}
                        onOpenOutcomeModal={setOutcomeModalLead}
                        onOpenSnoozeModal={setSnoozeModalLead}
                      />
                    ))
                  ) : (
                    <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-100 space-y-1.5">
                      <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                      <p className="font-bold text-slate-700 text-sm">ไม่มีรายการในหมวดหมู่นี้</p>
                      <p className="text-xs text-slate-400">รายการที่ตรงกับเงื่อนไขการค้นหาจะแสดงที่นี่</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* If "ALL" Category is active: Display Sections in Prioritized Sequence (Overdue -> Today -> Upcoming -> Completed) */
              <div className="space-y-6">
                {/* Section 1: 🔴 Overdue (เลยกำหนด) - Highlighted Prominently */}
                {groupedSections.overdue.length > 0 && (
                  <div className="bg-rose-50/40 p-5 rounded-2xl border border-rose-200 shadow-xs space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-rose-200/60">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-rose-600 text-white rounded-lg">
                          <AlertTriangle className="w-4 h-4" />
                        </div>
                        <h3 className="font-bold text-rose-900 text-base">
                          งานที่เลยกำหนดติดตาม (Overdue Tasks)
                        </h3>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-600 text-white animate-pulse">
                          {groupedSections.overdue.length} รายการ
                        </span>
                      </div>
                      <span className="text-xs text-rose-600 font-semibold">⚠️ แนะนำให้ติดต่อก่อน</span>
                    </div>

                    <div className="space-y-2.5">
                      {groupedSections.overdue.map(lead => (
                        <FollowUpCard
                          key={lead.id}
                          lead={lead}
                          onSelectLead={onSelectLead}
                          onOpenOutcomeModal={setOutcomeModalLead}
                          onOpenSnoozeModal={setSnoozeModalLead}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Section 2: 📞 Today's Tasks (งานที่ต้องทำวันนี้) */}
                <div className="bg-white p-5 rounded-2xl border border-amber-200/80 shadow-xs space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-amber-500 text-white rounded-lg">
                        <PhoneCall className="w-4 h-4" />
                      </div>
                      <h3 className="font-bold text-slate-900 text-base">
                        งานที่ต้องทำวันนี้ (Today's Tasks)
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900">
                        {groupedSections.today.length} รายการ
                      </span>
                    </div>
                    <span className="text-xs text-slate-400 font-medium">
                      ประจำวันที่ {new Date().toLocaleDateString("th-TH")}
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {groupedSections.today.length > 0 ? (
                      groupedSections.today.map(lead => (
                        <FollowUpCard
                          key={lead.id}
                          lead={lead}
                          onSelectLead={onSelectLead}
                          onOpenOutcomeModal={setOutcomeModalLead}
                          onOpenSnoozeModal={setSnoozeModalLead}
                        />
                      ))
                    ) : (
                      <div className="p-6 text-center bg-slate-50/80 rounded-2xl border border-slate-100 space-y-1">
                        <CheckCircle2 className="w-7 h-7 text-emerald-500 mx-auto" />
                        <p className="font-bold text-slate-700 text-sm">วันนี้ไม่มีรายการที่ต้องติดตาม 🎉</p>
                        <p className="text-xs text-slate-400">คุณสามารถตั้งเวลาโทรติดตามใหม่ได้ในหน้ารายละเอียดของลูกค้า</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Section 3: ⏳ Upcoming Tasks (งานที่กำลังจะถึง) */}
                {groupedSections.upcoming.length > 0 && (
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-blue-600 text-white rounded-lg">
                          <Calendar className="w-4 h-4" />
                        </div>
                        <h3 className="font-bold text-slate-900 text-base">
                          งานที่กำลังจะถึง (Upcoming Tasks)
                        </h3>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                          {groupedSections.upcoming.length} รายการ
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      {groupedSections.upcoming.map(lead => (
                        <FollowUpCard
                          key={lead.id}
                          lead={lead}
                          onSelectLead={onSelectLead}
                          onOpenOutcomeModal={setOutcomeModalLead}
                          onOpenSnoozeModal={setSnoozeModalLead}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Section 4: ✅ Completed Tasks (ติดต่อแล้ว) - Collapsible */}
                {groupedSections.completed.length > 0 && (
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                    <button
                      type="button"
                      onClick={() => setIsCompletedSectionOpen(!isCompletedSectionOpen)}
                      className="w-full flex items-center justify-between cursor-pointer text-left pb-2 border-b border-slate-100"
                    >
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-emerald-600 text-white rounded-lg">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                        <h3 className="font-bold text-slate-900 text-base">
                          รายการที่ติดต่อแล้ว (Completed Tasks)
                        </h3>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                          {groupedSections.completed.length} รายการ
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold">
                        <span>{isCompletedSectionOpen ? "ย่อรายการ" : "ขยายดูทั้งหมด"}</span>
                        {isCompletedSectionOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </button>

                    {isCompletedSectionOpen && (
                      <div className="space-y-2.5 pt-1">
                        {groupedSections.completed.map(lead => (
                          <FollowUpCard
                            key={lead.id}
                            lead={lead}
                            onSelectLead={onSelectLead}
                            onOpenOutcomeModal={setOutcomeModalLead}
                            onOpenSnoozeModal={setSnoozeModalLead}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Tab: Monthly Calendar View */}
      {activeMainTab === "calendar" && (
        <MonthlyCalendar
          leads={leads}
          onSelectLead={onSelectLead}
          onUpdateLead={onUpdateLead}
          title="ปฏิทินนัดหมายติดตามลูกค้า (Monthly Follow-up Calendar)"
        />
      )}

      {/* Main Tab: Performance Report View */}
      {activeMainTab === "performance" && (
        <FollowUpPerformanceView
          leads={leads}
          salespersons={allSalespersons}
        />
      )}

      {/* Outcome Recording Modal */}
      {outcomeModalLead && (
        <FollowUpOutcomeModal
          lead={outcomeModalLead}
          isOpen={true}
          onClose={() => setOutcomeModalLead(null)}
          onUpdateLead={onUpdateLead}
          onAddNote={onAddNote}
          currentUser={currentUser}
          salespersons={allSalespersons}
        />
      )}

      {/* Quick Snooze Modal */}
      {snoozeModalLead && (
        <QuickSnoozeModal
          lead={snoozeModalLead}
          isOpen={true}
          onClose={() => setSnoozeModalLead(null)}
          onUpdateLead={onUpdateLead}
          currentUser={currentUser}
        />
      )}
    </div>
  );
}
