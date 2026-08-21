import React, { useState, useMemo } from "react";
import { Lead, LeadStatus, StatusLabels, REJECTION_REASONS, WON_REASONS } from "../types";
import { 
  CheckCircle2, XCircle, TrendingUp, Users, Filter, 
  Calendar, ChevronRight, Info, Sparkles, HelpCircle, 
  BarChart3, Award, ExternalLink, X, Eye, FileText, ArrowRight
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface WinLossReasonAnalysisProps {
  leads: Lead[];
  salespersons?: string[];
  currentUser?: string | null;
  onSelectLead?: (lead: Lead) => void;
}

export type WinLossDateFilter = "all" | "this_month" | "last_month" | "this_year" | "custom";

interface ReasonStatItem {
  reason: string;
  count: number;
  percentage: number;
  leads: Lead[];
  otherDetails: { shopName: string; text: string; salesPerson?: string; date?: string; lead: Lead }[];
}

export default function WinLossReasonAnalysis({
  leads,
  salespersons = [],
  currentUser = null,
  onSelectLead
}: WinLossReasonAnalysisProps) {
  // Filter States
  const [dateFilter, setDateFilter] = useState<WinLossDateFilter>("all");
  const [selectedSalesperson, setSelectedSalesperson] = useState<string>("all");

  const todayStr = new Date().toISOString().split("T")[0];
  const currentMonthStr = new Date().toISOString().substring(0, 7); // YYYY-MM
  const currentYearStr = new Date().toISOString().substring(0, 4); // YYYY

  const lastMonthDate = new Date();
  lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
  const lastMonthStr = lastMonthDate.toISOString().substring(0, 7);

  // Custom date range state
  const [customStartDate, setCustomStartDate] = useState<string>(`${currentMonthStr}-01`);
  const [customEndDate, setCustomEndDate] = useState<string>(todayStr);

  // Drilldown modal state
  const [selectedReasonForModal, setSelectedReasonForModal] = useState<{
    type: "won" | "lost";
    stat: ReasonStatItem;
  } | null>(null);

  // Extract all unique salespersons from leads
  const allSalespersons = useMemo(() => {
    const fromProps = salespersons || [];
    const fromLeads = leads.map(l => l.salesPerson).filter(Boolean) as string[];
    return Array.from(new Set([...fromProps, ...fromLeads])).sort();
  }, [salespersons, leads]);

  // Filter Leads by Date & Salesperson
  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      // Salesperson filter
      if (selectedSalesperson !== "all" && lead.salesPerson !== selectedSalesperson) {
        return false;
      }

      // Determine relevant date for the lead (prefer action dates registeredDate/lostDate, then createdAt)
      const leadDate = (lead.registeredDate || lead.lostDate || lead.updatedAt || lead.createdAt || "").split("T")[0];

      // Date filter
      if (dateFilter === "this_month") {
        if (!leadDate.startsWith(currentMonthStr)) return false;
      } else if (dateFilter === "last_month") {
        if (!leadDate.startsWith(lastMonthStr)) return false;
      } else if (dateFilter === "this_year") {
        if (!leadDate.startsWith(currentYearStr)) return false;
      } else if (dateFilter === "custom") {
        if (customStartDate && leadDate < customStartDate) return false;
        if (customEndDate && leadDate > customEndDate) return false;
      }

      return true;
    });
  }, [leads, selectedSalesperson, dateFilter, currentMonthStr, lastMonthStr, currentYearStr, customStartDate, customEndDate]);

  // Classify Won vs Rejected Leads
  const { wonLeads, rejectedLeads, otherLeads } = useMemo(() => {
    const won: Lead[] = [];
    const rejected: Lead[] = [];
    const other: Lead[] = [];

    filteredLeads.forEach(lead => {
      const isWon = lead.status === LeadStatus.REGISTERED || 
                    lead.status === LeadStatus.ACTIVATED || 
                    lead.status === LeadStatus.REGULAR ||
                    Boolean(lead.wonReason);

      const isRejected = lead.status === LeadStatus.NOT_INTERESTED || 
                         lead.status === LeadStatus.LOST ||
                         Boolean(lead.lostReason);

      if (isWon) {
        won.push(lead);
      } else if (isRejected) {
        rejected.push(lead);
      } else {
        other.push(lead);
      }
    });

    return { wonLeads: won, rejectedLeads: rejected, otherLeads: other };
  }, [filteredLeads]);

  // KPI Calculations
  const totalLeadsCount = filteredLeads.length;
  const wonCount = wonLeads.length;
  const rejectedCount = rejectedLeads.length;
  const decidedCount = wonCount + rejectedCount; // Leads with definitive Won or Rejected outcome

  // Conversion Rate Formula:
  // Conversion Rate = จำนวน Lead ที่ปิดการขายได้ ÷ จำนวน Lead ที่มีสถานะปิดการขายหรือปฏิเสธ × 100
  const conversionRate = decidedCount > 0 
    ? ((wonCount / decidedCount) * 100) 
    : 0;

  // Conversion Rate against all active leads in filter
  const overallConversionRate = totalLeadsCount > 0 
    ? ((wonCount / totalLeadsCount) * 100) 
    : 0;

  // Process Won Reasons Breakdown
  const wonReasonStats = useMemo<ReasonStatItem[]>(() => {
    if (wonCount === 0) return [];

    const map: Record<string, { count: number; leads: Lead[]; otherDetails: { shopName: string; text: string; salesPerson?: string; date?: string; lead: Lead }[] }> = {};

    wonLeads.forEach(lead => {
      let r = lead.wonReason?.trim();
      if (!r) {
        r = "ไม่ได้ระบุสาเหตุชัดเจน";
      }

      if (!map[r]) {
        map[r] = { count: 0, leads: [], otherDetails: [] };
      }
      map[r].count += 1;
      map[r].leads.push(lead);

      if (lead.wonReasonOther) {
        map[r].otherDetails.push({
          shopName: lead.shopName,
          text: lead.wonReasonOther,
          salesPerson: lead.salesPerson,
          date: lead.registeredDate || lead.updatedAt,
          lead
        });
      }
    });

    return Object.entries(map)
      .map(([reason, data]) => ({
        reason,
        count: data.count,
        percentage: Math.round((data.count / wonCount) * 1000) / 10,
        leads: data.leads,
        otherDetails: data.otherDetails
      }))
      .sort((a, b) => b.count - a.count);
  }, [wonLeads, wonCount]);

  // Process Rejected Reasons Breakdown
  const rejectedReasonStats = useMemo<ReasonStatItem[]>(() => {
    if (rejectedCount === 0) return [];

    const map: Record<string, { count: number; leads: Lead[]; otherDetails: { shopName: string; text: string; salesPerson?: string; date?: string; lead: Lead }[] }> = {};

    rejectedLeads.forEach(lead => {
      let r = lead.lostReason?.trim();
      if (!r) {
        r = "ไม่ได้ระบุสาเหตุชัดเจน";
      }

      if (!map[r]) {
        map[r] = { count: 0, leads: [], otherDetails: [] };
      }
      map[r].count += 1;
      map[r].leads.push(lead);

      if (lead.lostReasonOther) {
        map[r].otherDetails.push({
          shopName: lead.shopName,
          text: lead.lostReasonOther,
          salesPerson: lead.salesPerson,
          date: lead.lostDate || lead.updatedAt,
          lead
        });
      }
    });

    return Object.entries(map)
      .map(([reason, data]) => ({
        reason,
        count: data.count,
        percentage: Math.round((data.count / rejectedCount) * 1000) / 10,
        leads: data.leads,
        otherDetails: data.otherDetails
      }))
      .sort((a, b) => b.count - a.count);
  }, [rejectedLeads, rejectedCount]);

  // Check if we have any closed/rejected data at all in the current filter
  const hasData = wonCount > 0 || rejectedCount > 0;

  return (
    <div id="win-loss-reason-analysis-section" className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
      
      {/* Section Header with Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-xl shadow-xs">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-slate-800 font-bold text-base">วิเคราะห์สาเหตุการปิดการขาย (Win / Loss Reason Analysis)</h3>
                <span className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full font-bold">
                  Sales Insights
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                วิเคราะห์เชิงลึกว่าลูกค้าตัดสินใจปิดดีลหรือปฏิเสธจากปัจจัยใด เพื่อนำไปปรับกลยุทธ์ทีมขายและทำ Sales Report
              </p>
            </div>
          </div>
        </div>

        {/* Filters Bar: Date Filter + Salesperson Filter */}
        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          
          {/* Salesperson Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-2xs">
            <Users className="w-3.5 h-3.5 text-slate-400" />
            <select
              id="win-loss-salesperson-select"
              value={selectedSalesperson}
              onChange={(e) => setSelectedSalesperson(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="all">ทุกคนในทีม (All Sales)</option>
              {allSalespersons.map(sp => (
                <option key={sp} value={sp}>{sp}</option>
              ))}
            </select>
          </div>

          {/* Date Filter Mode Selector */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 font-semibold">
            {[
              { id: "all", label: "ทั้งหมด" },
              { id: "this_month", label: "เดือนนี้" },
              { id: "last_month", label: "เดือนที่แล้ว" },
              { id: "this_year", label: "ปีนี้" },
              { id: "custom", label: "กำหนดเอง" }
            ].map(tab => (
              <button
                key={tab.id}
                id={`win-loss-date-btn-${tab.id}`}
                type="button"
                onClick={() => setDateFilter(tab.id as WinLossDateFilter)}
                className={`px-2.5 py-1 rounded-lg text-xs transition-all cursor-pointer ${
                  dateFilter === tab.id
                    ? "bg-white text-blue-700 shadow-2xs font-bold"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Custom Date Pickers */}
          {dateFilter === "custom" && (
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="bg-transparent text-slate-700 focus:outline-none font-mono text-[11px]"
              />
              <span className="text-slate-400">-</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="bg-transparent text-slate-700 focus:outline-none font-mono text-[11px]"
              />
            </div>
          )}
        </div>
      </div>

      {/* Top KPI Cards (4 Cards Required: Lead ทั้งหมด, ปิดการขายได้, ปฏิเสธ, Conversion Rate) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI 1: Total Leads */}
        <div id="win-loss-kpi-total" className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold">Lead ทั้งหมด</span>
            <Users className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black font-mono text-slate-800">
            {totalLeadsCount} <span className="text-xs font-normal text-slate-400">ราย</span>
          </div>
          <p className="text-[11px] text-slate-400">
            กำลังติดตาม: <span className="font-semibold text-slate-600">{otherLeads.length}</span> ราย
          </p>
        </div>

        {/* KPI 2: Won Leads */}
        <div id="win-loss-kpi-won" className="bg-emerald-50/80 p-4 rounded-2xl border border-emerald-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-emerald-800">
            <span className="text-xs font-bold">ปิดการขายได้ (Won)</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black font-mono text-emerald-700">
            {wonCount} <span className="text-xs font-normal text-emerald-600">ราย</span>
          </div>
          <p className="text-[11px] text-emerald-700">
            สัดส่วน {totalLeadsCount > 0 ? ((wonCount / totalLeadsCount) * 100).toFixed(1) : 0}% ของ Lead ทั้งหมด
          </p>
        </div>

        {/* KPI 3: Rejected Leads */}
        <div id="win-loss-kpi-rejected" className="bg-rose-50/80 p-4 rounded-2xl border border-rose-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-rose-800">
            <span className="text-xs font-bold">ปฏิเสธ (Rejected / Lost)</span>
            <XCircle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-black font-mono text-rose-700">
            {rejectedCount} <span className="text-xs font-normal text-rose-600">ราย</span>
          </div>
          <p className="text-[11px] text-rose-700">
            สัดส่วน {totalLeadsCount > 0 ? ((rejectedCount / totalLeadsCount) * 100).toFixed(1) : 0}% ของ Lead ทั้งหมด
          </p>
        </div>

        {/* KPI 4: Conversion Rate */}
        <div id="win-loss-kpi-conversion" className="bg-gradient-to-br from-blue-50 to-indigo-50/70 p-4 rounded-2xl border border-blue-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-blue-800">
            <span className="text-xs font-bold">Conversion Rate</span>
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black font-mono text-blue-900">
            {conversionRate.toFixed(1)}%
          </div>
          <p className="text-[10px] text-blue-700 leading-tight">
            (สูตร: ปิดการขาย ÷ ผลสรุปทั้งหมด {decidedCount} ราย)
          </p>
        </div>
      </div>

      {/* Main Breakdown Section: 2 Columns (Won vs Rejected) */}
      {hasData ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
          
          {/* Column 1: ปิดการขายได้ (Won Reasons Breakdown) */}
          <div id="win-reasons-card" className="bg-slate-50/60 border border-slate-200 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/80">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-emerald-500 text-white rounded-lg">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">1. ปิดการขายได้ (Won Deals)</h4>
                  <p className="text-[11px] text-slate-500">
                    รวมทั้งสิ้น <span className="font-bold text-emerald-700 font-mono">{wonCount}</span> ราย
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
                {wonReasonStats.length} สาเหตุ
              </span>
            </div>

            {/* List of Won Reasons with Horizontal Bars */}
            {wonReasonStats.length > 0 ? (
              <div className="space-y-3">
                {wonReasonStats.map((item, index) => (
                  <div 
                    key={item.reason}
                    id={`won-reason-bar-${index}`}
                    onClick={() => setSelectedReasonForModal({ type: "won", stat: item })}
                    className="bg-white p-3 rounded-xl border border-slate-200 hover:border-emerald-300 hover:shadow-xs transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        <span className="w-4 h-4 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full flex items-center justify-center shrink-0">
                          {index + 1}
                        </span>
                        <span className="font-bold text-slate-800 truncate group-hover:text-emerald-700 transition-colors">
                          {item.reason}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-bold font-mono text-slate-900 text-xs">
                          {item.count} <span className="text-[10px] font-normal text-slate-400">ราย</span>
                        </span>
                        <span className="text-[11px] font-mono font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          {item.percentage}%
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.max(item.percentage, 3)}%` }}
                        transition={{ duration: 0.5, delay: index * 0.05 }}
                        className="bg-emerald-500 h-full rounded-full group-hover:bg-emerald-600 transition-colors"
                      />
                    </div>

                    {/* Details teaser for Other or notes */}
                    {item.otherDetails.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                        <span className="italic truncate max-w-[220px]">
                          ตัวอย่าง: "{item.otherDetails[0].text}"
                        </span>
                        <span className="text-emerald-600 font-semibold flex items-center gap-0.5 shrink-0 group-hover:underline">
                          ดูรายละเอียด ({item.otherDetails.length}) <ChevronRight className="w-3 h-3" />
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400 text-xs">
                ยังไม่มีข้อมูลสาเหตุการปิดการขายในตัวกรองนี้
              </div>
            )}
          </div>

          {/* Column 2: ปฏิเสธ (Rejected / Lost Reasons Breakdown) */}
          <div id="rejected-reasons-card" className="bg-slate-50/60 border border-slate-200 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/80">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-rose-500 text-white rounded-lg">
                  <XCircle className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">2. ปฏิเสธ (Rejected / Lost Deals)</h4>
                  <p className="text-[11px] text-slate-500">
                    รวมทั้งสิ้น <span className="font-bold text-rose-700 font-mono">{rejectedCount}</span> ราย
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full border border-rose-200">
                {rejectedReasonStats.length} สาเหตุ
              </span>
            </div>

            {/* List of Rejected Reasons with Horizontal Bars */}
            {rejectedReasonStats.length > 0 ? (
              <div className="space-y-3">
                {rejectedReasonStats.map((item, index) => (
                  <div 
                    key={item.reason}
                    id={`rejected-reason-bar-${index}`}
                    onClick={() => setSelectedReasonForModal({ type: "lost", stat: item })}
                    className="bg-white p-3 rounded-xl border border-slate-200 hover:border-rose-300 hover:shadow-xs transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        <span className="w-4 h-4 bg-rose-100 text-rose-800 text-[10px] font-bold rounded-full flex items-center justify-center shrink-0">
                          {index + 1}
                        </span>
                        <span className="font-bold text-slate-800 truncate group-hover:text-rose-700 transition-colors">
                          {item.reason}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-bold font-mono text-slate-900 text-xs">
                          {item.count} <span className="text-[10px] font-normal text-slate-400">ราย</span>
                        </span>
                        <span className="text-[11px] font-mono font-black text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                          {item.percentage}%
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.max(item.percentage, 3)}%` }}
                        transition={{ duration: 0.5, delay: index * 0.05 }}
                        className="bg-rose-500 h-full rounded-full group-hover:bg-rose-600 transition-colors"
                      />
                    </div>

                    {/* Details teaser for Other or notes */}
                    {item.otherDetails.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                        <span className="italic truncate max-w-[220px]">
                          ตัวอย่าง: "{item.otherDetails[0].text}"
                        </span>
                        <span className="text-rose-600 font-semibold flex items-center gap-0.5 shrink-0 group-hover:underline">
                          ดูรายละเอียด ({item.otherDetails.length}) <ChevronRight className="w-3 h-3" />
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400 text-xs">
                ยังไม่มีข้อมูลสาเหตุการปฏิเสธในตัวกรองนี้
              </div>
            )}
          </div>

        </div>
      ) : (
        /* Empty State */
        <div id="win-loss-empty-state" className="py-12 px-4 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center flex flex-col items-center justify-center space-y-3">
          <div className="p-3 bg-slate-100 text-slate-400 rounded-2xl">
            <BarChart3 className="w-8 h-8" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-700">ยังไม่มีข้อมูลการปิดการขาย</h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
              เมื่อทีมเซลส์เปลี่ยนสถานะ Lead เป็น "ปิดการขาย (สมัครแล้ว)" หรือ "ปฏิเสธ" ใน Pipeline และเลือกสาเหตุ ข้อมูลวิเคราะห์เชิงลึกจะประมวลผลขึ้นที่นี่แบบเรียลไทม์
            </p>
          </div>
          <div className="pt-2 text-[11px] text-blue-600 font-semibold">
            💡 คุณสามารถทดสอบเลือกสถานะและบันทึกสาเหตุในหน้า Pipeline ได้ทันที
          </div>
        </div>
      )}

      {/* Drilldown Details Modal for a selected Reason */}
      <AnimatePresence>
        {selectedReasonForModal && (
          <div 
            id="win-loss-drilldown-backdrop"
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto"
            onClick={() => setSelectedReasonForModal(null)}
          >
            <motion.div
              id="win-loss-drilldown-dialog"
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className={`px-5 py-4 border-b flex items-center justify-between ${
                selectedReasonForModal.type === "won" 
                  ? "bg-emerald-50 border-emerald-100 text-emerald-950"
                  : "bg-rose-50 border-rose-100 text-rose-950"
              }`}>
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-xl text-white ${
                    selectedReasonForModal.type === "won" ? "bg-emerald-600" : "bg-rose-600"
                  }`}>
                    {selectedReasonForModal.type === "won" ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold">
                      {selectedReasonForModal.type === "won" ? "สาเหตุปิดการขาย:" : "สาเหตุที่ปฏิเสธ:"} {selectedReasonForModal.stat.reason}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      พบทั้งหมด <span className="font-bold text-slate-800">{selectedReasonForModal.stat.count}</span> ราย ({selectedReasonForModal.stat.percentage}%)
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedReasonForModal(null)}
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-white/60 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body: Leads List with custom reason notes */}
              <div className="p-5 max-h-[60vh] overflow-y-auto space-y-3 text-xs">
                {selectedReasonForModal.stat.leads.map((lead, idx) => {
                  const customText = selectedReasonForModal.type === "won" ? lead.wonReasonOther : lead.lostReasonOther;
                  const dateStr = lead.registeredDate || lead.lostDate || lead.updatedAt;

                  return (
                    <div 
                      key={lead.id}
                      className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/20 transition-all space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-xs">{lead.shopName}</span>
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                              selectedReasonForModal.type === "won" ? "bg-emerald-100 text-emerald-800 border-emerald-200" : "bg-rose-100 text-rose-800 border-rose-200"
                            }`}>
                              {StatusLabels[lead.status]}
                            </span>
                          </div>
                          {lead.contactName && (
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              ผู้ติดต่อ: {lead.contactName} {lead.phone ? `(${lead.phone})` : ""}
                            </p>
                          )}
                        </div>

                        {onSelectLead && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedReasonForModal(null);
                              onSelectLead(lead);
                            }}
                            className="px-2.5 py-1 bg-white hover:bg-blue-50 text-blue-600 hover:text-blue-700 border border-slate-200 rounded-lg text-[10px] font-bold transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                          >
                            <Eye className="w-3 h-3" /> เปิด Lead
                          </button>
                        )}
                      </div>

                      {/* Custom note detail if filled */}
                      {customText && (
                        <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-[11px] text-slate-700 space-y-0.5">
                          <span className="font-bold text-slate-500 block text-[10px]">รายละเอียดเพิ่มเติม / หมายเหตุ:</span>
                          <p className="italic font-medium">"{customText}"</p>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                        <span>เซลส์: <strong className="text-slate-600">{lead.salesPerson || "ไม่ระบุ"}</strong></span>
                        {dateStr && <span>วันที่: {dateStr.split("T")[0]}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Footer */}
              <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedReasonForModal(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
