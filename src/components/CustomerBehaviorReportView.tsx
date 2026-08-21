import React, { useState, useMemo } from "react";
import { Lead, LeadStatus, CustomerBehaviorStatus } from "../types";
import { 
  Users, UserCheck, Package, DollarSign, TrendingUp, TrendingDown, 
  AlertTriangle, CheckCircle, Search, Filter, Download, Plus, 
  PhoneCall, MessageSquare, RefreshCw, Calendar, ArrowUpRight, 
  ArrowDownRight, HelpCircle, Layers, PieChart as PieChartIcon, 
  BarChart3, Activity, Sparkles, ShieldAlert, ArrowRight, Clock,
  ChevronRight, Edit3, HeartHandshake
} from "lucide-react";
import { motion } from "motion/react";
import { 
  BarChart, 
  Bar, 
  LineChart,
  Line,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend, 
  Cell,
  PieChart,
  Pie
} from "recharts";
import { 
  getPastMonthsList, 
  formatMonthThai, 
  analyzeCustomer, 
  exportCustomerBehaviorToExcel,
  AnalyzedCustomerUsage 
} from "../utils/customerBehaviorAnalytics";
import RecordMonthlyUsageModal from "./RecordMonthlyUsageModal";

interface CustomerBehaviorReportViewProps {
  leads: Lead[];
  salespersons?: string[];
  currentUser?: string | null;
  onSelectLead?: (lead: Lead) => void;
  onUpdateLead?: (lead: Lead) => Promise<void> | void;
}

