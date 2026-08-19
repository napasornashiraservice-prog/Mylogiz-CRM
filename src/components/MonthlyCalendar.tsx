import React, { useState } from "react";
import { Lead, StatusLabels } from "../types";
import { 
  PhoneCall, Calendar, Clock, CheckCircle, AlertCircle, 
  Search, ExternalLink, ChevronLeft, ChevronRight, 
  CalendarDays, List, User, MapPin
} from "lucide-react";
import { motion } from "motion/react";

interface MonthlyCalendarProps {
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
  onUpdateLead?: (lead: Lead) => void;
  title?: string;
}

const THAI_MONTHS = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
];

const THAI_DAYS = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];
const THAI_DAYS_SHORT = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];

export default function MonthlyCalendar({ leads, onSelectLead, onUpdateLead, title = "ปฏิทิน & แจ้งเตือนนัดหมายติดตามลูกค้า" }: MonthlyCalendarProps) {
  // Mode switcher: "month" | "day" | "list"
  const [viewMode, setViewMode] = useState<"month" | "day" | "list">("month");

  // Date States
  const todayObj = new Date();
  const todayStr = todayObj.toISOString().split("T")[0];

  const [currentYear, setCurrentYear] = useState<number>(todayObj.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(todayObj.getMonth()); // 0-11
  const [selectedDayStr, setSelectedDayStr] = useState<string>(todayStr);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "overdue" | "today" | "completed">("all");
  const [tabFilter, setTabFilter] = useState<"pending" | "completed">("pending");

  // Filter leads with valid followUp date
  const followUpLeads = leads.filter(l => l.followUp && l.followUp.date);

  // Map leads by date for fast calendar lookups
  const leadsByDate = followUpLeads.reduce<Record<string, Lead[]>>((acc, lead) => {
    const d = lead.followUp.date;
    if (!acc[d]) acc[d] = [];
    acc[d].push(lead);
    return acc;
  }, {});

  // Category counts
  const pendingCount = followUpLeads.filter(l => !l.followUp.isCompleted).length;
  const completedCount = followUpLeads.filter(l => l.followUp.isCompleted).length;
  const overdueCount = followUpLeads.filter(l => !l.followUp.isCompleted && l.followUp.date < todayStr).length;
  const todayCount = followUpLeads.filter(l => !l.followUp.isCompleted && l.followUp.date === todayStr).length;

  // Toggle completion
  const handleToggleComplete = (lead: Lead, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!onUpdateLead) return;
    onUpdateLead({
      ...lead,
      followUp: {
        ...lead.followUp,
        isCompleted: !lead.followUp.isCompleted
      }
    });
  };

  // Calendar Math
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay(); // 0 = Sun
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

  const prevMonthDaysToShow = firstDayOfWeek;
  const totalCells = Math.ceil((prevMonthDaysToShow + daysInMonth) / 7) * 7;

  // Month navigation
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  const handleGoToday = () => {
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth());
    setSelectedDayStr(todayStr);
  };

  // Format Date for Thai UI
  const formatThaiDate = (dateStr: string) => {
    if (!dateStr) return "";
    const [y, m, d] = dateStr.split("-").map(Number);
    if (!y || !m || !d) return dateStr;
    const dateObj = new Date(y, m - 1, d);
    const dayName = THAI_DAYS[dateObj.getDay()];
    const monthName = THAI_MONTHS[m - 1];
    const thaiYear = y + 543;
    return `วัน${dayName}ที่ ${d} ${monthName} ${thaiYear}`;
  };

  // Filtered list for "List View"
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

  // Daily leads for selectedDayStr
  const dailyLeads = (leadsByDate[selectedDayStr] || []).filter(l => {
    if (!searchQuery) return true;
    return (
      l.shopName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.contactName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.phone.includes(searchQuery)
    );
  }).sort((a, b) => (a.followUp.time || "00:00").localeCompare(b.followUp.time || "00:00"));

  const dailyPending = dailyLeads.filter(l => !l.followUp.isCompleted).length;
  const dailyCompleted = dailyLeads.filter(l => l.followUp.isCompleted).length;

  return (
    <div className="space-y-6" id="dashboard-monthly-calendar-container">
      {/* 1. Header & Navigation Modes */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <span className="p-2.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
            <CalendarDays className="w-5 h-5" />
          </span>
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">{title}</h2>
            <p className="text-xs text-slate-500 mt-0.5">ตารางนัดหมายติดตามลูกค้าขนส่ง อัปเดตแจ้งเตือนเรียลไทม์</p>
          </div>
        </div>

        {/* View mode buttons */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
          <button
            id="dashboard-calendar-mode-month"
            onClick={() => setViewMode("month")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === "month" 
                ? "bg-white text-blue-700 shadow-xs" 
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            <span>ปฏิทินรายเดือน</span>
          </button>
          <button
            id="dashboard-calendar-mode-day"
            onClick={() => setViewMode("day")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === "day" 
                ? "bg-white text-blue-700 shadow-xs" 
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>ตารางรายวัน</span>
            {todayCount > 0 && (
              <span className="bg-amber-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold ml-0.5">
                {todayCount}
              </span>
            )}
          </button>
          <button
            id="dashboard-calendar-mode-list"
            onClick={() => setViewMode("list")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === "list" 
                ? "bg-white text-blue-700 shadow-xs" 
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <List className="w-4 h-4" />
            <span>รายการทั้งหมด</span>
          </button>
        </div>
      </div>

      {/* 2. Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div 
          id="dashboard-calendar-overdue-card" 
          onClick={() => { setViewMode("list"); setTabFilter("pending"); setStatusFilter("overdue"); }}
          className="bg-red-50 hover:bg-red-100/80 transition-all p-4 rounded-xl border border-red-200/80 flex items-center justify-between cursor-pointer"
        >
          <div>
            <span className="text-red-800 text-xs font-semibold flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 text-red-600" /> เลยกำหนดค้างโทร
            </span>
            <div className="text-2xl font-black text-red-950 font-mono tracking-tight mt-1">{overdueCount} ราย</div>
            <p className="text-[10px] text-red-600 mt-0.5">คลิกเพื่อดูรายการเกินกำหนดทั้งหมด</p>
          </div>
          <div className="w-10 h-10 bg-red-200/60 text-red-700 rounded-xl flex items-center justify-center font-bold">
            ⚠️
          </div>
        </div>

        <div 
          id="dashboard-calendar-today-card" 
          onClick={() => { setSelectedDayStr(todayStr); setViewMode("day"); }}
          className="bg-amber-50 hover:bg-amber-100/80 transition-all p-4 rounded-xl border border-amber-200/80 flex items-center justify-between cursor-pointer"
        >
          <div>
            <span className="text-amber-800 text-xs font-semibold flex items-center gap-1">
              <PhoneCall className="w-3.5 h-3.5 text-amber-600" /> นัดหมายโทรวันนี้
            </span>
            <div className="text-2xl font-black text-amber-950 font-mono tracking-tight mt-1">{todayCount} ราย</div>
            <p className="text-[10px] text-amber-600 mt-0.5">คลิกเพื่อเปิดตารางรายวันของวันนี้</p>
          </div>
          <div className="w-10 h-10 bg-amber-200/60 text-amber-700 rounded-xl flex items-center justify-center font-bold animate-pulse">
            📞
          </div>
        </div>

        <div 
          id="dashboard-calendar-completed-card" 
          onClick={() => { setViewMode("list"); setTabFilter("completed"); setStatusFilter("all"); }}
          className="bg-emerald-50 hover:bg-emerald-100/80 transition-all p-4 rounded-xl border border-emerald-200/80 flex items-center justify-between cursor-pointer"
        >
          <div>
            <span className="text-emerald-800 text-xs font-semibold flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> โทรติดตามเสร็จแล้ว
            </span>
            <div className="text-2xl font-black text-emerald-950 font-mono tracking-tight mt-1">{completedCount} ราย</div>
            <p className="text-[10px] text-emerald-600 mt-0.5">บันทึกผลเรียบร้อย</p>
          </div>
          <div className="w-10 h-10 bg-emerald-200/60 text-emerald-700 rounded-xl flex items-center justify-center font-bold">
            ✓
          </div>
        </div>
      </div>

      {/* 3. MONTHLY CALENDAR VIEW */}
      {viewMode === "month" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden" id="dashboard-monthly-calendar-grid shadow-sm">
          {/* Calendar Controller Bar */}
          <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50">
            
            {/* Month & Year Title */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <button
                  id="dashboard-calendar-prev-month"
                  onClick={handlePrevMonth}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 cursor-pointer"
                  title="เดือนก่อนหน้า"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  id="dashboard-calendar-next-month"
                  onClick={handleNextMonth}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 cursor-pointer"
                  title="เดือนถัดไป"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <h3 className="text-lg font-extrabold text-slate-800">
                {THAI_MONTHS[currentMonth]} {currentYear + 543}
              </h3>
              <button
                id="dashboard-calendar-today-btn"
                onClick={handleGoToday}
                className="px-2.5 py-1 text-xs font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg border border-blue-200 cursor-pointer"
              >
                วันนี้
              </button>
            </div>

            {/* Quick Status Legend */}
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5 text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                <span>เลยกำหนด</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                <span>โทรวันนี้</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                <span>นัดล่วงหน้า</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <span>เสร็จแล้ว</span>
              </div>
            </div>

          </div>

          {/* Days of Week Header */}
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-100/70 text-slate-600 text-xs font-bold text-center py-2.5">
            {THAI_DAYS_SHORT.map((day, idx) => (
              <div key={day} className={idx === 0 || idx === 6 ? "text-rose-600" : ""}>
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid Cells */}
          <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 bg-slate-100/30">
            {Array.from({ length: totalCells }).map((_, index) => {
              let cellYear = currentYear;
              let cellMonth = currentMonth;
              let cellDay = 0;
              let isCurrentMonth = true;

              if (index < prevMonthDaysToShow) {
                isCurrentMonth = false;
                cellDay = daysInPrevMonth - (prevMonthDaysToShow - 1 - index);
                cellMonth = currentMonth === 0 ? 11 : currentMonth - 1;
                if (currentMonth === 0) cellYear--;
              } else if (index >= prevMonthDaysToShow + daysInMonth) {
                isCurrentMonth = false;
                cellDay = index - (prevMonthDaysToShow + daysInMonth) + 1;
                cellMonth = currentMonth === 11 ? 0 : currentMonth + 1;
                if (currentMonth === 11) cellYear++;
              } else {
                cellDay = index - prevMonthDaysToShow + 1;
              }

              const formattedCellDayStr = String(cellDay).padStart(2, "0");
              const formattedCellMonthStr = String(cellMonth + 1).padStart(2, "0");
              const dateKey = `${cellYear}-${formattedCellMonthStr}-${formattedCellDayStr}`;

              const isToday = dateKey === todayStr;
              const isSelected = dateKey === selectedDayStr;
              const dayLeads = leadsByDate[dateKey] || [];

              return (
                <div
                  key={dateKey}
                  id={`dashboard-calendar-cell-${dateKey}`}
                  onClick={() => {
                    setSelectedDayStr(dateKey);
                    setViewMode("day");
                  }}
                  className={`min-h-[115px] p-1.5 sm:p-2 transition-all cursor-pointer flex flex-col justify-between group ${
                    isCurrentMonth ? "bg-white hover:bg-blue-50/30" : "bg-slate-50/80 text-slate-400 opacity-60"
                  } ${isToday ? "ring-2 ring-blue-500 ring-inset bg-blue-50/20" : ""} ${isSelected ? "border-2 border-blue-600" : ""}`}
                >
                  {/* Top Bar inside day cell */}
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-xs font-bold inline-flex items-center justify-center w-6 h-6 rounded-full font-mono ${
                        isToday 
                          ? "bg-blue-600 text-white shadow-xs" 
                          : isCurrentMonth ? "text-slate-800 group-hover:text-blue-600" : "text-slate-400"
                      }`}
                    >
                      {cellDay}
                    </span>

                    {dayLeads.length > 0 && (
                      <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded-full font-mono font-bold">
                        {dayLeads.length} งาน
                      </span>
                    )}
                  </div>

                  {/* List of Notification Badges for this day */}
                  <div className="space-y-1 flex-1 overflow-hidden">
                    {dayLeads.slice(0, 3).map((lead) => {
                      const isCompleted = lead.followUp.isCompleted;
                      const isOverdue = !isCompleted && lead.followUp.date < todayStr;
                      const isTodayLead = !isCompleted && lead.followUp.date === todayStr;

                      let badgeStyle = "bg-blue-50 text-blue-800 border-blue-200";
                      if (isCompleted) {
                        badgeStyle = "bg-emerald-50 text-emerald-800 border-emerald-200 line-through opacity-70";
                      } else if (isOverdue) {
                        badgeStyle = "bg-red-100 text-red-900 border-red-300 font-bold";
                      } else if (isTodayLead) {
                        badgeStyle = "bg-amber-100 text-amber-900 border-amber-300 font-bold";
                      }

                      return (
                        <div
                          key={lead.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectLead(lead);
                          }}
                          className={`text-[10px] px-1.5 py-1 rounded-md border truncate flex items-center justify-between gap-1 transition-transform hover:scale-[1.02] cursor-pointer ${badgeStyle}`}
                          title={`${lead.shopName} (${lead.followUp.time || "10:00"} น.)`}
                        >
                          <span className="truncate font-medium">
                            {lead.followUp.time ? `${lead.followUp.time} ` : ""}{lead.shopName}
                          </span>
                          {isCompleted ? (
                            <CheckCircle className="w-3 h-3 text-emerald-600 shrink-0" />
                          ) : isOverdue ? (
                            <AlertCircle className="w-3 h-3 text-red-600 shrink-0" />
                          ) : isTodayLead ? (
                            <PhoneCall className="w-3 h-3 text-amber-600 shrink-0" />
                          ) : null}
                        </div>
                      );
                    })}

                    {dayLeads.length > 3 && (
                      <div className="text-[9px] text-blue-600 font-bold text-center pt-0.5">
                        +{dayLeads.length - 3} รายการเพิ่มเติม
                      </div>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. DAILY SCHEDULE VIEW */}
      {viewMode === "day" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-6" id="dashboard-daily-schedule-section">
          {/* Date Picker Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center gap-3">
              <button
                id="dashboard-daily-prev-day"
                onClick={() => {
                  const d = new Date(selectedDayStr);
                  d.setDate(d.getDate() - 1);
                  setSelectedDayStr(d.toISOString().split("T")[0]);
                }}
                className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 cursor-pointer"
                title="วันก่อนหน้า"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="space-y-0.5">
                <span className="text-xs text-slate-400 font-semibold block">วันนัดหมายที่เลือก:</span>
                <h3 className="text-lg font-bold text-blue-700">
                  {formatThaiDate(selectedDayStr)}
                  {selectedDayStr === todayStr && (
                    <span className="ml-2 text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold">
                      วันนี้
                    </span>
                  )}
                </h3>
              </div>

              <button
                id="dashboard-daily-next-day"
                onClick={() => {
                  const d = new Date(selectedDayStr);
                  d.setDate(d.getDate() + 1);
                  setSelectedDayStr(d.toISOString().split("T")[0]);
                }}
                className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 cursor-pointer"
                title="วันถัดไป"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Picker & Actions */}
            <div className="flex items-center gap-2">
              <input
                id="dashboard-daily-date-picker"
                type="date"
                value={selectedDayStr}
                onChange={(e) => setSelectedDayStr(e.target.value)}
                className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
              />
              <button
                id="dashboard-daily-today-btn"
                onClick={() => setSelectedDayStr(todayStr)}
                className="px-3 py-1.5 text-xs font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer shrink-0"
              >
                กลับมาวันนี้
              </button>
            </div>
          </div>

          {/* Daily Summary stats */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs bg-blue-50/50 p-3.5 rounded-xl border border-blue-100 text-slate-700">
            <div className="flex items-center gap-4">
              <span>นัดหมายรวม: <strong className="font-mono text-blue-700 font-bold">{dailyLeads.length}</strong> ราย</span>
              <span>รอดำเนินการ: <strong className="font-mono text-amber-700 font-bold">{dailyPending}</strong> ราย</span>
              <span>เสร็จแล้ว: <strong className="font-mono text-emerald-700 font-bold">{dailyCompleted}</strong> ราย</span>
            </div>
            <div className="text-slate-400 text-[11px]">
              * คลิกที่รายการเพื่อดูประวัติร้านค้าและบันทึกผลการโทร
            </div>
          </div>

          {/* List of Time Slotted Appointments for this day */}
          <div className="space-y-3">
            {dailyLeads.length === 0 ? (
              <div className="py-16 text-center text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200 space-y-2">
                <CalendarDays className="w-10 h-10 mx-auto text-slate-300" />
                <p className="text-sm font-medium text-slate-600">ไม่มีนัดหมายติดตามโทรสำหรับวันที่ {selectedDayStr}</p>
                <p className="text-xs text-slate-400">ท่านสามารถเลือกวันอื่นๆ ในปฏิทิน เพื่อสลับดูนัดหมายล่วงหน้า</p>
              </div>
            ) : (
              dailyLeads.map((lead) => {
                const isCompleted = lead.followUp.isCompleted;
                const isOverdue = !isCompleted && lead.followUp.date < todayStr;
                const isTodayLead = !isCompleted && lead.followUp.date === todayStr;

                return (
                  <motion.div
                    key={lead.id}
                    id={`dashboard-daily-lead-card-${lead.id}`}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => onSelectLead(lead)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                      isCompleted 
                        ? "bg-slate-50 border-slate-200 opacity-75" 
                        : isOverdue 
                        ? "bg-red-50/40 border-red-200 hover:bg-red-50" 
                        : isTodayLead 
                        ? "bg-amber-50/40 border-amber-200 hover:bg-amber-50" 
                        : "bg-white border-slate-200 hover:border-blue-300 shadow-2xs"
                    }`}
                  >
                    {/* Time & Main Details */}
                    <div className="flex items-start gap-4 min-w-0">
                      <div className="flex flex-col items-center justify-center p-2.5 rounded-lg bg-slate-100 border border-slate-200 shrink-0 font-mono text-center min-w-[70px]">
                        <Clock className="w-4 h-4 text-slate-500 mb-0.5" />
                        <span className="text-xs font-bold text-slate-800">{lead.followUp.time || "10:00"}</span>
                        <span className="text-[9px] text-slate-400">น.</span>
                      </div>

                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-bold text-slate-900 truncate">{lead.shopName}</h4>
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-medium">
                            {StatusLabels[lead.status]}
                          </span>
                          {isCompleted ? (
                            <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                              ✓ โทรเรียบร้อย
                            </span>
                          ) : isOverdue ? (
                            <span className="text-[10px] bg-red-100 text-red-800 px-2 py-0.5 rounded-full font-bold">
                              ⚠️ เลยกำหนด
                            </span>
                          ) : isTodayLead ? (
                            <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold animate-pulse">
                              🔴 ต้องโทรวันนี้
                            </span>
                          ) : null}
                        </div>

                        <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                          <span className="flex items-center gap-1">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            {lead.contactName || "ไม่ระบุชื่อ"}
                          </span>
                          <span className="flex items-center gap-1 font-mono text-blue-700 font-medium">
                            <PhoneCall className="w-3.5 h-3.5 text-slate-400" />
                            {lead.phone}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            {lead.province}
                          </span>
                        </div>

                        {lead.followUp.note && (
                          <p className="text-xs bg-slate-50 p-2 rounded-lg border border-slate-100 text-slate-600 italic mt-1">
                            "{lead.followUp.note}"
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0 sm:self-center" onClick={(e) => e.stopPropagation()}>
                      <a
                        href={`tel:${lead.phone}`}
                        className="p-2 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 flex items-center gap-1 text-xs font-bold transition-colors"
                        title="โทรหากลุ่มนี้"
                      >
                        <PhoneCall className="w-4 h-4" />
                        <span className="hidden md:inline">โทรทันที</span>
                      </a>

                      {onUpdateLead && (
                        <button
                          id={`dashboard-daily-toggle-complete-${lead.id}`}
                          onClick={(e) => handleToggleComplete(lead, e)}
                          className={`p-2 rounded-lg border flex items-center gap-1.5 text-xs font-bold transition-colors cursor-pointer ${
                            isCompleted 
                              ? "bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200" 
                              : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          <CheckCircle className="w-4 h-4 text-emerald-600" />
                          <span>{isCompleted ? "โทรแล้ว" : "เสร็จสิ้น"}</span>
                        </button>
                      )}

                      <button
                        id={`dashboard-daily-open-details-${lead.id}`}
                        onClick={() => onSelectLead(lead)}
                        className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-blue-600"
                        title="ดูรายละเอียดลูกค้า"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* 5. LIST VIEW TABLE */}
      {viewMode === "list" && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4" id="dashboard-calendar-list-section">
          {/* Controls: Tabs & Search */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            
            <div className="flex items-center gap-2 flex-wrap">
              <div className="bg-slate-100 p-0.5 rounded-lg flex border border-slate-200">
                <button
                  id="dashboard-calendar-tab-pending"
                  onClick={() => setTabFilter("pending")}
                  className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                    tabFilter === "pending" ? "bg-white text-blue-700 shadow-xs" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  คิวต้องโทร ({pendingCount})
                </button>
                <button
                  id="dashboard-calendar-tab-completed"
                  onClick={() => setTabFilter("completed")}
                  className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                    tabFilter === "completed" ? "bg-white text-blue-700 shadow-xs" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  ประวัติโทรแล้ว ({completedCount})
                </button>
              </div>

              {/* Status dropdown filter */}
              <select
                id="dashboard-calendar-status-filter"
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
                id="dashboard-calendar-search-input"
                type="text"
                placeholder="ค้นหาชื่อร้าน, เบอร์โทร..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800"
              />
            </div>

          </div>

          {/* Schedule Queue List table */}
          <div className="overflow-x-auto pt-1">
            <table id="dashboard-calendar-list-table" className="w-full text-left border-collapse text-xs">
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
                      id={`dashboard-calendar-row-${lead.id}`}
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
                      <td className="p-3.5 text-slate-600 font-mono">{lead.phone}</td>
                      <td className="p-3.5 text-slate-500 font-medium">
                        {StatusLabels[lead.status]}
                      </td>
                      <td className="p-3.5 text-slate-500">{lead.salesPerson}</td>
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-2" onClick={(e) => e.stopPropagation()}>
                          {onUpdateLead && (
                            <button
                              id={`dashboard-calendar-complete-btn-${lead.id}`}
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
                          )}
                          <button
                            id={`dashboard-calendar-details-btn-${lead.id}`}
                            onClick={() => onSelectLead(lead)}
                            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-blue-600 cursor-pointer"
                            title="ดูข้อมูลละเอียดเพื่อโทรคุย"
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
      )}

    </div>
  );
}
