import React, { useState, useMemo } from "react";
import { 
  Lead, LeadStatus, SalesKpiStore, SalespersonKpiTarget, DEFAULT_KPI_TARGETS 
} from "../types";
import { 
  Target, Award, TrendingUp, Users, CheckCircle, Package, 
  DollarSign, UserCheck, Flame, Settings, Sparkles, Filter, 
  ChevronRight, ArrowUpRight, BarChart3, Layers, Trophy, AlertCircle,
  Calendar, Clock, Plus, RefreshCw
} from "lucide-react";
import { motion } from "motion/react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend, 
  Cell 
} from "recharts";
import SetKpiModal from "./SetKpiModal";
import RecordPiecesModal from "./RecordPiecesModal";

export type DateFilterMode = "daily" | "monthly" | "custom" | "all";

interface SalesKpiDashboardProps {
  leads: Lead[];
  salespersons: string[];
  currentUser?: string | null;
  kpiTargets: SalesKpiStore;
  onSaveKpiTargets: (updated: SalesKpiStore) => Promise<boolean> | void;
  onSelectLead?: (lead: Lead) => void;
  onUpdateLead?: (lead: Lead) => void;
  onNavigate?: (tab: string) => void;
}

export default function SalesKpiDashboard({
  leads,
  salespersons = [],
  currentUser = null,
  kpiTargets = {},
  onSaveKpiTargets,
  onSelectLead,
  onUpdateLead = () => {},
  onNavigate
}: SalesKpiDashboardProps) {
  const [isKpiModalOpen, setIsKpiModalOpen] = useState(false);
  const [isRecordPiecesOpen, setIsRecordPiecesOpen] = useState(false);
  const [recordPiecesSalesperson, setRecordPiecesSalesperson] = useState<string | null>(null);

  // Advanced Date Filter States
  const [filterMode, setFilterMode] = useState<DateFilterMode>("monthly");
  
  // Daily options
  const todayStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];
  const [selectedDay, setSelectedDay] = useState<string>(todayStr);

  // Monthly options
  const currentMonthStr = new Date().toISOString().substring(0, 7); // YYYY-MM
  const lastMonthDate = new Date();
  lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
  const lastMonthStr = lastMonthDate.toISOString().substring(0, 7);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);

  // Custom range options
  const firstDayOfMonthStr = `${currentMonthStr}-01`;
  const [customStartDate, setCustomStartDate] = useState<string>(firstDayOfMonthStr);
  const [customEndDate, setCustomEndDate] = useState<string>(todayStr);

  const [selectedChartMetric, setSelectedChartMetric] = useState<"won" | "registered" | "pieces" | "revenue">("won");
  const [filterSalesperson, setFilterSalesperson] = useState<string>("all");

  // Determine active date range label and bounds
  const { dateRangeText, startDateBound, endDateBound } = useMemo(() => {
    if (filterMode === "daily") {
      let label = `รายวัน: ${selectedDay}`;
      if (selectedDay === todayStr) label = `รายวัน: วันนี้ (${selectedDay})`;
      else if (selectedDay === yesterdayStr) label = `รายวัน: เมื่อวานนี้ (${selectedDay})`;
      return {
        dateRangeText: label,
        startDateBound: selectedDay,
        endDateBound: selectedDay
      };
    }

    if (filterMode === "monthly") {
      let label = `รายเดือน: ${selectedMonth}`;
      if (selectedMonth === currentMonthStr) label = `รายเดือน: เดือนนี้ (${selectedMonth})`;
      else if (selectedMonth === lastMonthStr) label = `รายเดือน: เดือนที่แล้ว (${selectedMonth})`;
      
      const year = parseInt(selectedMonth.split("-")[0], 10);
      const month = parseInt(selectedMonth.split("-")[1], 10);
      const lastDay = new Date(year, month, 0).getDate();
      return {
        dateRangeText: label,
        startDateBound: `${selectedMonth}-01`,
        endDateBound: `${selectedMonth}-${String(lastDay).padStart(2, '0')}`
      };
    }

    if (filterMode === "custom") {
      return {
        dateRangeText: `กำหนดเอง: ${customStartDate} ถึง ${customEndDate}`,
        startDateBound: customStartDate,
        endDateBound: customEndDate
      };
    }

    return {
      dateRangeText: "สะสมทั้งหมด (All Time)",
      startDateBound: "1970-01-01",
      endDateBound: "2099-12-31"
    };
  }, [filterMode, selectedDay, todayStr, yesterdayStr, selectedMonth, currentMonthStr, lastMonthStr, customStartDate, customEndDate]);

  // Helper to test if a lead matches the active date window
  const isLeadInPeriod = (lead: Lead) => {
    if (filterMode === "all") return true;

    // Check relevant date fields on lead
    const leadDates = [
      lead.createdAt?.substring(0, 10),
      lead.registeredDate?.substring(0, 10),
      lead.activationDate?.substring(0, 10),
      lead.firstShipmentDate?.substring(0, 10),
      lead.updatedAt?.substring(0, 10),
    ].filter(Boolean) as string[];

    // If no specific dates, default to createdAt
    if (leadDates.length === 0) return true;

    if (filterMode === "daily") {
      return leadDates.some(d => d === selectedDay);
    }

    if (filterMode === "monthly") {
      return leadDates.some(d => d.startsWith(selectedMonth));
    }

    if (filterMode === "custom") {
      return leadDates.some(d => d >= customStartDate && d <= customEndDate);
    }

    return true;
  };

  // Filter leads based on selected period
  const periodFilteredLeads = useMemo(() => {
    if (filterMode === "all") return leads;
    return leads.filter(l => isLeadInPeriod(l));
  }, [leads, filterMode, selectedDay, selectedMonth, customStartDate, customEndDate]);

  // Ensure all active salespersons are included
  const allSalespersons = useMemo(() => {
    const fromLeads = Array.from(new Set(leads.map(l => l.salesPerson).filter(Boolean)));
    const combined = Array.from(new Set([...salespersons, ...fromLeads]));
    return combined.length > 0 ? combined : ["Phere", "Nalin", "Beer"];
  }, [salespersons, leads]);

  // Calculate detailed performance and KPI fulfillment for each salesperson
  const salesPerformanceList = useMemo(() => {
    return allSalespersons.map(sp => {
      // Find all leads belonging to this salesperson in current period
      const spLeads = periodFilteredLeads.filter(l => l.salesPerson === sp);
      const totalLeads = spLeads.length;

      // 1. สมัครกี่เจ้า (Registered count)
      const registeredLeads = spLeads.filter(l => 
        l.status === LeadStatus.REGISTERED || 
        l.status === LeadStatus.ACTIVATED || 
        l.status === LeadStatus.REGULAR ||
        Boolean(l.registeredDate)
      );
      const registeredCount = registeredLeads.length;

      // 2. ปิดการขายกี่เจ้า (Won / Activated / Regular deals)
      const wonLeads = spLeads.filter(l => 
        l.status === LeadStatus.ACTIVATED || 
        l.status === LeadStatus.REGULAR
      );
      const wonCount = wonLeads.length;

      // 3. ใช้งานแล้วกี่ชิ้น (Active pieces / parcels volume)
      // Calculate from won leads or any leads with shipment volume recorded
      const activePieces = spLeads.reduce((sum, lead) => {
        const pieces = Number(lead.shipmentsPerDay) || 0;
        // Count pieces if activated, regular, or registered with pieces
        if (lead.status === LeadStatus.ACTIVATED || lead.status === LeadStatus.REGULAR || lead.status === LeadStatus.REGISTERED || pieces > 0) {
          return sum + pieces;
        }
        return sum;
      }, 0);

      // 4. ยอดขายประมาณการรวม (Estimated Revenue in THB)
      // Standard logistics rate assumption: ~35 THB per parcel/piece
      const estimatedRevenue = activePieces * 35;

      // KPI Targets
      const target: SalespersonKpiTarget = kpiTargets[sp] || DEFAULT_KPI_TARGETS[sp] || {
        salesperson: sp,
        targetWonDeals: 10,
        targetRegistered: 20,
        targetActivePieces: 5000,
        targetRevenue: 175000
      };

      // Adjust target scaling if Daily / Custom mode to make it fair/meaningful
      let scaledTarget = { ...target };
      if (filterMode === "daily") {
        // Daily target: roughly / 25 working days
        scaledTarget = {
          salesperson: sp,
          targetWonDeals: Math.max(1, Math.round(target.targetWonDeals / 25)),
          targetRegistered: Math.max(1, Math.round(target.targetRegistered / 25)),
          targetActivePieces: Math.max(50, Math.round(target.targetActivePieces / 25)),
          targetRevenue: Math.max(2000, Math.round(target.targetRevenue / 25))
        };
      }

      // % Achievements
      const wonPct = scaledTarget.targetWonDeals > 0 
        ? Math.round((wonCount / scaledTarget.targetWonDeals) * 100) 
        : 0;
      const regPct = scaledTarget.targetRegistered > 0 
        ? Math.round((registeredCount / scaledTarget.targetRegistered) * 100) 
        : 0;
      const piecesPct = scaledTarget.targetActivePieces > 0 
        ? Math.round((activePieces / scaledTarget.targetActivePieces) * 100) 
        : 0;
      const revPct = scaledTarget.targetRevenue > 0 
        ? Math.round((estimatedRevenue / scaledTarget.targetRevenue) * 100) 
        : 0;

      // Weighted overall achievement score (Won: 40%, Pieces: 30%, Reg: 20%, Rev: 10%)
      const overallScore = Math.round((wonPct * 0.4) + (piecesPct * 0.3) + (regPct * 0.2) + (revPct * 0.1));

      const conversionRate = totalLeads > 0 
        ? Math.round((wonCount / totalLeads) * 100) 
        : 0;

      return {
        salesperson: sp,
        totalLeads,
        wonCount,
        registeredCount,
        activePieces,
        estimatedRevenue,
        target: scaledTarget,
        originalTarget: target,
        wonPct,
        regPct,
        piecesPct,
        revPct,
        overallScore,
        conversionRate
      };
    }).sort((a, b) => b.overallScore - a.overallScore || b.wonCount - a.wonCount);
  }, [allSalespersons, periodFilteredLeads, kpiTargets, filterMode]);

  // Overall Team Summary Totals
  const teamTotals = useMemo(() => {
    const totalWon = salesPerformanceList.reduce((acc, s) => acc + s.wonCount, 0);
    const totalReg = salesPerformanceList.reduce((acc, s) => acc + s.registeredCount, 0);
    const totalPieces = salesPerformanceList.reduce((acc, s) => acc + s.activePieces, 0);
    const totalRev = salesPerformanceList.reduce((acc, s) => acc + s.estimatedRevenue, 0);

    const targetWon = salesPerformanceList.reduce((acc, s) => acc + s.target.targetWonDeals, 0);
    const targetReg = salesPerformanceList.reduce((acc, s) => acc + s.target.targetRegistered, 0);
    const targetPieces = salesPerformanceList.reduce((acc, s) => acc + s.target.targetActivePieces, 0);
    const targetRev = salesPerformanceList.reduce((acc, s) => acc + s.target.targetRevenue, 0);

    const wonPct = targetWon > 0 ? Math.round((totalWon / targetWon) * 100) : 0;
    const regPct = targetReg > 0 ? Math.round((totalReg / targetReg) * 100) : 0;
    const piecesPct = targetPieces > 0 ? Math.round((totalPieces / targetPieces) * 100) : 0;
    const revPct = targetRev > 0 ? Math.round((totalRev / targetRev) * 100) : 0;
    const overallScore = Math.round((wonPct * 0.4) + (piecesPct * 0.3) + (regPct * 0.2) + (revPct * 0.1));

    return {
      totalWon,
      totalReg,
      totalPieces,
      totalRev,
      targetWon,
      targetReg,
      targetPieces,
      targetRev,
      wonPct,
      regPct,
      piecesPct,
      revPct,
      overallScore
    };
  }, [salesPerformanceList]);

  // Chart dataset for Actual vs Target comparison
  const chartData = useMemo(() => {
    return salesPerformanceList.map(s => {
      let actual = s.wonCount;
      let target = s.target.targetWonDeals;
      let unit = "เจ้า";

      if (selectedChartMetric === "registered") {
        actual = s.registeredCount;
        target = s.target.targetRegistered;
        unit = "เจ้า";
      } else if (selectedChartMetric === "pieces") {
        actual = s.activePieces;
        target = s.target.targetActivePieces;
        unit = "ชิ้น";
      } else if (selectedChartMetric === "revenue") {
        actual = Math.round(s.estimatedRevenue / 1000);
        target = Math.round(s.target.targetRevenue / 1000);
        unit = "k บาท";
      }

      return {
        name: s.salesperson,
        "ยอดทำได้จริง (Actual)": actual,
        "เป้าหมาย KPI (Target)": target,
        unit,
        pct: target > 0 ? Math.round((actual / target) * 100) : 0
      };
    });
  }, [salesPerformanceList, selectedChartMetric]);

  // Helper for performance badge color
  const getBadgeInfo = (score: number) => {
    if (score >= 100) {
      return {
        label: "🚀 ทะลุเป้า (>100%)",
        bg: "bg-emerald-50 text-emerald-700 border-emerald-200",
        barColor: "bg-emerald-500",
        ring: "ring-emerald-500/20"
      };
    }
    if (score >= 80) {
      return {
        label: "⭐ ใกล้ถึงเป้า (80-99%)",
        bg: "bg-blue-50 text-blue-700 border-blue-200",
        barColor: "bg-blue-600",
        ring: "ring-blue-500/20"
      };
    }
    if (score >= 50) {
      return {
        label: "🟡 ปานกลาง (50-79%)",
        bg: "bg-amber-50 text-amber-800 border-amber-200",
        barColor: "bg-amber-500",
        ring: "ring-amber-500/20"
      };
    }
    return {
      label: "🔴 ต้องเร่งยอด (<50%)",
      bg: "bg-rose-50 text-rose-700 border-rose-200",
      barColor: "bg-rose-500",
      ring: "ring-rose-500/20"
    };
  };

  const displayedList = filterSalesperson === "all"
    ? salesPerformanceList
    : salesPerformanceList.filter(s => s.salesperson === filterSalesperson);

  const handleOpenRecordPieces = (spName?: string) => {
    setRecordPiecesSalesperson(spName || null);
    setIsRecordPiecesOpen(true);
  };

  // Quick preset ranges for custom date
  const setQuickRange = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days + 1);
    setCustomStartDate(start.toISOString().split("T")[0]);
    setCustomEndDate(end.toISOString().split("T")[0]);
    setFilterMode("custom");
  };

  return (
    <div id="sales-kpi-dashboard-section" className="space-y-6">
      
      {/* 1. Main Header & Date Range Query Hub */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <Target className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-800 tracking-tight">
                  รายงานยอดขาย & เป้าหมาย KPI เซลล์รายบุคคล
                </h2>
                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[10px] font-bold">
                  KPI & Pieces Hub
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                เลือกช่วงเวลาดึงรายงานรายวัน รายเดือน หรือกำหนดวันเอง พร้อมระบบบันทึกจำนวนชิ้นพัสดุใช้งานจริง
              </p>
            </div>
          </div>

          {/* Action Buttons: Set KPI */}
          <div className="flex flex-wrap items-center gap-2 self-start lg:self-center">
            
            {/* Set KPI Target Button */}
            <button
              id="open-set-kpi-modal-btn"
              type="button"
              onClick={() => setIsKpiModalOpen(true)}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all border border-slate-200 flex items-center gap-1.5 cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>ตั้งเป้า KPI</span>
            </button>

          </div>
        </div>

        {/* Date Filter & Query Selector Controls */}
        <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200 space-y-3">
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            
            {/* 4 Mode Tabs: Daily / Monthly / Custom / All */}
            <div className="flex items-center bg-white p-1 rounded-xl border border-slate-200 shadow-2xs text-xs font-semibold">
              <button
                type="button"
                id="filter-mode-daily-btn"
                onClick={() => setFilterMode("daily")}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  filterMode === "daily" 
                    ? "bg-blue-600 text-white shadow-xs font-bold" 
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>รายวัน (Daily)</span>
              </button>

              <button
                type="button"
                id="filter-mode-monthly-btn"
                onClick={() => setFilterMode("monthly")}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  filterMode === "monthly" 
                    ? "bg-blue-600 text-white shadow-xs font-bold" 
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>รายเดือน (Monthly)</span>
              </button>

              <button
                type="button"
                id="filter-mode-custom-btn"
                onClick={() => setFilterMode("custom")}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  filterMode === "custom" 
                    ? "bg-blue-600 text-white shadow-xs font-bold" 
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Filter className="w-3.5 h-3.5" />
                <span>กำหนดวันเอง (Custom)</span>
              </button>

              <button
                type="button"
                id="filter-mode-all-btn"
                onClick={() => setFilterMode("all")}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  filterMode === "all" 
                    ? "bg-blue-600 text-white shadow-xs font-bold" 
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                สะสมทั้งหมด
              </button>
            </div>

            {/* Salesperson Filter Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">กรองเซลส์:</span>
              <select
                id="filter-sp-kpi-select"
                value={filterSalesperson}
                onChange={(e) => setFilterSalesperson(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-2xs"
              >
                <option value="all">👥 เซลล์ทุกคน (ภาพรวม)</option>
                {allSalespersons.map(sp => (
                  <option key={sp} value={sp}>👤 {sp}</option>
                ))}
              </select>
            </div>

          </div>

          {/* Sub-Controls based on Active Filter Mode */}
          <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-slate-200/60 text-xs">
            
            {/* Mode 1: Daily Specific Date Pickers */}
            {filterMode === "daily" && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-slate-600">เลือกวันที่:</span>
                <button
                  type="button"
                  onClick={() => setSelectedDay(todayStr)}
                  className={`px-2.5 py-1 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                    selectedDay === todayStr 
                      ? "bg-blue-100 text-blue-800 border-blue-300" 
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  วันนี้ ({todayStr})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDay(yesterdayStr)}
                  className={`px-2.5 py-1 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                    selectedDay === yesterdayStr 
                      ? "bg-blue-100 text-blue-800 border-blue-300" 
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  เมื่อวาน ({yesterdayStr})
                </button>
                <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 py-0.5 shadow-2xs">
                  <input
                    type="date"
                    value={selectedDay}
                    onChange={(e) => setSelectedDay(e.target.value)}
                    className="text-xs font-semibold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* Mode 2: Monthly Specific Month Pickers */}
            {filterMode === "monthly" && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-slate-600">เลือกเดือน:</span>
                <button
                  type="button"
                  onClick={() => setSelectedMonth(currentMonthStr)}
                  className={`px-2.5 py-1 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                    selectedMonth === currentMonthStr 
                      ? "bg-blue-100 text-blue-800 border-blue-300" 
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  เดือนนี้ ({currentMonthStr})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedMonth(lastMonthStr)}
                  className={`px-2.5 py-1 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                    selectedMonth === lastMonthStr 
                      ? "bg-blue-100 text-blue-800 border-blue-300" 
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  เดือนที่แล้ว ({lastMonthStr})
                </button>
                <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 py-0.5 shadow-2xs">
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="text-xs font-semibold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* Mode 3: Custom Date Range Pickers & Quick Presets */}
            {filterMode === "custom" && (
              <div className="flex flex-wrap items-center gap-2 w-full">
                <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1 shadow-2xs">
                  <span className="text-slate-400 font-bold text-[11px]">ตั้งแต่:</span>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="text-xs font-semibold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
                  />
                </div>
                <span className="text-slate-400 font-bold">ถึง</span>
                <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1 shadow-2xs">
                  <span className="text-slate-400 font-bold text-[11px]">ถึงวันที่:</span>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="text-xs font-semibold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
                  />
                </div>

                {/* Presets */}
                <div className="flex items-center gap-1 ml-auto">
                  <span className="text-[10px] text-slate-400 font-medium">ช่วงด่วน:</span>
                  <button
                    type="button"
                    onClick={() => setQuickRange(7)}
                    className="px-2 py-0.5 bg-white hover:bg-slate-100 border border-slate-200 rounded text-[10px] font-bold text-slate-600 cursor-pointer"
                  >
                    7 วัน
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickRange(14)}
                    className="px-2 py-0.5 bg-white hover:bg-slate-100 border border-slate-200 rounded text-[10px] font-bold text-slate-600 cursor-pointer"
                  >
                    14 วัน
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickRange(30)}
                    className="px-2 py-0.5 bg-white hover:bg-slate-100 border border-slate-200 rounded text-[10px] font-bold text-slate-600 cursor-pointer"
                  >
                    30 วัน
                  </button>
                </div>
              </div>
            )}

            {/* Active Range Summary Pill */}
            <div className="w-full flex items-center justify-between pt-1 text-[11px] text-slate-500 font-medium">
              <span className="flex items-center gap-1 text-blue-700 font-bold">
                <Calendar className="w-3 h-3 text-blue-600" />
                กำลังแสดงผล: {dateRangeText}
              </span>
              <span className="text-slate-400">
                พบข้อมูลลูกค้าในช่วงนี้ทั้งหมด <strong>{periodFilteredLeads.length} ราย</strong> (รวม <strong>{teamTotals.totalPieces.toLocaleString()} ชิ้น</strong>)
              </span>
            </div>

          </div>

        </div>

      </div>

      {/* 2. Four Aggregate Team KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Won Deals (ปิดการขายกี่เจ้า) */}
        <div id="kpi-stat-won" className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
              ปิดการขายสำเร็จ (Won)
            </span>
            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${teamTotals.wonPct >= 100 ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
              {teamTotals.wonPct}% KPI
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-2xl font-black font-mono text-slate-800">
              {teamTotals.totalWon} <span className="text-xs font-normal text-slate-400">/ เป้า {teamTotals.targetWon} เจ้า</span>
            </div>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
            <div 
              className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
              style={{ width: `${Math.min(100, teamTotals.wonPct)}%` }} 
            />
          </div>
          <span className="text-[10px] text-slate-400 block">ร้านค้าที่เปิดใช้งานและเริ่มส่งพัสดุจริง</span>
        </div>

        {/* Card 2: Registered (สมัครกี่เจ้า) */}
        <div id="kpi-stat-registered" className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-blue-600" />
              สมัครสมาชิกใหม่ (Signups)
            </span>
            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${teamTotals.regPct >= 100 ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
              {teamTotals.regPct}% KPI
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-2xl font-black font-mono text-slate-800">
              {teamTotals.totalReg} <span className="text-xs font-normal text-slate-400">/ เป้า {teamTotals.targetReg} เจ้า</span>
            </div>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
            <div 
              className="bg-blue-600 h-full rounded-full transition-all duration-500" 
              style={{ width: `${Math.min(100, teamTotals.regPct)}%` }} 
            />
          </div>
          <span className="text-[10px] text-slate-400 block">ร้านค้าที่ยื่นสมัครผ่านแบบฟอร์ม</span>
        </div>

        {/* Card 3: Estimated Revenue (ยอดขายรวม) */}
        <div id="kpi-stat-revenue" className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-indigo-600" />
              ยอดขายรวม (Total Revenue)
            </span>
            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${teamTotals.revPct >= 100 ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
              {teamTotals.revPct}% KPI
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-2xl font-black font-mono text-slate-800">
              ฿{teamTotals.totalRev.toLocaleString()} <span className="text-xs font-normal text-slate-400">/ ฿{teamTotals.targetRev.toLocaleString()}</span>
            </div>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
            <div 
              className="bg-indigo-600 h-full rounded-full transition-all duration-500" 
              style={{ width: `${Math.min(100, teamTotals.revPct)}%` }} 
            />
          </div>
          <span className="text-[10px] text-slate-400 block">มูลค่ายอดขายและบริการรวมของทีม</span>
        </div>

        {/* Card 4: Active Pieces (จำนวนชิ้น / ใช้งานแล้ว) */}
        <div id="kpi-stat-pieces" className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-amber-600" />
              จำนวนชิ้น (Active Pieces)
            </span>
            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${teamTotals.piecesPct >= 100 ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
              {teamTotals.piecesPct}% KPI
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-2xl font-black font-mono text-slate-800">
              {teamTotals.totalPieces.toLocaleString()} <span className="text-xs font-normal text-slate-400">/ {teamTotals.targetPieces.toLocaleString()} ชิ้น</span>
            </div>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
            <div 
              className="bg-amber-500 h-full rounded-full transition-all duration-500" 
              style={{ width: `${Math.min(100, teamTotals.piecesPct)}%` }} 
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400">ปริมาณพัสดุและชิ้นส่งจริง</span>
            <button
              type="button"
              onClick={() => handleOpenRecordPieces()}
              className="text-[10px] font-bold text-amber-700 hover:text-amber-800 hover:underline cursor-pointer flex items-center gap-0.5"
            >
              <Plus className="w-2.5 h-2.5" /> เพิ่มชิ้น
            </button>
          </div>
        </div>

      </div>

      {/* 3. Individual Salesperson Performance & KPI Achievement Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-600" />
            <span>ผลงานและระดับความสำเร็จ KPI ของเซลส์แต่ละคน</span>
          </h3>
          <span className="text-xs text-slate-400">
            แสดง {displayedList.length} คน • ช่วง {dateRangeText}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayedList.map((sp, idx) => {
            const badge = getBadgeInfo(sp.overallScore);
            const isTop = idx === 0 && sp.overallScore > 0;

            return (
              <motion.div
                key={sp.salesperson}
                id={`salesperson-kpi-card-${sp.salesperson}`}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: idx * 0.05 }}
                className={`bg-white rounded-2xl p-5 border transition-all shadow-xs space-y-4 hover:shadow-md ${
                  isTop ? "border-amber-300 ring-2 ring-amber-400/20 bg-gradient-to-b from-amber-50/20 to-white" : "border-slate-200"
                }`}
              >
                {/* Header: Name, Top Performer & Overall % */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-extrabold text-sm shadow-xs ${
                      isTop 
                        ? "bg-gradient-to-tr from-amber-500 to-yellow-400 text-white" 
                        : "bg-blue-50 text-blue-700 border border-blue-100"
                    }`}>
                      {sp.salesperson.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-bold text-sm text-slate-800">{sp.salesperson}</h4>
                        {isTop && (
                          <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 border border-amber-300 rounded text-[9px] font-black flex items-center gap-0.5">
                            <Trophy className="w-2.5 h-2.5 text-amber-600" /> #1 Top
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400 block font-medium">
                        ดูแลทั้งหมด {sp.totalLeads} ราย (Conv {sp.conversionRate}%)
                      </span>
                    </div>
                  </div>

                  {/* Overall KPI Gauge Badge */}
                  <div className="text-right">
                    <div className="text-xl font-black font-mono text-slate-900 tracking-tight">
                      {sp.overallScore}%
                    </div>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border inline-block mt-0.5 ${badge.bg}`}>
                      {badge.label.split(" ")[0]} {sp.overallScore >= 100 ? "ทะลุเป้า" : `${sp.overallScore}%`}
                    </span>
                  </div>
                </div>

                {/* KPI Metric Progress Bars (4 Core Target Elements) */}
                <div className="space-y-2.5 pt-1 text-xs">
                  
                  {/* 1. ปิดการขาย (Won) */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-600 font-semibold flex items-center gap-1">
                        <CheckCircle className="w-3 h-3 text-emerald-600" /> ปิดการขาย:
                      </span>
                      <span className="font-mono text-slate-800 font-bold">
                        {sp.wonCount} <span className="text-slate-400 font-normal">/ {sp.target.targetWonDeals} เจ้า</span>
                        <span className={`ml-1.5 font-extrabold ${sp.wonPct >= 100 ? 'text-emerald-600' : 'text-slate-600'}`}>
                          ({sp.wonPct}%)
                        </span>
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-emerald-500 h-full rounded-full transition-all" 
                        style={{ width: `${Math.min(100, sp.wonPct)}%` }} 
                      />
                    </div>
                  </div>

                  {/* 2. สมัครสมาชิก (Registered) */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-600 font-semibold flex items-center gap-1">
                        <UserCheck className="w-3 h-3 text-blue-600" /> สมัครสมาชิก:
                      </span>
                      <span className="font-mono text-slate-800 font-bold">
                        {sp.registeredCount} <span className="text-slate-400 font-normal">/ {sp.target.targetRegistered} เจ้า</span>
                        <span className={`ml-1.5 font-extrabold ${sp.regPct >= 100 ? 'text-emerald-600' : 'text-slate-600'}`}>
                          ({sp.regPct}%)
                        </span>
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-blue-600 h-full rounded-full transition-all" 
                        style={{ width: `${Math.min(100, sp.regPct)}%` }} 
                      />
                    </div>
                  </div>

                  {/* 3. ยอดขายรวม (Revenue) */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-600 font-semibold flex items-center gap-1">
                        <DollarSign className="w-3 h-3 text-indigo-600" /> ยอดขายรวม:
                      </span>
                      <span className="font-mono text-slate-800 font-bold">
                        ฿{sp.estimatedRevenue.toLocaleString()} <span className="text-slate-400 font-normal">/ ฿{sp.target.targetRevenue.toLocaleString()}</span>
                        <span className={`ml-1.5 font-extrabold ${sp.revPct >= 100 ? 'text-emerald-600' : 'text-slate-600'}`}>
                          ({sp.revPct}%)
                        </span>
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-indigo-600 h-full rounded-full transition-all" 
                        style={{ width: `${Math.min(100, sp.revPct)}%` }} 
                      />
                    </div>
                  </div>

                  {/* 4. จำนวนชิ้น / ใช้งานแล้ว (Active Pieces) - Placed below Total Revenue */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-600 font-semibold flex items-center gap-1">
                        <Package className="w-3 h-3 text-amber-600" /> จำนวนชิ้น:
                      </span>
                      <span className="font-mono text-slate-800 font-bold">
                        {sp.activePieces.toLocaleString()} <span className="text-slate-400 font-normal">/ {sp.target.targetActivePieces.toLocaleString()} ชิ้น</span>
                        <span className={`ml-1.5 font-extrabold ${sp.piecesPct >= 100 ? 'text-emerald-600' : 'text-slate-600'}`}>
                          ({sp.piecesPct}%)
                        </span>
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-amber-500 h-full rounded-full transition-all" 
                        style={{ width: `${Math.min(100, sp.piecesPct)}%` }} 
                      />
                    </div>
                  </div>

                </div>

                {/* Action Buttons: Add Pieces & Adjust KPI */}
                <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <button
                    type="button"
                    onClick={() => handleOpenRecordPieces(sp.salesperson)}
                    className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg font-bold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>เพิ่มจำนวนชิ้น</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsKpiModalOpen(true);
                    }}
                    className="text-blue-600 hover:text-blue-800 font-bold flex items-center gap-0.5 hover:underline cursor-pointer"
                  >
                    <span>ปรับเป้า KPI</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* 4. Interactive Chart: Actual vs Target Comparison */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-100">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-slate-800 font-bold text-sm">กราฟเปรียบเทียบผลงานจริง vs เป้าหมาย (Actual vs KPI Target)</h3>
              <p className="text-[11px] text-slate-400">วิเคราะห์ส่วนต่างตามช่วงเวลา {dateRangeText}</p>
            </div>
          </div>

          {/* Metric Selector for chart */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs font-semibold self-start sm:self-center">
            <button
              type="button"
              onClick={() => setSelectedChartMetric("won")}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                selectedChartMetric === "won" ? "bg-white text-emerald-700 shadow-2xs font-bold" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              ปิดการขาย (Won)
            </button>
            <button
              type="button"
              onClick={() => setSelectedChartMetric("registered")}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                selectedChartMetric === "registered" ? "bg-white text-blue-700 shadow-2xs font-bold" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              สมัคร (Signups)
            </button>
            <button
              type="button"
              onClick={() => setSelectedChartMetric("revenue")}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                selectedChartMetric === "revenue" ? "bg-white text-indigo-700 shadow-2xs font-bold" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              ยอดขาย (Revenue)
            </button>
            <button
              type="button"
              onClick={() => setSelectedChartMetric("pieces")}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                selectedChartMetric === "pieces" ? "bg-white text-amber-800 shadow-2xs font-bold" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              จำนวนชิ้น (Pieces)
            </button>
          </div>
        </div>

        {/* Recharts Comparison Chart */}
        <div className="h-64 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#475569" }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#64748b" }} />
              <Tooltip 
                cursor={{ fill: "rgba(241, 245, 249, 0.6)" }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl border border-slate-700 text-xs space-y-1">
                        <p className="font-bold text-slate-100">👤 {d.name}</p>
                        <p className="text-emerald-400">
                          ทำได้จริง (Actual): <span className="font-mono font-bold text-white">{d["ยอดทำได้จริง (Actual)"].toLocaleString()} {d.unit}</span>
                        </p>
                        <p className="text-slate-300">
                          เป้าหมาย (Target): <span className="font-mono font-bold text-slate-200">{d["เป้าหมาย KPI (Target)"].toLocaleString()} {d.unit}</span>
                        </p>
                        <p className="text-amber-300 font-bold border-t border-slate-800 pt-1 text-[11px]">
                          ความสำเร็จตามเป้า: {d.pct}%
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
              <Bar dataKey="ยอดทำได้จริง (Actual)" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={28} />
              <Bar dataKey="เป้าหมาย KPI (Target)" fill="#cbd5e1" radius={[6, 6, 0, 0]} barSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 5. Detailed KPI Performance Table */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-slate-800 font-bold text-sm flex items-center gap-2">
            <Award className="w-4 h-4 text-blue-600" />
            <span>ตารางเปรียบเทียบ KPI และยอดขายรายบุคคล (Detailed KPI Table)</span>
          </h3>
          <span className="text-[11px] text-slate-400 font-medium">
            *อัตราประเมินรายได้มาตรฐาน 35฿/ชิ้นขนส่ง
          </span>
        </div>

        <div className="overflow-x-auto text-xs">
          <table id="sales-kpi-summary-table" className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] text-slate-500 font-semibold uppercase bg-slate-50/70">
                <th className="py-3 pl-4 rounded-l-xl">เซลส์ผู้รับผิดชอบ</th>
                <th className="py-3 text-center">ปิดการขาย (Won / Target)</th>
                <th className="py-3 text-center">สมัครแล้ว (Reg / Target)</th>
                <th className="py-3 text-center">ยอดขายรวม (Actual / Target)</th>
                <th className="py-3 text-center">จำนวนชิ้น (Pieces / Target)</th>
                <th className="py-3 text-right pr-4 rounded-r-xl">ความสำเร็จ KPI รวม</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayedList.map(s => {
                const badge = getBadgeInfo(s.overallScore);
                return (
                  <tr key={s.salesperson} className="hover:bg-slate-50/50 transition-colors">
                    
                    {/* Salesperson Name & Status */}
                    <td className="py-3.5 pl-4 font-bold text-slate-800 flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-extrabold text-[11px]">
                        {s.salesperson.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <span>{s.salesperson}</span>
                        <span className="text-[10px] text-slate-400 block font-normal">
                          {s.totalLeads} Leads
                        </span>
                      </div>
                    </td>

                    {/* Won Deals */}
                    <td className="py-3.5 text-center font-mono">
                      <div className="font-bold text-slate-800">
                        {s.wonCount} <span className="text-slate-400 font-normal">/ {s.target.targetWonDeals} เจ้า</span>
                      </div>
                      <span className={`text-[10px] font-bold ${s.wonPct >= 100 ? 'text-emerald-600' : 'text-slate-500'}`}>
                        {s.wonPct}%
                      </span>
                    </td>

                    {/* Registered */}
                    <td className="py-3.5 text-center font-mono">
                      <div className="font-bold text-slate-800">
                        {s.registeredCount} <span className="text-slate-400 font-normal">/ {s.target.targetRegistered} เจ้า</span>
                      </div>
                      <span className={`text-[10px] font-bold ${s.regPct >= 100 ? 'text-emerald-600' : 'text-slate-500'}`}>
                        {s.regPct}%
                      </span>
                    </td>

                    {/* Revenue */}
                    <td className="py-3.5 text-center font-mono">
                      <div className="font-bold text-slate-800">
                        ฿{s.estimatedRevenue.toLocaleString()} <span className="text-slate-400 font-normal">/ ฿{s.target.targetRevenue.toLocaleString()}</span>
                      </div>
                      <span className={`text-[10px] font-bold ${s.revPct >= 100 ? 'text-emerald-600' : 'text-slate-500'}`}>
                        {s.revPct}%
                      </span>
                    </td>

                    {/* Active Pieces */}
                    <td className="py-3.5 text-center font-mono">
                      <div className="font-bold text-slate-800">
                        {s.activePieces.toLocaleString()} <span className="text-slate-400 font-normal">/ {s.target.targetActivePieces.toLocaleString()} ชิ้น</span>
                      </div>
                      <span className={`text-[10px] font-bold ${s.piecesPct >= 100 ? 'text-emerald-600' : 'text-slate-500'}`}>
                        {s.piecesPct}%
                      </span>
                    </td>

                    {/* Overall KPI % */}
                    <td className="py-3.5 text-right pr-4">
                      <div className="flex items-center justify-end gap-2 font-mono">
                        <span className="text-base font-black text-slate-900">{s.overallScore}%</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${badge.bg}`}>
                          {s.overallScore >= 100 ? "ทะลุเป้า" : `${s.overallScore}%`}
                        </span>
                      </div>
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Set KPI Target Modal */}
      <SetKpiModal
        isOpen={isKpiModalOpen}
        onClose={() => setIsKpiModalOpen(false)}
        salespersons={allSalespersons}
        currentUser={currentUser}
        kpiTargets={kpiTargets}
        onSaveKpiTargets={onSaveKpiTargets}
      />

      {/* Record Pieces Modal */}
      <RecordPiecesModal
        isOpen={isRecordPiecesOpen}
        onClose={() => setIsRecordPiecesOpen(false)}
        leads={leads}
        salespersons={allSalespersons}
        initialSalesperson={recordPiecesSalesperson}
        onUpdateLead={onUpdateLead}
      />

    </div>
  );
}
