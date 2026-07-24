import React from "react";
import { Lead, LeadStatus, StatusLabels } from "../types";
import { 
  Users, UserCheck, FileText, PhoneCall, CheckCircle, TrendingUp, 
  AlertTriangle, ArrowUpRight, Award, Flame, BarChart3, HelpCircle 
} from "lucide-react";
import { motion } from "motion/react";

interface DashboardViewProps {
  leads: Lead[];
  onNavigate: (tab: string) => void;
  onSelectLead: (lead: Lead) => void;
}

export default function DashboardView({ leads, onNavigate, onSelectLead }: DashboardViewProps) {
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

  // Channel breakdown
  const channelCounts: Record<string, number> = {};
  leads.forEach(l => {
    channelCounts[l.channel] = (channelCounts[l.channel] || 0) + 1;
  });

  const channelSuccess: Record<string, number> = {};
  leads.filter(l => 
    l.status === LeadStatus.REGISTERED || 
    l.status === LeadStatus.ACTIVATED || 
    l.status === LeadStatus.REGULAR
  ).forEach(l => {
    channelSuccess[l.channel] = (channelSuccess[l.channel] || 0) + 1;
  });

  const channelsData = Object.keys(channelCounts).map(channel => {
    const total = channelCounts[channel];
    const won = channelSuccess[channel] || 0;
    const rate = total > 0 ? Math.round((won / total) * 100) : 0;
    return { name: channel, total, won, rate };
  }).sort((a, b) => b.total - a.total);

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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white p-6 rounded-2xl shadow-sm border border-slate-700">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight font-sans">Dashboard ระบบงานขาย Mylogiz</h1>
          <p className="text-slate-300 text-sm mt-1">ยินดีต้อนรับกลับมา! ติดตามความเคลื่อนไหว และช่วยปิดดีลลูกค้าขนส่งวันนี้ได้เลย</p>
        </div>
        <div className="flex gap-3">
          <button 
            id="nav-to-leads-btn"
            onClick={() => onNavigate("leads")} 
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
          >
            <Users className="w-4 h-4" /> ดูบอร์ด Pipeline
          </button>
          <button 
            id="nav-to-followup-btn"
            onClick={() => onNavigate("followup")} 
            className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
          >
            <PhoneCall className="w-4 h-4" /> นัดติดตามวันนี้
          </button>
        </div>
      </div>

      {/* Grid: 4 Core Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { 
            id: "stat-leads-today",
            title: "Lead วันนี้", 
            value: leadsToday, 
            desc: `เดือนนี้สะสม ${leadsThisMonth} ราย`, 
            icon: Users, 
            color: "text-blue-600 bg-blue-50 border-blue-100" 
          },
          { 
            id: "stat-registered",
            title: "สมัครสำเร็จ", 
            value: registeredCount, 
            desc: "รอตรวจสอบเอกสารเพิ่มเติม", 
            icon: UserCheck, 
            color: "text-green-600 bg-green-50 border-green-100" 
          },
          { 
            id: "stat-waiting-docs",
            title: "รอเอกสาร", 
            value: waitingDocsCount, 
            desc: "ติดตามเอกสารเพิ่มเติมเพื่ออนุมัติ", 
            icon: FileText, 
            color: "text-purple-600 bg-purple-50 border-purple-100" 
          },
          { 
            id: "stat-won-clients",
            title: "ปิดการขายสำเร็จ (Won)", 
            value: wonCount, 
            desc: "เปิดใช้งานและส่งพัสดุแล้ว", 
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
            className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-start justify-between"
          >
            <div className="space-y-1">
              <span className="text-slate-500 text-xs font-medium">{stat.title}</span>
              <div className="text-2xl font-bold font-mono tracking-tight text-slate-800">{stat.value}</div>
              <span className="text-slate-400 text-[11px] block">{stat.desc}</span>
            </div>
            <div className={`p-2.5 rounded-lg border ${stat.color}`}>
              <stat.icon className="w-5 h-5" />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Grid: Conversion Rate & Automatic Alert Center */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Metric 1: Conversion Gauge */}
        <div id="dashboard-conversion-card" className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-slate-800 font-semibold text-sm">อัตรา Conversion Rate</h2>
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
                <span className="text-2xl font-extrabold font-mono text-slate-800">{conversionRate}%</span>
                <span className="text-[9px] text-slate-400 block font-medium">สำเร็จ</span>
              </div>
            </div>
            <div className="text-center mt-3 space-y-1">
              <p className="text-xs text-slate-600">ปิดการขายได้ <span className="font-bold text-blue-600">{convertedLeadsCount}</span> จากทั้งหมด <span className="font-bold text-slate-800">{totalLeadsCount}</span> ราย</p>
            </div>
          </div>
          <button 
            id="view-report-from-conv-btn"
            onClick={() => onNavigate("reports")} 
            className="w-full text-center py-2 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            ดูรายงานประสิทธิภาพช่องทาง <ArrowUpRight className="w-3 h-3" />
          </button>
        </div>

        {/* Metric 2: Smart Notification Center (ระบบแจ้งเตือนอัตโนมัติ) */}
        <div id="dashboard-alerts-card" className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm md:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-gray-800 font-semibold text-sm">การแจ้งเตือนงานวันนี้ (Smart Alerts)</h2>
              <span className="bg-amber-100 text-amber-800 text-[10px] px-2 py-0.5 rounded-full font-bold">สรุปสถานะล่าสุด</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">สิ่งที่คุณและทีมต้องเร่งติดตามเพื่อปิดการขายขนส่ง</p>
          </div>

          <div className="my-4 space-y-3">
            {/* Urgent Calls */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-rose-50 border border-rose-100">
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-rose-100 text-rose-700 rounded-lg">
                  <PhoneCall className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-rose-900">นัดหมายติดต่อลูกค้าวันนี้ / ค้างสาย</h4>
                  <p className="text-[10px] text-rose-700">ต้องโทรติดตามความคืบหน้าให้เสร็จสิ้นภายในวันนี้</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-sm font-bold text-rose-800 font-mono">{alertCallsCount} ราย</span>
                <button 
                  id="alert-calls-follow-link"
                  onClick={() => onNavigate("followup")} 
                  className="text-[10px] text-rose-600 hover:underline block font-semibold"
                >
                  โทรตอนนี้ →
                </button>
              </div>
            </div>

            {/* Waiting Docs */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-amber-50 border border-amber-100">
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-amber-100 text-amber-700 rounded-lg">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-amber-900">ผู้สมัครส่งเอกสารยังไม่ครบ</h4>
                  <p className="text-[10px] text-amber-700">ขาด บัตรประชาชน, หนังสือรับรอง หรือเอกสารสำคัญอื่น ๆ</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-sm font-bold text-amber-800 font-mono">{alertDocsCount} ราย</span>
                <button 
                  id="alert-docs-link"
                  onClick={() => onNavigate("documents")} 
                  className="text-[10px] text-amber-600 hover:underline block font-semibold"
                >
                  ตรวจเช็ค →
                </button>
              </div>
            </div>

            {/* Activation Alert */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50 border border-emerald-100">
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg">
                  <CheckCircle className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-emerald-900">รออนุมัติเปิดใช้งานพอร์ต (Registered)</h4>
                  <p className="text-[10px] text-emerald-700">สมัครสำเร็จแล้ว กำลังรอฝ่ายเซลส์เปิดรหัสลูกค้าใหม่</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-sm font-bold text-emerald-800 font-mono">{alertActivationsCount} ราย</span>
                <button 
                  id="alert-clients-link"
                  onClick={() => onNavigate("customers")} 
                  className="text-[10px] text-emerald-600 hover:underline block font-semibold"
                >
                  เปิดพอร์ตเลย →
                </button>
              </div>
            </div>
          </div>

          <div className="text-center text-[11px] text-gray-400">
            อัปเดตแบบเรียลไทม์กับฐานข้อมูลระบบขนส่งหลัก
          </div>
        </div>

      </div>

      {/* Bottom Grid: Channel Performance & Today's Follow Up Mini-Board */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Channel Rank Table */}
        <div id="channel-performance-card" className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm lg:col-span-2">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-slate-800 font-semibold text-sm">ประสิทธิภาพช่องทางได้ Lead (Channel Performance)</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">เรียงลำดับตามจำนวนลูกค้าที่ทักเข้ามาในระบบ</p>
            </div>
            <BarChart3 className="w-4 h-4 text-blue-500" />
          </div>
          
          <div className="overflow-x-auto">
            <table id="channel-dashboard-table" className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] text-slate-400 font-semibold uppercase">
                  <th className="pb-3 pl-1">ช่องทางหลัก</th>
                  <th className="pb-3 text-center">จำนวน Lead ทั้งหมด</th>
                  <th className="pb-3 text-center">สมัครสำเร็จ (Won)</th>
                  <th className="pb-3 text-right">อัตราปิดการขาย</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-xs text-slate-700">
                {channelsData.map((ch, idx) => (
                  <tr key={ch.name} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 pl-1 font-medium text-slate-700 flex items-center gap-2">
                      <span className="w-4 h-4 flex items-center justify-center bg-slate-100 text-[10px] text-slate-500 rounded-full font-bold">{idx + 1}</span>
                      {ch.name}
                    </td>
                    <td className="py-3 text-center text-slate-600 font-mono font-medium">{ch.total}</td>
                    <td className="py-3 text-center text-emerald-600 font-mono font-medium">{ch.won}</td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className="font-semibold text-slate-800 font-mono">{ch.rate}%</span>
                        <div className="w-16 bg-slate-100 h-1.5 rounded-full overflow-hidden hidden sm:block">
                          <div className="bg-blue-600 h-full rounded-full" style={{ width: `${ch.rate}%` }} />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
                {channelsData.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-400">ยังไม่มีข้อมูลช่องทาง</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Today's Schedule Sidebar List */}
        <div id="todays-schedule-sidebar" className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-1">
              <h3 className="text-gray-800 font-semibold text-sm">นัดติดตามวันนี้</h3>
              <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">เร่งด่วน</span>
            </div>
            <p className="text-[11px] text-gray-400 mb-3">ลูกค้าที่คุณตั้งบันทึกว่าต้องการคำตอบวันนี้</p>
            
            <div className="space-y-3 overflow-y-auto max-h-[220px] pr-1">
              {followUpTodayLeads.map(l => (
                <div 
                  key={l.id} 
                  id={`today-followup-item-${l.id}`}
                  onClick={() => onSelectLead(l)}
                  className="p-2.5 rounded-lg border border-red-100 bg-red-50/50 hover:bg-red-50 transition-all cursor-pointer flex justify-between items-start"
                >
                  <div className="space-y-0.5 max-w-[70%]">
                    <h4 className="text-xs font-bold text-gray-800 truncate">{l.shopName}</h4>
                    <p className="text-[10px] text-gray-500 font-mono">โทร: {l.phone}</p>
                    <span className="inline-block text-[9px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded mt-1">{StatusLabels[l.status]}</span>
                  </div>
                  <div className="text-right space-y-1">
                    <span className="text-[10px] font-bold text-red-600 font-mono block bg-white px-1.5 py-0.5 rounded border border-red-200">{l.followUp.time} น.</span>
                    <span className="text-[9px] text-blue-600 block hover:underline">คลิกเพื่อดู</span>
                  </div>
                </div>
              ))}
              {followUpTodayLeads.length === 0 && (
                <div className="py-8 text-center text-gray-400 text-xs flex flex-col items-center justify-center gap-1.5">
                  <CheckCircle className="w-6 h-6 text-gray-300" />
                  <span>ไม่มีนัดหมายใหม่ค้างในวันนี้</span>
                </div>
              )}
            </div>
          </div>
          <button 
            id="all-schedules-btn"
            onClick={() => onNavigate("followup")} 
            className="w-full text-center mt-3 py-2 text-xs font-medium text-gray-600 hover:text-gray-800 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
          >
            เปิดหน้าตารางนัดติดตามทั้งหมด
          </button>
        </div>

      </div>
    </div>
  );
}
