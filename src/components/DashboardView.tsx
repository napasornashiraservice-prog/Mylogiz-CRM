import React, { useState, useMemo } from "react";
import { Lead, LeadStatus, StatusLabels, SalesKpiStore, DEFAULT_KPI_TARGETS } from "../types";
import SalesKpiDashboard from "./SalesKpiDashboard";
import CustomerBehaviorReportView from "./CustomerBehaviorReportView";
import WinLossReasonAnalysis from "./WinLossReasonAnalysis";
import { 
  Users, UserCheck, FileText, PhoneCall, CheckCircle, TrendingUp, 
  AlertTriangle, ArrowUpRight, Award, Flame, BarChart3, HelpCircle,
  Filter, Layers, Sparkles, Megaphone, Target, ArrowRight, Activity, ShieldAlert
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
  Cell 
} from "recharts";

interface DashboardViewProps {
  leads: Lead[];
  salespersons?: string[];
  campaigns?: string[];
  currentUser?: string | null;
  kpiTargets?: SalesKpiStore;
  onSaveKpiTargets?: (updated: SalesKpiStore) => Promise<boolean> | void;
  onNavigate: (tab: string) => void;
  onSelectLead: (lead: Lead) => void;
  onUpdateLead?: (lead: Lead) => void;
}

export default function DashboardView({ 
  leads, 
  salespersons = [], 
  campaigns = [],
  currentUser = null,
  kpiTargets = DEFAULT_KPI_TARGETS,
  onSaveKpiTargets = () => {},
  onNavigate, 
  onSelectLead, 
  onUpdateLead 
}: DashboardViewProps) {
  const todayStr = new Date().toISOString().split("T")[0];
  const currentMonthStr = new Date().toISOString().substring(0, 7); // YYYY-MM

  // Calculates stats
  const leadsToday = leads.filter(l => l.createdAt.startsWith(todayStr)).length;
  const leadsThisMonth = leads.filter(l => l.createdAt.startsWith(currentMonthStr)).length;
  const registeredCount = leads.filter(l => l.status === LeadStatus.REGISTERED).length;
  const waitingDocsCount = leads.filter(l => l.status === LeadStatus.WAITING_DOCS).length;
  const wonCount = leads.filter(l => 
    l.status === LeadStatus.ACTIVATED || l.status === LeadStatus.REGULAR
  ).length;

  // Active followups today
  const followUpTodayLeads = leads.filter(l => 
    l.followUp && 
    l.followUp.date === todayStr && 
    !l.followUp.isCompleted
  );

  // Overdue followups
  const overdueFollowUpLeads = leads.filter(l => 
    l.followUp && 
    l.followUp.date < todayStr && 
    !l.followUp.isCompleted
  );

  // Conversion rate (Registered, Activated, Regular / Total Leads)
  const totalLeadsCount = leads.length;
  const convertedLeadsCount = leads.filter(l => 
    l.status === LeadStatus.REGISTERED || 
    l.status === LeadStatus.ACTIVATED || 
    l.status === LeadStatus.REGULAR
  ).length;
  const conversionRate = totalLeadsCount > 0 
    ? Math.round((convertedLeadsCount / totalLeadsCount) * 100) 
    : 0;

  // Monthly stats
  const monthlyLeads = leads.filter(l => l.createdAt.startsWith(currentMonthStr));
  const monthlyLeadsCount = monthlyLeads.length;
  const monthlyRegisteredCount = monthlyLeads.filter(l => 
    l.status === LeadStatus.REGISTERED || 
    l.status === LeadStatus.ACTIVATED || 
    l.status === LeadStatus.REGULAR
  ).length;
  const monthlyConversion = monthlyLeadsCount > 0 
    ? Math.round((monthlyRegisteredCount / monthlyLeadsCount) * 100) 
    : 0;

  // Top Dashboard Hub Mode State
  const [dashboardMode, setDashboardMode] = useState<"sales_kpi" | "customer_behavior">("sales_kpi");

  // Pipeline Funnel State & Calculation
  const [funnelSalesperson, setFunnelSalesperson] = useState<string>("all");

  const salespersonsList = Array.from(
    new Set(leads.map(l => l.salesPerson).filter(Boolean))
  );

  const funnelFilteredLeads = funnelSalesperson === "all"
    ? leads
    : leads.filter(l => l.salesPerson === funnelSalesperson);

  const funnelTotalCount = funnelFilteredLeads.length;

  const pipelineFunnelData = [
    { name: "Lead ใหม่", fullName: "🟡 Lead ใหม่", count: funnelFilteredLeads.filter(l => l.status === LeadStatus.NEW_LEAD).length, fill: "#fbbf24" },
    { name: "ติดต่อแล้ว", fullName: "🟠 ติดต่อแล้ว", count: funnelFilteredLeads.filter(l => l.status === LeadStatus.CONTACTED).length, fill: "#f97316" },
    { name: "รอพิจารณา", fullName: "🔵 รอพิจารณา", count: funnelFilteredLeads.filter(l => l.status === LeadStatus.SENT_DETAILS).length, fill: "#3b82f6" },
    { name: "นัด Meeting", fullName: "📅 นัด Meeting", count: funnelFilteredLeads.filter(l => l.status === LeadStatus.MEETING).length, fill: "#6366f1" },
    { name: "รอเอกสาร", fullName: "🟣 รอเอกสาร", count: funnelFilteredLeads.filter(l => l.status === LeadStatus.WAITING_DOCS).length, fill: "#a855f7" },
    { name: "ปิดการขาย", fullName: "🟢 ปิดการขาย (สมัครแล้ว)", count: funnelFilteredLeads.filter(l => l.status === LeadStatus.REGISTERED).length, fill: "#22c55e" },
    { name: "เปิดใช้งานแล้ว", fullName: "✅ เปิดใช้งานแล้ว", count: funnelFilteredLeads.filter(l => l.status === LeadStatus.ACTIVATED).length, fill: "#10b981" },
    { name: "ใช้งานประจำ", fullName: "⭐ ใช้งานประจำ", count: funnelFilteredLeads.filter(l => l.status === LeadStatus.REGULAR).length, fill: "#eab308" },
    { name: "ปฏิเสธ / Lost", fullName: "❌ ปฏิเสธ / Lost", count: funnelFilteredLeads.filter(l => l.status === LeadStatus.LOST || l.status === LeadStatus.NOT_INTERESTED || l.status === LeadStatus.NO_CONTACT).length, fill: "#f43f5e" }
  ];

  // Acquisition Channels Analytics
  const channels = ["Facebook", "TikTok", "Website", "Line OA", "โทรเข้า", "คนแนะนำ"];
  const channelData = useMemo(() => {
    // Collect all channels from leads and standard list
    const allChannels = Array.from(new Set([...channels, ...leads.map(l => l.channel).filter(Boolean)]));
    return allChannels.map(chan => {
      const chanLeads = leads.filter(l => l.channel === chan);
      const chanLeadsCount = chanLeads.length;
      const chanRegistered = chanLeads.filter(l => 
        l.status === LeadStatus.REGISTERED || 
        l.status === LeadStatus.ACTIVATED || 
        l.status === LeadStatus.REGULAR
      ).length;
      const conversion = chanLeadsCount > 0 ? Math.round((chanRegistered / chanLeadsCount) * 100) : 0;

      return {
        name: chan,
        leads: chanLeadsCount,
        registered: chanRegistered,
        conversion
      };
    }).filter(c => c.leads > 0).sort((a, b) => b.leads - a.leads);
  }, [leads]);

  // Find best performing channel by conversion (with at least 1 lead)
  const bestChannelByConversion = useMemo(() => {
    return [...channelData]
      .filter(c => c.leads > 0)
      .sort((a, b) => b.conversion - a.conversion || b.registered - a.registered)[0] || null;
  }, [channelData]);

  // Campaign analytics
  const campaignData = useMemo(() => {
    const campaignMap: Record<string, { leads: number; registered: number }> = {};
    leads.forEach(l => {
      const cName = l.campaign || "ไม่ได้ระบุแคมเปญ";
      if (!campaignMap[cName]) campaignMap[cName] = { leads: 0, registered: 0 };
      campaignMap[cName].leads += 1;
      if (l.status === LeadStatus.REGISTERED || l.status === LeadStatus.ACTIVATED || l.status === LeadStatus.REGULAR) {
        campaignMap[cName].registered += 1;
      }
    });

    return Object.entries(campaignMap).map(([name, stat]) => {
      const conversion = stat.leads > 0 ? Math.round((stat.registered / stat.leads) * 100) : 0;
      return { name, ...stat, conversion };
    }).sort((a, b) => b.leads - a.leads);
  }, [leads]);

  // Alerts logic
  const alertCallsCount = overdueFollowUpLeads.length + followUpTodayLeads.length;
  const alertDocsCount = leads.filter(l => {
    const docs = l.documents;
    const isCorp = l.customerType === "corporate";
    if (isCorp) {
      return l.status === LeadStatus.WAITING_DOCS && (!docs.idCard || !docs.companyReg || !docs.taxDoc || !docs.storefrontPhoto);
    } else {
      return l.status === LeadStatus.WAITING_DOCS && (!docs.idCard || !docs.storefrontPhoto);
    }
  }).length;
  const alertActivationsCount = leads.filter(l => l.status === LeadStatus.REGISTERED).length;

  return (
    <div className="space-y-8" id="dashboard-container">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-6 rounded-2xl shadow-sm border border-slate-700">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight font-sans">ภาพรวม & รายงานยอดขาย (Overview & Sales Reports)</h1>
            <span className="px-2.5 py-0.5 bg-blue-600/50 border border-blue-400/40 rounded-full text-[10px] font-bold text-blue-200">
              Unified Hub
            </span>
          </div>
          <p className="text-slate-300 text-sm mt-1">
            ศูนย์รวมข้อมูลสถิติ ติดตาม KPI เซลล์รายบุคคล รายงานประสิทธิภาพช่องทางการตลาด และตารางงานติดตามลูกค้าแบบเรียลไทม์
          </p>
        </div>
        <div className="flex gap-2.5 flex-wrap">
          <button 
            id="nav-to-leads-btn"
            onClick={() => onNavigate("leads")} 
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-xs cursor-pointer"
          >
            <Users className="w-4 h-4" /> บอร์ด Pipeline
          </button>
          <button 
            id="nav-to-followup-btn"
            onClick={() => onNavigate("followup")} 
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all border border-slate-700 cursor-pointer"
          >
            <PhoneCall className="w-4 h-4" /> นัดติดตามวันนี้
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { 
            id: "stat-leads-today",
            title: "Lead เข้าวันนี้", 
            value: leadsToday, 
            desc: `เดือนนี้สะสม ${leadsThisMonth} ราย`, 
            icon: Users, 
            color: "text-blue-600 bg-blue-50 border-blue-100" 
          },
          { 
            id: "stat-registered",
            title: "สมัครสมาชิกสำเร็จ", 
            value: registeredCount, 
            desc: "รอตรวจสอบเอกสารและอนุมัติ", 
            icon: UserCheck, 
            color: "text-green-600 bg-green-50 border-green-100" 
          },
          { 
            id: "stat-waiting-docs",
            title: "กำลังรอเอกสาร", 
            value: waitingDocsCount, 
            desc: "ติดตามเอกสารเพิ่มเติมเพื่อเปิดพอร์ต", 
            icon: FileText, 
            color: "text-purple-600 bg-purple-50 border-purple-100" 
          },
          { 
            id: "stat-won-clients",
            title: "ปิดการขายสำเร็จ (Won)", 
            value: wonCount, 
            desc: "เปิดรหัสพอร์ต & ส่งพัสดุแล้ว", 
            icon: CheckCircle, 
            color: "text-emerald-600 bg-emerald-50 border-emerald-100" 
          }
        ].map((stat, idx) => (
          <motion.div
            key={stat.title}
            id={stat.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: idx * 0.05 }}
            className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-start justify-between"
          >
            <div className="space-y-1">
              <span className="text-slate-500 text-xs font-semibold">{stat.title}</span>
              <div className="text-2xl font-black font-mono tracking-tight text-slate-800">{stat.value}</div>
              <span className="text-slate-400 text-[11px] block">{stat.desc}</span>
            </div>
            <div className={`p-2.5 rounded-xl border ${stat.color}`}>
              <stat.icon className="w-5 h-5" />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Main Hub Navigation Tabs: Sales KPI vs Customer Behavior */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-3 flex-wrap">
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-2xl border border-slate-200 text-xs font-bold">
          <button
            id="tab-sales-kpi-hub-btn"
            onClick={() => setDashboardMode("sales_kpi")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all cursor-pointer ${
              dashboardMode === "sales_kpi"
                ? "bg-white text-blue-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Target className="w-4 h-4 text-blue-600" />
            <span>ภาพรวมยอดขาย & KPI เซลส์</span>
          </button>

          <button
            id="tab-customer-behavior-hub-btn"
            onClick={() => setDashboardMode("customer_behavior")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all cursor-pointer ${
              dashboardMode === "customer_behavior"
                ? "bg-white text-indigo-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Activity className="w-4 h-4 text-indigo-600" />
            <span>วิเคราะห์พฤติกรรมลูกค้า & ยอดส่งรายเดือน (Lost / 0 ชิ้น)</span>
            <span className="px-2 py-0.5 bg-rose-100 text-rose-700 rounded-full text-[10px] font-mono">
              Auto Lost
            </span>
          </button>
        </div>

        <span className="text-xs text-slate-400 font-sans hidden sm:inline">
          {dashboardMode === "sales_kpi" 
            ? "📊 ติดตามผลงานทีมขายและการปิดดีลแยกตามช่องทาง" 
            : "🔍 วิเคราะห์ประวัติยอดส่ง ยอดขายรายเดือน และตรวจจับลูกค้าหยุดส่ง (0 ชิ้น)"}
        </span>
      </div>
      
      {/* Dynamic View Section based on dashboardMode */}
      {dashboardMode === "customer_behavior" ? (
        <CustomerBehaviorReportView
          leads={leads}
          salespersons={salespersons}
          currentUser={currentUser}
          onSelectLead={onSelectLead}
          onUpdateLead={onUpdateLead}
        />
      ) : (
        <>
          {/* 2. Sales KPI & Individual Salesperson Performance Dashboard */}
          <SalesKpiDashboard
            leads={leads}
            salespersons={salespersons}
            currentUser={currentUser}
            kpiTargets={kpiTargets}
            onSaveKpiTargets={onSaveKpiTargets}
            onSelectLead={onSelectLead}
            onNavigate={onNavigate}
          />

          {/* 3. Marketing Channels & Campaign Analytics Section */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Acquisition Channel Breakdown Table */}
            <div id="reports-channels-table-card" className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs lg:col-span-8 space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-slate-800 font-bold text-sm">การปิดดีลแยกตามช่องทางแนะนำ (Lead Source Breakdown)</h3>
                    <span className="text-[10px] bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded border border-blue-200">
                      {channelData.length} ช่องทาง
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">ช่วยวิเคราะห์งบประเมินการตลาดเพื่อหาแหล่งที่สร้างยอดปิดดีลสูงสุด</p>
                </div>
                <BarChart3 className="w-4 h-4 text-blue-500" />
              </div>

              <div className="overflow-x-auto text-xs">
                <table id="reports-channels-table" className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-[11px] text-slate-500 font-semibold uppercase bg-slate-50/70">
                      <th className="py-2.5 pl-3 rounded-l-lg">ช่องทางการตลาด</th>
                      <th className="py-2.5 text-center">จำนวน Lead ทั้งหมด</th>
                      <th className="py-2.5 text-center">สมัครสำเร็จ (Won)</th>
                      <th className="py-2.5 text-right pr-3 rounded-r-lg">อัตราปิดการขาย (Conversion)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {channelData.map((ch, idx) => (
                      <tr key={ch.name} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 pl-3 font-bold text-slate-700 flex items-center gap-2">
                          <span className="w-5 h-5 bg-slate-100 text-[10px] text-slate-600 font-bold rounded-full flex items-center justify-center border border-slate-200">
                            {idx + 1}
                          </span>
                          {ch.name}
                        </td>
                        <td className="py-3 text-center font-semibold font-mono text-slate-600">{ch.leads} ราย</td>
                        <td className="py-3 text-center font-bold font-mono text-emerald-600">{ch.registered} ราย</td>
                        <td className="py-3 pr-3 text-right font-bold text-slate-900 font-mono">
                          <div className="flex items-center justify-end gap-2.5">
                            <span className="text-blue-600 font-extrabold">{ch.conversion}%</span>
                            <div className="w-20 bg-slate-100 h-1.5 rounded-full overflow-hidden hidden md:block">
                              <div className="bg-blue-600 h-full rounded-full transition-all" style={{ width: `${ch.conversion}%` }} />
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {channelData.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-slate-400">ยังไม่มีข้อมูลช่องทางการตลาด</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Campaign summary pills */}
              {campaignData.length > 0 && (
                <div className="pt-3 border-t border-slate-100">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
                    <Megaphone className="w-3.5 h-3.5 text-blue-600" /> สรุปผลลัพธ์ตามแคมเปญโฆษณา (Campaigns)
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {campaignData.slice(0, 6).map(c => (
                      <div key={c.name} className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 text-[11px] flex items-center gap-2">
                        <span className="font-bold text-slate-700">{c.name}:</span>
                        <span className="font-mono text-slate-500">{c.leads} Leads</span>
                        <span className="font-mono text-emerald-600 font-bold">({c.conversion}%)</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Best closing channel widget card */}
            <div id="reports-best-channel-card" className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs lg:col-span-4 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full font-bold">
                    ข้อมูลวิเคราะห์เชิงรุก
                  </span>
                  <Sparkles className="w-4 h-4 text-amber-500" />
                </div>
                <h3 className="text-slate-800 font-bold text-sm mt-2.5">ช่องทางปิดการขายดีเด่น</h3>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  ช่องทางที่ส่งผู้สมัครขนส่งเข้ามา แล้วสามารถปิดดีลและเปิดใช้งานพอร์ตสำเร็จสูงสุด
                </p>
              </div>

              {bestChannelByConversion ? (
                <div className="py-2 space-y-4">
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50/50 p-4 rounded-xl border border-blue-100 text-center space-y-1 shadow-2xs">
                    <span className="text-[10px] text-blue-600 uppercase font-black tracking-wider">🏆 แชมป์เปี้ยนช่องทาง</span>
                    <h4 className="text-xl font-black text-blue-950 font-sans">{bestChannelByConversion.name}</h4>
                    <div className="text-blue-700 font-bold font-mono text-xs mt-1">
                      อัตราปิดการขาย: {bestChannelByConversion.conversion}%
                    </div>
                  </div>

                  <div className="text-xs text-slate-600 space-y-1.5 pl-1 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">นำเข้าลูกค้าทั้งหมด:</span>
                      <span className="font-bold text-slate-900 font-mono">{bestChannelByConversion.leads} ราย</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">สมัครสำเร็จ (Won):</span>
                      <span className="font-bold text-emerald-600 font-mono">{bestChannelByConversion.registered} ราย</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-slate-400 text-xs">ยังไม่มีประวัติการปิดดีลมากพอ</div>
              )}

              <div className="text-[10px] text-slate-400 text-center border-t border-slate-100 pt-2">
                💡 แนะนำจัดสรรมาร์เก็ตติ้งและทีมเซลส์ลงช่องทางนี้เป็นหลัก
              </div>
            </div>

          </div>

          {/* 4. Sales Win / Loss & Rejection Reason Analysis Section */}
          <WinLossReasonAnalysis
            leads={leads}
            salespersons={salespersons}
            currentUser={currentUser}
            onSelectLead={onSelectLead}
          />
        </>
      )}

      {/* Pipeline Funnel Bar Chart Card */}
      <div id="pipeline-funnel-chart-card" className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-slate-800 font-bold text-base">สรุปจำนวน Lead ตามสถานะ (Pipeline Funnel)</h3>
              <p className="text-xs text-slate-400">ภาพรวมความคืบหน้าของทีมในแต่ละขั้นตอนของ Sales Pipeline</p>
            </div>
          </div>

          {/* Salesperson Filter */}
          {salespersonsList.length > 0 && (
            <div className="flex items-center gap-2 self-start sm:self-center">
              <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" /> กรองทีม:
              </span>
              <select
                id="funnel-salesperson-select"
                value={funnelSalesperson}
                onChange={(e) => setFunnelSalesperson(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="all">ทุกคนในทีม (ภาพรวมทั้งหมด)</option>
                {salespersonsList.map(sp => (
                  <option key={sp} value={sp}>{sp}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Recharts Bar Chart */}
        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={pipelineFunnelData} margin={{ top: 20, right: 20, left: -10, bottom: 25 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 11, fill: "#64748b" }} 
                interval={0}
                angle={-15}
                textAnchor="end"
                height={45}
              />
              <YAxis 
                allowDecimals={false} 
                tick={{ fontSize: 11, fill: "#64748b" }} 
              />
              <Tooltip 
                cursor={{ fill: "rgba(241, 245, 249, 0.6)" }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    const pct = funnelTotalCount > 0 ? Math.round((data.count / funnelTotalCount) * 100) : 0;
                    return (
                      <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl border border-slate-700 text-xs space-y-1">
                        <p className="font-bold text-slate-100">{data.fullName}</p>
                        <p className="text-slate-300">
                          จำนวน: <span className="font-mono font-bold text-blue-400 text-sm">{data.count}</span> ราย
                        </p>
                        <p className="text-[10px] text-slate-400">
                          สัดส่วน: {pct}% ของ Lead ทั้งหมด ({funnelTotalCount} ราย)
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="count" radius={[6, 6, 0, 0]} barSize={36}>
                {pipelineFunnelData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Stage Badges Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 pt-2 border-t border-slate-100">
          {pipelineFunnelData.map(item => (
            <div 
              key={item.name} 
              className="bg-slate-50 p-2 rounded-xl border border-slate-100 text-center space-y-0.5"
            >
              <div className="flex items-center justify-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: item.fill }} />
                <span className="text-[10px] text-slate-500 font-medium truncate">{item.name}</span>
              </div>
              <div className="text-sm font-bold font-mono text-slate-800">{item.count} <span className="text-[10px] font-normal text-slate-400">ราย</span></div>
            </div>
          ))}
        </div>
      </div>

      {/* Grid: Conversion Rate & Automatic Alert Center */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Metric 1: Conversion Gauge */}
        <div id="dashboard-conversion-card" className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-slate-800 font-bold text-sm">อัตรา Conversion Rate</h2>
              <TrendingUp className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-xs text-slate-400 mt-1">สัดส่วนผู้สมัครใช้งานสำเร็จจาก Lead ทั้งหมด</p>
          </div>
          <div className="py-6 flex flex-col items-center justify-center">
            <div className="relative flex items-center justify-center">
              {/* Simple visual indicator */}
              <svg className="w-28 h-28 transform -rotate-90">
                <circle cx="56" cy="56" r="46" className="text-slate-100" strokeWidth="8" stroke="currentColor" fill="transparent" />
                <circle cx="56" cy="56" r="46" className="text-blue-600 transition-all duration-1000" strokeWidth="8" strokeDasharray={2 * Math.PI * 46} strokeDashoffset={2 * Math.PI * 46 * (1 - conversionRate / 100)} strokeLinecap="round" stroke="currentColor" fill="transparent" />
              </svg>
              <div className="absolute text-center">
                <span className="text-2xl font-black font-mono text-slate-800">{conversionRate}%</span>
                <span className="text-[9px] text-slate-400 block font-medium">สำเร็จ</span>
              </div>
            </div>
            <div className="text-center mt-3 space-y-1">
              <p className="text-xs text-slate-600">ปิดการขายได้ <span className="font-bold text-blue-600">{convertedLeadsCount}</span> จากทั้งหมด <span className="font-bold text-slate-800">{totalLeadsCount}</span> ราย</p>
            </div>
          </div>
          <button 
            id="view-report-from-conv-btn"
            onClick={() => onNavigate("leads")} 
            className="w-full text-center py-2 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            เปิดดูรายละเอียดใน Pipeline <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {/* Metric 2: Smart Notification Center (ระบบแจ้งเตือนอัตโนมัติ) */}
        <div id="dashboard-alerts-card" className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs md:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-slate-800 font-bold text-sm">การแจ้งเตือนงานวันนี้ (Smart Alerts)</h2>
              <span className="bg-amber-100 text-amber-800 text-[10px] px-2.5 py-0.5 rounded-full font-bold">สรุปสถานะล่าสุด</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">สิ่งที่คุณและทีมต้องเร่งติดตามเพื่อปิดการขายขนส่ง</p>
          </div>

          <div className="my-4 space-y-3">
            {/* Urgent Calls */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-rose-50 border border-rose-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-rose-100 text-rose-700 rounded-xl">
                  <PhoneCall className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-rose-900">นัดหมายติดต่อลูกค้าวันนี้ / ค้างสาย</h4>
                  <p className="text-[10px] text-rose-700">ต้องโทรติดตามความคืบหน้าให้เสร็จสิ้นภายในวันนี้</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-sm font-bold text-rose-800 font-mono">{alertCallsCount} ราย</span>
                <button 
                  id="alert-calls-follow-link"
                  onClick={() => onNavigate("followup")} 
                  className="text-[10px] text-rose-600 hover:underline block font-semibold cursor-pointer"
                >
                  โทรตอนนี้ →
                </button>
              </div>
            </div>

            {/* Waiting Docs */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50 border border-amber-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 text-amber-700 rounded-xl">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-amber-900">ผู้สมัครส่งเอกสารยังไม่ครบ</h4>
                  <p className="text-[10px] text-amber-700">ขาด บัตรประชาชน, หนังสือรับรอง หรือเอกสารสำคัญอื่น ๆ</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-sm font-bold text-amber-800 font-mono">{alertDocsCount} ราย</span>
                <button 
                  id="alert-docs-link"
                  onClick={() => onNavigate("documents")} 
                  className="text-[10px] text-amber-600 hover:underline block font-semibold cursor-pointer"
                >
                  ตรวจเช็ค →
                </button>
              </div>
            </div>

            {/* Activation Alert */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 border border-emerald-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
                  <CheckCircle className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-emerald-900">รออนุมัติเปิดใช้งานพอร์ต (Registered)</h4>
                  <p className="text-[10px] text-emerald-700">สมัครสำเร็จแล้ว กำลังรอฝ่ายเซลส์เปิดรหัสลูกค้าใหม่</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-sm font-bold text-emerald-800 font-mono">{alertActivationsCount} ราย</span>
                <button 
                  id="alert-clients-link"
                  onClick={() => onNavigate("customers")} 
                  className="text-[10px] text-emerald-600 hover:underline block font-semibold cursor-pointer"
                >
                  เปิดพอร์ตเลย →
                </button>
              </div>
            </div>
          </div>

          <div className="text-center text-[11px] text-slate-400">
            อัปเดตแบบเรียลไทม์กับฐานข้อมูลระบบขนส่งหลัก
          </div>
        </div>

      </div>

      {/* Bottom Grid: Today's Follow Up Mini-Board */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex justify-between items-center mb-3">
          <div>
            <h3 className="text-slate-800 font-bold text-sm">นัดติดตามด่วนวันนี้ (Today's Follow-up Queue)</h3>
            <p className="text-[11px] text-slate-400">ลูกค้าที่คุณตั้งบันทึกว่าต้องการคำตอบหรือโทรติดต่อวันนี้</p>
          </div>
          <button 
            id="all-schedules-btn"
            onClick={() => onNavigate("followup")} 
            className="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 hover:underline cursor-pointer"
          >
            ดูทั้งหมด ({followUpTodayLeads.length}) <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {followUpTodayLeads.map(l => (
            <div 
              key={l.id} 
              id={`today-followup-item-${l.id}`}
              onClick={() => onSelectLead(l)}
              className="p-3 rounded-xl border border-red-100 bg-red-50/40 hover:bg-red-50 transition-all cursor-pointer flex justify-between items-start"
            >
              <div className="space-y-1 max-w-[70%]">
                <h4 className="text-xs font-bold text-slate-800 truncate">{l.shopName}</h4>
                <p className="text-[10px] text-slate-500 font-mono">โทร: {l.phone}</p>
                <span className="inline-block text-[9px] bg-white text-slate-600 px-1.5 py-0.5 rounded border border-slate-200 mt-0.5">
                  {StatusLabels[l.status]}
                </span>
              </div>
              <div className="text-right space-y-1">
                <span className="text-[10px] font-bold text-red-600 font-mono block bg-white px-2 py-0.5 rounded-lg border border-red-200">
                  {l.followUp.time} น.
                </span>
                <span className="text-[10px] text-blue-600 block hover:underline font-medium">คลิกดู Lead</span>
              </div>
            </div>
          ))}
          {followUpTodayLeads.length === 0 && (
            <div className="col-span-full py-8 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-1.5">
              <CheckCircle className="w-6 h-6 text-slate-300" />
              <span>ไม่มีนัดหมายใหม่ค้างในวันนี้ ทุกอย่างเรียบร้อยดี!</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

