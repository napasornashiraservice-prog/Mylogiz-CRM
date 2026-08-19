import React from "react";
import { Lead, LeadStatus } from "../types";
import { BarChart3, TrendingUp, Users, Award, Flame, Target, MessageSquare, ShoppingBag, Megaphone } from "lucide-react";
import { motion } from "motion/react";

interface ReportsViewProps {
  leads: Lead[];
  salespersons?: string[];
  currentUser?: string | null;
}

export default function ReportsView({ leads, salespersons = [], currentUser = null }: ReportsViewProps) {
  const currentMonthStr = new Date().toISOString().substring(0, 7); // YYYY-MM
  
  // Total statistics
  const totalLeads = leads.length;
  const totalRegistered = leads.filter(l => 
    l.status === LeadStatus.REGISTERED || 
    l.status === LeadStatus.ACTIVATED || 
    l.status === LeadStatus.REGULAR
  ).length;
  const overallConversion = totalLeads > 0 ? Math.round((totalRegistered / totalLeads) * 100) : 0;

  // Monthly statistics (filtered by current month)
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

  // Channels analytics
  const channels = ["Facebook", "TikTok", "Website", "Line OA", "โทรเข้า", "คนแนะนำ"];
  const channelData = channels.map(chan => {
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
  }).sort((a, b) => b.leads - a.leads);

  // Campaign analytics
  const campaignMap: Record<string, { leads: number; registered: number }> = {};
  leads.forEach(l => {
    const cName = l.campaign || "ไม่ได้ระบุแคมเปญ";
    if (!campaignMap[cName]) campaignMap[cName] = { leads: 0, registered: 0 };
    campaignMap[cName].leads += 1;
    if (l.status === LeadStatus.REGISTERED || l.status === LeadStatus.ACTIVATED || l.status === LeadStatus.REGULAR) {
      campaignMap[cName].registered += 1;
    }
  });

  const campaignData = Object.entries(campaignMap).map(([name, stat]) => {
    const conversion = stat.leads > 0 ? Math.round((stat.registered / stat.leads) * 100) : 0;
    return { name, ...stat, conversion };
  }).sort((a, b) => b.leads - a.leads);

  // Find best performing channel by conversion (with at least 1 lead)
  const bestChannelByConversion = [...channelData]
    .filter(c => c.leads > 0)
    .sort((a, b) => b.conversion - a.conversion)[0];

  // Salespersons performance mapping (dynamic based on current user view permissions)
  const managerName = salespersons[0] || "Phere";
  const isManager = currentUser === "Phere" || currentUser === managerName;

  const activeSalespersons = isManager 
    ? salespersons 
    : (currentUser ? [currentUser] : salespersons);

  const salesData = activeSalespersons.map(sp => {
    const spLeads = leads.filter(l => l.salesPerson === sp);
    const spLeadsCount = spLeads.length;
    const spRegistered = spLeads.filter(l => 
      l.status === LeadStatus.REGISTERED || 
      l.status === LeadStatus.ACTIVATED || 
      l.status === LeadStatus.REGULAR
    ).length;
    const conversion = spLeadsCount > 0 ? Math.round((spRegistered / spLeadsCount) * 100) : 0;

    // Active new shops count
    const activeShops = spLeads.filter(l => 
      l.status === LeadStatus.ACTIVATED || l.status === LeadStatus.REGULAR
    ).length;

    return {
      name: sp,
      leads: spLeadsCount,
      registered: spRegistered,
      conversion,
      activeShops
    };
  }).sort((a, b) => b.registered - a.registered);

  const topSalesperson = salesData.length > 0 ? salesData[0] : null;

  return (
    <div className="space-y-8" id="reports-container">
      {/* View Header */}
      <div>
        <h2 className="text-xl font-bold text-gray-800">รายงานสรุปผลการดำเนินงานขาย (Sales Reports)</h2>
        <p className="text-xs text-gray-500 mt-0.5">วิเคราะห์ข้อมูลประสิทธิภาพของช่องทางลูกค้า และการเปรียบเทียบผลงานทีมขายแบบรายบุคคล</p>
      </div>

      {/* Grid: Overview summary card & top badges */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Performance Box 1: Month stats */}
        <div id="reports-monthly-box" className="bg-gradient-to-br from-blue-950 via-blue-900 to-slate-900 text-white p-6 rounded-2xl shadow-xs border border-slate-900 space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs bg-blue-500/30 text-blue-200 px-3 py-1 rounded-full font-bold">ข้อมูลสถิติมุมมองสะสม</span>
            <Target className="w-5 h-5 text-blue-300" />
          </div>

          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-blue-200">ผลสัมฤทธิ์ภาพรวมทั้งหมด</h3>
            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-extrabold font-mono tracking-tight">{overallConversion}%</span>
              <span className="text-xs text-blue-300">อัตราเฉลี่ย Conversion Rate</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 border-t border-blue-700/50 pt-4 text-xs font-mono">
            <div>
              <span className="text-blue-300 block text-[10px] font-sans">Lead ทั้งหมด</span>
              <span className="text-lg font-bold">{totalLeads} ราย</span>
            </div>
            <div>
              <span className="text-blue-300 block text-[10px] font-sans">สมัครสมาชิก</span>
              <span className="text-lg font-bold text-emerald-300">{totalRegistered} ราย</span>
            </div>
            <div>
              <span className="text-blue-300 block text-[10px] font-sans">ยังไม่สำเร็จ</span>
              <span className="text-lg font-bold text-blue-200">{totalLeads - totalRegistered} ราย</span>
            </div>
          </div>
        </div>

        {/* Performance Box 2: Monthly goals */}
        <div id="reports-current-month-box" className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">เปรียบเทียบความสำเร็จประจำเดือนนี้</span>
              <span className="text-xs bg-red-100 text-red-700 px-2.5 py-0.5 rounded-full font-bold font-mono">กรกฎาคม 2569</span>
            </div>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">ข้อมูลวิเคราะห์ย้อนกลับเฉพาะรายการนำเข้าใหม่ที่มี วันที่สแกนเข้าระบบในเดือนกรกฎาคมนี้</p>
          </div>

          <div className="grid grid-cols-3 gap-4 py-4 text-center">
            <div>
              <span className="text-2xl font-black text-slate-800 font-mono block">{monthlyLeadsCount}</span>
              <span className="text-[10px] text-slate-400">Lead เดือนนี้</span>
            </div>
            <div>
              <span className="text-2xl font-black text-emerald-600 font-mono block">{monthlyRegisteredCount}</span>
              <span className="text-[10px] text-slate-400">สมัครใหม่เดือนนี้</span>
            </div>
            <div className="bg-slate-50 p-2 rounded-xl border border-slate-200">
              <span className="text-2xl font-black text-blue-600 font-mono block">{monthlyConversion}%</span>
              <span className="text-[10px] text-blue-700 font-bold">Conversion</span>
            </div>
          </div>

          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div className="bg-blue-600 h-full rounded-full transition-all" style={{ width: `${monthlyConversion}%` }} />
          </div>
        </div>

      </div>

      {/* Grid: Channel performance analytics with best trigger */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Acquisition Channel Breakdown */}
        <div id="reports-channels-table-card" className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs lg:col-span-8 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-slate-800 font-semibold text-sm">การปิดดีลแยกตามช่องทางแนะนำ (Lead Source Breakdown)</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">ช่วยวิเคราะห์งบประเมินเพื่อหาแหล่งที่ปิดดีลดีที่สุด</p>
            </div>
            <BarChart3 className="w-4 h-4 text-blue-500" />
          </div>

          <div className="overflow-x-auto text-xs">
            <table id="reports-channels-table" className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[10px] text-slate-500 font-semibold uppercase">
                  <th className="pb-3 pl-1">ชื่อช่องทางการตลาด</th>
                  <th className="pb-3 text-center">จำนวน Lead ทั้งหมด</th>
                  <th className="pb-3 text-center">สมัครพอร์ตสำเร็จ (Won)</th>
                  <th className="pb-3 text-right">อัตราปิดการขาย</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {channelData.map((ch, idx) => (
                  <tr key={ch.name} className="hover:bg-slate-50/50">
                    <td className="py-3.5 pl-1 font-bold text-slate-700 flex items-center gap-2">
                      <span className="w-4 h-4 bg-slate-100 text-[10px] text-slate-500 font-bold rounded-full flex items-center justify-center">{idx + 1}</span>
                      {ch.name}
                    </td>
                    <td className="py-3.5 text-center font-semibold font-mono text-slate-600">{ch.leads} ราย</td>
                    <td className="py-3.5 text-center font-bold font-mono text-emerald-600">{ch.registered} ราย</td>
                    <td className="py-3.5 text-right font-bold text-slate-900 font-mono">
                      <div className="flex items-center justify-end gap-2.5">
                        <span className="text-blue-600">{ch.conversion}%</span>
                        <div className="w-20 bg-slate-100 h-1.5 rounded-full overflow-hidden hidden md:block">
                          <div className="bg-blue-600 h-full" style={{ width: `${ch.conversion}%` }} />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Best closing channel widget card */}
        <div id="reports-best-channel-card" className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs lg:col-span-4 flex flex-col justify-between">
          <div>
            <span className="text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full font-bold">ข้อมูลการวิเคราะห์เชิงรุก</span>
            <h3 className="text-slate-800 font-bold text-sm mt-3">ช่องทางปิดการขายที่ดีที่สุด</h3>
            <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">จากข้อมูลสถิติช่องทางที่ส่งผู้สมัครขนส่งเข้ามา แล้วสามารถปิดดีลและอนุมัติพอร์ตได้สำเร็จสูงสุด</p>
          </div>

          {bestChannelByConversion ? (
            <div className="py-6 space-y-4">
              <div className="bg-blue-50/80 p-4 rounded-xl border border-blue-100 text-center space-y-1">
                <span className="text-[11px] text-blue-500 uppercase font-black">ช่องทางแชมป์เปี้ยน</span>
                <h4 className="text-2xl font-black text-blue-900 font-sans">{bestChannelByConversion.name}</h4>
                <div className="text-blue-700 font-bold font-mono text-xs mt-2">Conversion: {bestChannelByConversion.conversion}%</div>
              </div>

              <div className="text-xs text-slate-600 space-y-1 pl-1">
                <p>• นำเข้าลูกค้าทั้งหมด: <span className="font-bold text-slate-900 font-mono">{bestChannelByConversion.leads} ราย</span></p>
                <p>• สมัครสำเร็จทั้งหมด: <span className="font-bold text-emerald-600 font-mono">{bestChannelByConversion.registered} ราย</span></p>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-slate-400">ยังไม่มีประวัติการปิดดีลมากพอ</div>
          )}

          <div className="text-[10px] text-slate-400 text-center">แนะนำให้จัดสรรมาร์เก็ตติ้งและทีมเซลส์ลงช่องทางหลักนี้</div>
        </div>

      </div>

      {/* Grid: Salesperson team comparison leaderboards */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-5" id="reports-salesperson-board">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-slate-800 font-semibold text-sm">บอร์ดเปรียบเทียบผลงานทีมขาย (Sales Leaderboard)</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">วัดผลตามจำนวนร้านค้าที่สมัครสำเร็จ และเปิดใช้งานพอร์ตใหม่ในระบบ</p>
          </div>
          <Award className="w-5 h-5 text-amber-500" />
        </div>

        {topSalesperson && (
          <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-100 rounded-full text-amber-700">
                <Flame className="w-5 h-5 animate-bounce" />
              </div>
              <div>
                <span className="text-[10px] text-amber-700 font-bold uppercase block">เซลส์ยอดเยี่ยมอันดับ 1</span>
                <h4 className="text-sm font-black text-slate-900">{topSalesperson.name}</h4>
                <p className="text-[10px] text-slate-400">ปิดการขายได้สูงสุดเดือนนี้ รวมทั้ังหมด {topSalesperson.registered} ร้าน</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs font-mono">
              <div className="bg-white p-2.5 rounded-lg border border-amber-200">
                <span className="text-[10px] text-slate-400 font-semibold font-sans block">Conversion</span>
                <span className="font-bold text-amber-800">{topSalesperson.conversion}%</span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-amber-200">
                <span className="text-[10px] text-slate-400 font-semibold font-sans block">เปิดพอร์ตสำเร็จ (Shops)</span>
                <span className="font-bold text-amber-800">{topSalesperson.activeShops} ร้าน</span>
              </div>
            </div>
          </div>
        )}

        <div className="overflow-x-auto text-xs">
          <table id="sales-leaderboard-table" className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-[10px] text-slate-500 font-semibold uppercase">
                <th className="pb-3 pl-4">ชื่อทีมงานขาย (Sales Person)</th>
                <th className="pb-3 text-center">จำนวน Lead ที่รับผิดชอบ</th>
                <th className="pb-3 text-center">สมัครสำเร็จ (Registered)</th>
                <th className="pb-3 text-center">เปิดรหัสพอร์ตแล้ว (Activated)</th>
                <th className="pb-3 text-right pr-4">อัตรา Conversion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {salesData.map(sp => (
                <tr key={sp.name} className="hover:bg-slate-50/50">
                  <td className="py-4 pl-4 font-bold text-slate-800">{sp.name}</td>
                  <td className="py-4 text-center text-slate-600 font-mono font-medium">{sp.leads} ราย</td>
                  <td className="py-4 text-center text-emerald-600 font-bold font-mono">{sp.registered} ราย</td>
                  <td className="py-4 text-center text-blue-600 font-bold font-mono">{sp.activeShops} ร้าน</td>
                  <td className="py-4 text-right pr-4 font-bold text-slate-900 font-mono">
                    <span className="text-blue-600 font-extrabold">{sp.conversion}%</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}