export default function CustomerBehaviorReportView({
  leads,
  salespersons = [],
  currentUser = null,
  onSelectLead = () => {},
  onUpdateLead = async () => {}
}: CustomerBehaviorReportViewProps) {
  const currentMonthStr = new Date().toISOString().substring(0, 7); // YYYY-MM
  const [monthsCount, setMonthsCount] = useState<number>(6);
  const [selectedSalesperson, setSelectedSalesperson] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | CustomerBehaviorStatus>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [metricDisplay, setMetricDisplay] = useState<"both" | "pieces" | "revenue">("both");
  const [activeTab, setActiveTab] = useState<"matrix" | "lost_retention" | "charts">("matrix");

  // Modal State
  const [isRecordModalOpen, setIsRecordModalOpen] = useState<boolean>(false);
  const [selectedLeadForEdit, setSelectedLeadForEdit] = useState<Lead | null>(null);
  const [selectedMonthForEdit, setSelectedMonthForEdit] = useState<string>(currentMonthStr);

  // Generate target months list
  const monthsList = useMemo(() => {
    return getPastMonthsList(currentMonthStr, monthsCount);
  }, [currentMonthStr, monthsCount]);

  // Target customers: leads that have been registered, activated, regular shippers, or explicitly marked lost
  const activeCustomersLeads = useMemo(() => {
    return leads.filter(l => 
      l.status === LeadStatus.REGISTERED || 
      l.status === LeadStatus.ACTIVATED || 
      l.status === LeadStatus.REGULAR ||
      l.status === LeadStatus.LOST ||
      (Array.isArray(l.monthlyUsage) && l.monthlyUsage.length > 0) ||
      (Number(l.shipmentsPerDay) > 0)
    );
  }, [leads]);

  // Analyze each customer
  const analyzedCustomers: AnalyzedCustomerUsage[] = useMemo(() => {
    return activeCustomersLeads.map(lead => analyzeCustomer(lead, monthsList));
  }, [activeCustomersLeads, monthsList]);

  // Filtered customers based on search and filters
  const filteredCustomers = useMemo(() => {
    return analyzedCustomers.filter(c => {
      const matchSp = selectedSalesperson === "all" || c.salesPerson === selectedSalesperson;
      const matchStatus = statusFilter === "all" || c.behaviorStatus === statusFilter;
      const matchSearch = !searchQuery || 
        c.shopName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.contactName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.phone.includes(searchQuery) ||
        c.customerCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.province.toLowerCase().includes(searchQuery.toLowerCase());

      return matchSp && matchStatus && matchSearch;
    }).sort((a, b) => {
      // If filtering lost, sort by highest lost impact
      if (statusFilter === "lost") {
        return b.lostRevenueImpact - a.lostRevenueImpact;
      }
      // Default: sort by highest total pieces
      return b.currentMonthPieces - a.currentMonthPieces || b.totalPieces - a.totalPieces;
    });
  }, [analyzedCustomers, selectedSalesperson, statusFilter, searchQuery]);

  // High-level summary stats
  const totalAnalyzedCount = analyzedCustomers.length;
  const growingCount = analyzedCustomers.filter(c => c.behaviorStatus === "growing").length;
  const activeCount = analyzedCustomers.filter(c => c.behaviorStatus === "active").length;
  const droppingCount = analyzedCustomers.filter(c => c.behaviorStatus === "dropping").length;
  const churnRiskCount = analyzedCustomers.filter(c => c.behaviorStatus === "churn_risk").length;
  const lostCount = analyzedCustomers.filter(c => c.behaviorStatus === "lost").length;

  const currentMonthTotalPieces = analyzedCustomers.reduce((acc, c) => acc + c.currentMonthPieces, 0);
  const currentMonthTotalRevenue = analyzedCustomers.reduce((acc, c) => acc + c.currentMonthRevenue, 0);
  const previousMonthTotalPieces = analyzedCustomers.reduce((acc, c) => acc + c.previousMonthPieces, 0);
  const totalLostRevenueImpact = analyzedCustomers
    .filter(c => c.behaviorStatus === "lost")
    .reduce((acc, c) => acc + c.lostRevenueImpact, 0);

  // Chart data: Monthly aggregate
  const monthlyAggregateChartData = useMemo(() => {
    return monthsList.map(m => {
      let totalPieces = 0;
      let totalRev = 0;
      let activeShops = 0;
      let lostShops = 0;

      analyzedCustomers.forEach(c => {
        const rec = c.monthlyRecords[m];
        if (rec) {
          totalPieces += rec.pieces || 0;
          totalRev += rec.revenue || 0;
          if (rec.pieces > 0) activeShops++;
          else lostShops++;
        }
      });

      return {
        month: m,
        monthName: formatMonthThai(m, true),
        totalPieces,
        totalRevenue: totalRev,
        activeShops,
        lostShops
      };
    });
  }, [monthsList, analyzedCustomers]);

  // Lost reasons breakdown
  const lostReasonsBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    analyzedCustomers.filter(c => c.behaviorStatus === "lost").forEach(c => {
      const reason = c.lostReason || "ไม่ระบุสาเหตุ / ยอด 0 ชิ้น";
      map[reason] = (map[reason] || 0) + 1;
    });

    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [analyzedCustomers]);

  const COLORS = ["#f43f5e", "#fb7185", "#f97316", "#f59e0b", "#6366f1", "#8b5cf6", "#64748b"];

  const handleOpenEdit = (lead: Lead, month: string = currentMonthStr, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedLeadForEdit(lead);
    setSelectedMonthForEdit(month);
    setIsRecordModalOpen(true);
  };

  const handleExport = () => {
    exportCustomerBehaviorToExcel(filteredCustomers, monthsList);
  };

  return (
    <div className="space-y-6" id="customer-behavior-report-container">
      
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-2xl border border-slate-700 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="p-2 rounded-xl bg-indigo-600/30 border border-indigo-400/40 text-indigo-300">
              <Activity className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold tracking-tight">
              รายงานวิเคราะห์พฤติกรรมลูกค้า & ยอดส่งรายเดือน (Customer Behavior & Churn Report)
            </h2>
            <span className="px-2.5 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full text-[10px] font-bold">
              ตรวจจับ Lost 0 ชิ้น อัตโนมัติ
            </span>
          </div>
          <p className="text-xs text-slate-300 max-w-3xl">
            สรุปยอดขายและจำนวนชิ้นของลูกค้าแต่ละรายในแต่ละเดือน ติดตามแนวโน้มการเติบโต และตรวจจับลูกค้าที่หยุดส่งพัสดุ (0 ชิ้น / 0 บาท) เพื่อวางแผนกู้คืนลูกค้าทันท่วงที
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            id="export-customer-behavior-excel-btn"
            onClick={handleExport}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
            title="ดาวน์โหลดรายงานสรุปพฤติกรรมลูกค้าและยอดรายเดือนเป็นไฟล์ Excel"
          >
            <Download className="w-4 h-4" />
            <span>Export รายงาน Excel</span>
          </button>
        </div>
      </div>

      {/* 4 Core Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Active Shippers */}
        <div 
          onClick={() => setStatusFilter("all")}
          className={`p-5 bg-white rounded-2xl border transition-all cursor-pointer shadow-xs hover:border-blue-300 ${
            statusFilter === "all" ? "ring-2 ring-blue-500 border-blue-500 bg-blue-50/20" : "border-slate-200"
          }`}
        >
          <div className="flex justify-between items-start">
            <span className="text-slate-500 text-xs font-semibold">ลูกค้าในระบบทั้งหมด</span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black font-mono text-slate-800">
            {totalAnalyzedCount} <span className="text-xs font-normal text-slate-400 font-sans">ราย</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1 font-mono">
            <span>เดือนนี้รวม {currentMonthTotalPieces.toLocaleString()} ชิ้น (฿{currentMonthTotalRevenue.toLocaleString()})</span>
          </div>
        </div>

        {/* Growing Shippers */}
        <div 
          onClick={() => setStatusFilter("growing")}
          className={`p-5 bg-white rounded-2xl border transition-all cursor-pointer shadow-xs hover:border-emerald-300 ${
            statusFilter === "growing" ? "ring-2 ring-emerald-500 border-emerald-500 bg-emerald-50/20" : "border-slate-200"
          }`}
        >
          <div className="flex justify-between items-start">
            <span className="text-slate-500 text-xs font-semibold">ลูกค้าเติบโตต่อเนื่อง (Growing)</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black font-mono text-emerald-600">
            {growingCount} <span className="text-xs font-normal text-slate-400 font-sans">ราย</span>
          </div>
          <div className="text-[11px] text-emerald-700 mt-1 flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>ยอดส่งเพิ่มขึ้นเมื่อเทียบกับเดือนก่อน</span>
          </div>
        </div>

        {/* Dropping / Churn Risk Shippers */}
        <div 
          onClick={() => setStatusFilter("dropping")}
          className={`p-5 bg-white rounded-2xl border transition-all cursor-pointer shadow-xs hover:border-amber-300 ${
            statusFilter === "dropping" || statusFilter === "churn_risk" ? "ring-2 ring-amber-500 border-amber-500 bg-amber-50/20" : "border-slate-200"
          }`}
        >
          <div className="flex justify-between items-start">
            <span className="text-slate-500 text-xs font-semibold">ยอดส่งลดลง / ชะลอตัว (Dropping)</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black font-mono text-amber-600">
            {droppingCount + churnRiskCount} <span className="text-xs font-normal text-slate-400 font-sans">ราย</span>
          </div>
          <div className="text-[11px] text-amber-700 mt-1 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>มีความเสี่ยงหลุด {churnRiskCount} ราย (ลดลง {">"}50%)</span>
          </div>
        </div>

        {/* Lost Shippers (0 Pieces / 0 THB) */}
        <div 
          onClick={() => setStatusFilter("lost")}
          className={`p-5 bg-white rounded-2xl border transition-all cursor-pointer shadow-xs hover:border-rose-300 ${
            statusFilter === "lost" ? "ring-2 ring-rose-500 border-rose-500 bg-rose-50/30" : "border-slate-200"
          }`}
        >
          <div className="flex justify-between items-start">
            <span className="text-rose-700 font-bold text-xs">ลูกค้าหยุดส่ง / Lost (0 ชิ้น)</span>
            <div className="p-2 rounded-xl bg-rose-100 text-rose-700 border border-rose-200 animate-pulse">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black font-mono text-rose-600">
            {lostCount} <span className="text-xs font-normal text-slate-400 font-sans">ราย</span>
          </div>
          <div className="text-[11px] text-rose-600 mt-1 flex items-center gap-1 font-mono">
            <span>สูญเสียยอดขายประเมิน ~฿{totalLostRevenueImpact.toLocaleString()}/ด.</span>
          </div>
        </div>

      </div>

      {/* Control Filters & View Tabs */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3">
          
          {/* Main View Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
            <button
              onClick={() => setActiveTab("matrix")}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "matrix" ? "bg-white text-blue-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>ตารางเปรียบเทียบยอดรายเดือน ({filteredCustomers.length})</span>
            </button>

            <button
              onClick={() => {
                setActiveTab("lost_retention");
                setStatusFilter("lost");
              }}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "lost_retention" ? "bg-rose-600 text-white shadow-xs" : "text-rose-600 hover:bg-rose-50"
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>ศูนย์ติดตามกู้คืนลูกค้า Lost ({lostCount})</span>
            </button>

            <button
              onClick={() => setActiveTab("charts")}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "charts" ? "bg-white text-indigo-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>กราฟแนวโน้ม & สถิติสาเหตุ</span>
            </button>
          </div>

          {/* Metric display mode (Pieces / Revenue / Both) */}
          <div className="flex items-center gap-2 text-xs flex-wrap">
            <span className="text-slate-400 font-medium">แสดงข้อมูล:</span>
            <div className="bg-slate-100 p-0.5 rounded-lg border border-slate-200 flex text-[11px]">
              <button
                onClick={() => setMetricDisplay("both")}
                className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
                  metricDisplay === "both" ? "bg-white text-slate-800 shadow-xs" : "text-slate-500"
                }`}
              >
                ทั้งชิ้น & ยอดขาย
              </button>
              <button
                onClick={() => setMetricDisplay("pieces")}
                className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
                  metricDisplay === "pieces" ? "bg-white text-amber-700 shadow-xs" : "text-slate-500"
                }`}
              >
                เฉพาะจำนวนชิ้น
              </button>
              <button
                onClick={() => setMetricDisplay("revenue")}
                className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
                  metricDisplay === "revenue" ? "bg-white text-emerald-700 shadow-xs" : "text-slate-500"
                }`}
              >
                เฉพาะยอดขาย (฿)
              </button>
            </div>

            {/* Months Count Dropdown */}
            <select
              value={monthsCount}
              onChange={(e) => setMonthsCount(parseInt(e.target.value, 10))}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value={3}>3 เดือนย้อนหลัง</option>
              <option value={6}>6 เดือนย้อนหลัง</option>
              <option value={12}>12 เดือน (1 ปีเต็ม)</option>
            </select>
          </div>

        </div>

        {/* Secondary Filter Row: Salesperson, Status, Search */}
        <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row gap-3 items-center justify-between">
          
          {/* Search Box */}
          <div className="relative w-full sm:w-80">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่อร้าน, ผู้ติดต่อ, เบอร์โทร, รหัสลูกค้า..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>

          {/* Behavior Status Badges Filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto max-w-full text-xs">
            {[
              { id: "all", label: "สถานะทั้งหมด", count: totalAnalyzedCount },
              { id: "growing", label: "🚀 เติบโต", count: growingCount },
              { id: "active", label: "🟢 ปกติ", count: activeCount },
              { id: "dropping", label: "🟡 ลดลง", count: droppingCount },
              { id: "churn_risk", label: "🟠 เสี่ยงหลุด", count: churnRiskCount },
              { id: "lost", label: "🔴 หยุดส่ง (Lost 0)", count: lostCount }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id as any)}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-colors cursor-pointer whitespace-nowrap ${
                  statusFilter === tab.id
                    ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>

          {/* Salesperson Selector */}
          <div className="w-full sm:w-auto flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium whitespace-nowrap">เซลส์:</span>
            <select
              value={selectedSalesperson}
              onChange={(e) => setSelectedSalesperson(e.target.value)}
              className="w-full sm:w-auto bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">ทุกคน (ภาพรวม)</option>
              {salespersons.map(sp => (
                <option key={sp} value={sp}>เซลส์: {sp}</option>
              ))}
            </select>
          </div>

        </div>
      </div>

      {/* VIEW 1: MONTHLY USAGE & REVENUE MATRIX */}
      {activeTab === "matrix" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-800">
                ตารางวิเคราะห์การใช้งานรายเดือน ({filteredCustomers.length} ร้านค้า)
              </h3>
              <span className="text-[10px] text-slate-400 font-mono">
                ช่วง {formatMonthThai(monthsList[0])} - {formatMonthThai(monthsList[monthsList.length - 1])}
              </span>
            </div>
            <span className="text-[11px] text-slate-400 hidden sm:inline">
              * คลิกที่ปุ่ม ✏️ เพื่อแก้ไขหรือบันทึกยอดส่ง/ยอดขายประจำเดือน
            </span>
          </div>

          <div className="overflow-x-auto">
            <table id="customer-behavior-matrix-table" className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-100/70 text-[11px] font-bold text-slate-600 uppercase">
                  <th className="py-3 pl-4 min-w-[200px]">ข้อมูลร้านค้า & รหัสลูกค้า</th>
                  <th className="py-3 text-center min-w-[90px]">เซลส์</th>
                  <th className="py-3 text-center min-w-[150px]">พฤติกรรมลูกค้า</th>
                  
                  {/* Dynamic Monthly Columns */}
                  {monthsList.map((m, idx) => (
                    <th 
                      key={m} 
                      className={`py-3 text-right px-3 min-w-[120px] ${
                        idx === monthsList.length - 1 ? "bg-blue-50/80 text-blue-900 border-x border-blue-200/60" : ""
                      }`}
                    >
                      <div>{formatMonthThai(m, true)}</div>
                      <div className="text-[9px] text-slate-400 font-normal">
                        {idx === monthsList.length - 1 ? "(เดือนล่าสุด)" : ""}
                      </div>
                    </th>
                  ))}

                  <th className="py-3 text-right pr-4 min-w-[140px]">ยอดรวมสะสม & แอ็กชัน</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCustomers.map((cust) => {
                  const isLost = cust.behaviorStatus === "lost";
                  return (
                    <tr 
                      key={cust.id}
                      onClick={() => onSelectLead(cust.lead)}
                      className={`hover:bg-slate-50/80 transition-colors cursor-pointer ${
                        isLost ? "bg-rose-50/20" : ""
                      }`}
                    >
                      {/* Customer Info */}
                      <td className="py-3.5 pl-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center font-bold text-slate-700 text-xs shrink-0 border border-slate-200">
                            {cust.shopName.substring(0, 1)}
                          </div>
                          <div>
                            <div className="font-bold text-slate-800 flex items-center gap-1.5">
                              <span>{cust.shopName}</span>
                              {cust.customerCode && (
                                <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-mono font-bold">
                                  {cust.customerCode}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                              <span>{cust.contactName}</span>
                              <span>•</span>
                              <span className="font-mono">{cust.phone}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Salesperson */}
                      <td className="py-3.5 text-center">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-bold rounded-lg text-[10px] border border-slate-200">
                          {cust.salesPerson}
                        </span>
                      </td>

                      {/* Behavior Health Status Badge */}
                      <td className="py-3.5 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className={`px-2.5 py-1 rounded-xl text-[10px] font-extrabold border ${cust.statusColor.bg} ${cust.statusColor.text} ${cust.statusColor.border}`}>
                            {cust.statusLabel}
                          </span>
                          {cust.lostReason && (
                            <span className="text-[9px] text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 max-w-[140px] truncate" title={cust.lostReason}>
                              {cust.lostReason}
                            </span>
                          )}
                          {cust.momPiecesGrowth !== null && !isLost && (
                            <span className={`text-[10px] font-mono font-bold flex items-center gap-0.5 ${
                              cust.momPiecesGrowth >= 0 ? "text-emerald-600" : "text-amber-600"
                            }`}>
                              {cust.momPiecesGrowth >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                              {cust.momPiecesGrowth > 0 ? `+${cust.momPiecesGrowth}%` : `${cust.momPiecesGrowth}%`} MoM
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Monthly Columns */}
                      {monthsList.map((m, idx) => {
                        const rec = cust.monthlyRecords[m] || { pieces: 0, revenue: 0 };
                        const isZero = rec.pieces === 0;
                        const isLatest = idx === monthsList.length - 1;

                        return (
                          <td 
                            key={m} 
                            className={`py-3.5 px-3 text-right font-mono ${
                              isLatest ? "bg-blue-50/40 border-x border-blue-200/40" : ""
                            }`}
                          >
                            {isZero ? (
                              <div className="text-slate-300 font-normal text-xs">
                                <span className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px] text-slate-400">0 ชิ้น</span>
                              </div>
                            ) : (
                              <div>
                                {(metricDisplay === "both" || metricDisplay === "pieces") && (
                                  <div className="font-bold text-slate-800 text-xs flex items-center justify-end gap-1">
                                    <span>{rec.pieces.toLocaleString()}</span>
                                    <span className="text-[9px] font-sans text-slate-400">ชิ้น</span>
                                  </div>
                                )}
                                {(metricDisplay === "both" || metricDisplay === "revenue") && (
                                  <div className="text-[10px] text-emerald-600 font-semibold">
                                    ฿{rec.revenue.toLocaleString()}
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                        );
                      })}

                      {/* Summary & Edit Actions */}
                      <td className="py-3.5 pr-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="text-right">
                            <div className="font-extrabold text-slate-900 font-mono text-xs">
                              {cust.totalPieces.toLocaleString()} ชิ้น
                            </div>
                            <div className="text-[10px] font-mono text-emerald-700 font-bold">
                              ฿{cust.totalRevenue.toLocaleString()}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => handleOpenEdit(cust.lead, currentMonthStr, e)}
                            className="p-1.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-600 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                            title="บันทึก/แก้ไขยอดส่งรายเดือน"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredCustomers.length === 0 && (
                  <tr>
                    <td colSpan={monthsList.length + 4} className="py-12 text-center text-slate-400">
                      <div className="max-w-xs mx-auto space-y-2">
                        <Package className="w-8 h-8 mx-auto text-slate-300" />
                        <p className="text-xs font-bold text-slate-600">ไม่พบข้อมูลลูกค้าตามเงื่อนไขที่เลือก</p>
                        <p className="text-[11px] text-slate-400">ลองเปลี่ยนตัวกรองสถานะ หรือค้นหาด้วยชื่ออื่น</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 2: LOST & CHURN RETENTION HUB */}
      {activeTab === "lost_retention" && (
        <div className="space-y-6 animate-in fade-in">
          
          {/* Lost Banner Callout */}
          <div className="p-5 bg-gradient-to-r from-rose-50 via-rose-100/50 to-amber-50 border border-rose-200 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-start gap-3">
              <div className="p-3 bg-rose-600 text-white rounded-2xl shadow-sm">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-rose-950">
                  ศูนย์ติดตามและกู้คืนลูกค้าที่หยุดส่งพัสดุ (Lost Customers Retention Hub)
                </h3>
                <p className="text-xs text-rose-700 mt-0.5">
                  พบลูกค้าที่หยุดส่ง (ยอด 0 ชิ้น / 0 บาท) รวมทั้งสิ้น <span className="font-bold font-mono">{lostCount} ราย</span> คิดเป็นมูลค่ายอดขายที่สูญเสียประมาณ <span className="font-bold font-mono">฿{totalLostRevenueImpact.toLocaleString()} / เดือน</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setStatusFilter("lost")}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
              >
                กรองเฉพาะลูกค้า Lost ({lostCount})
              </button>
            </div>
          </div>

          {/* Grid of Lost Customers */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {analyzedCustomers.filter(c => c.behaviorStatus === "lost").map(cust => (
              <div 
                key={cust.id}
                onClick={() => onSelectLead(cust.lead)}
                className="bg-white rounded-2xl border border-rose-200 hover:border-rose-400 p-5 shadow-xs transition-all space-y-4 cursor-pointer relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 right-0 h-1 bg-rose-500" />
                
                {/* Header */}
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                      <span>{cust.shopName}</span>
                      {cust.customerCode && (
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono font-bold">
                          {cust.customerCode}
                        </span>
                      )}
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      ผู้ติดต่อ: {cust.contactName} ({cust.phone})
                    </p>
                  </div>

                  <span className="px-2 py-0.5 bg-rose-100 text-rose-800 font-bold rounded-lg text-[10px] border border-rose-200">
                    0 ชิ้น (Lost)
                  </span>
                </div>

                {/* Lost Info Block */}
                <div className="p-3 bg-rose-50/70 border border-rose-100 rounded-xl space-y-1.5 text-xs">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-rose-700 font-bold">สาเหตุที่หยุดส่ง:</span>
                    <span className="text-rose-900 font-semibold">{cust.lostReason || "ไม่ระบุสาเหตุ / ยอดตกเป็น 0"}</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-500">ยอดเคยส่งเฉลี่ย:</span>
                    <span className="font-mono font-bold text-slate-700">{cust.avgMonthlyPieces.toLocaleString()} ชิ้น/ด.</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-500">มูลค่าสูญเสียประเมิน:</span>
                    <span className="font-mono font-bold text-rose-600">~฿{cust.lostRevenueImpact.toLocaleString()}/ด.</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-500">เซลส์ผู้ดูแล:</span>
                    <span className="font-bold text-slate-700">{cust.salesPerson}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                  <a
                    href={`tel:${cust.phone}`}
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl font-bold border border-rose-200 transition-colors"
                  >
                    <PhoneCall className="w-3.5 h-3.5 text-rose-600" />
                    <span>โทรติดตามด่วน</span>
                  </a>

                  <button
                    type="button"
                    onClick={(e) => handleOpenEdit(cust.lead, currentMonthStr, e)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-xs transition-colors cursor-pointer"
                  >
                    <HeartHandshake className="w-3.5 h-3.5" />
                    <span>บันทึกดึงกลับมา</span>
                  </button>
                </div>
              </div>
            ))}

            {lostCount === 0 && (
              <div className="col-span-full py-12 bg-white rounded-2xl border border-slate-200 text-center space-y-2">
                <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto" />
                <h4 className="font-bold text-slate-800 text-sm">ยอดเยี่ยม! ขณะนี้ยังไม่มีลูกค้ารายใดที่หยุดส่งพัสดุ (0 ชิ้น)</h4>
                <p className="text-xs text-slate-400">ลูกค้าทุกรายยังคงมีการจัดส่งพัสดุและสร้างยอดขายอย่างต่อเนื่อง</p>
              </div>
            )}
          </div>

        </div>
      )}

      {/* VIEW 3: CHARTS & STATS */}
      {activeTab === "charts" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in">
          
          {/* Monthly Trend Chart */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs lg:col-span-8 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">
                  แนวโน้มจำนวนชิ้น & ยอดขายรายเดือน (Monthly Usage & Revenue Trend)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  ติดตามภาพรวมการส่งพัสดุและรายได้รวมในแต่ละเดือน
                </p>
              </div>
              <BarChart3 className="w-4 h-4 text-blue-500" />
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyAggregateChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="monthName" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: '#10b981' }} axisLine={false} tickLine={false} />
                  <Tooltip 
                    formatter={(val: any, name: string) => {
                      if (name === "totalPieces") return [`${Number(val).toLocaleString()} ชิ้น`, "จำนวนชิ้นรวม"];
                      if (name === "totalRevenue") return [`฿${Number(val).toLocaleString()}`, "ยอดขายรวม"];
                      return [val, name];
                    }}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '11px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend 
                    formatter={(val) => val === "totalPieces" ? "จำนวนชิ้นรวม (ชิ้น)" : "ยอดขายรวม (บาท)"}
                    wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                  />
                  <Bar yAxisId="left" dataKey="totalPieces" fill="#3b82f6" radius={[6, 6, 0, 0]} maxBarSize={40} />
                  <Bar yAxisId="right" dataKey="totalRevenue" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Lost Reasons Pie Chart */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs lg:col-span-4 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-slate-800 text-sm">
                  สถิติสาเหตุที่ลูกค้าหยุดส่ง (Lost Reasons)
                </h3>
                <PieChartIcon className="w-4 h-4 text-rose-500" />
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                วิเคราะห์ Pain Points เพื่อปรับปรุงบริการและเรทราคา
              </p>
            </div>

            {lostReasonsBreakdown.length > 0 ? (
              <>
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={lostReasonsBreakdown}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={70}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {lostReasonsBreakdown.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '11px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-1.5 text-xs">
                  {lostReasonsBreakdown.map((r, idx) => (
                    <div key={r.name} className="flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1.5 truncate max-w-[200px]">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                        <span className="text-slate-700 truncate">{r.name}</span>
                      </div>
                      <span className="font-bold font-mono text-slate-900">{r.value} ร้าน</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="py-12 text-center text-slate-400 space-y-1 text-xs">
                <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto" />
                <p className="font-bold text-slate-600">ยังไม่มีข้อมูลลูกค้าที่หยุดส่ง</p>
              </div>
            )}
          </div>

        </div>
      )}

      {/* Record & Edit Monthly Usage Modal */}
      <RecordMonthlyUsageModal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        lead={selectedLeadForEdit}
        initialMonth={selectedMonthForEdit}
        onUpdateLead={onUpdateLead}
      />

    </div>
  );
}
