import React from "react";
import { Lead, FOLLOWUP_OUTCOMES } from "../types";
import { getFollowUpStatus } from "../utils/crmHelpers";
import { 
  BarChart3, CheckCircle2, AlertTriangle, Clock, 
  TrendingUp, Users, PhoneCall, Award, Target, PhoneMissed
} from "lucide-react";

interface FollowUpPerformanceViewProps {
  leads: Lead[];
  salespersons?: string[];
}

export default function FollowUpPerformanceView({
  leads,
  salespersons = []
}: FollowUpPerformanceViewProps) {
  const todayStr = new Date().toISOString().split("T")[0];
  const followUpLeads = leads.filter(l => l.followUp && l.followUp.date);

  const totalFollowUps = followUpLeads.length;
  const overdueCount = followUpLeads.filter(l => !l.followUp.isCompleted && l.followUp.date < todayStr).length;
  const todayCount = followUpLeads.filter(l => !l.followUp.isCompleted && l.followUp.date === todayStr).length;
  const completedCount = followUpLeads.filter(l => l.followUp.isCompleted).length;
  const pendingCount = totalFollowUps - completedCount;

  // Outcome statistics
  const outcomeCounts = followUpLeads.reduce((acc, lead) => {
    const outcome = lead.followUp?.lastOutcome;
    if (outcome) {
      acc[outcome] = (acc[outcome] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  // Salesperson breakdown
  const salesList = Array.from(
    new Set([
      ...salespersons,
      ...leads.map(l => l.salesPerson).filter(Boolean)
    ])
  );

  const salesStats = salesList.map((sp) => {
    const spLeads = followUpLeads.filter(l => l.salesPerson === sp);
    const spTotal = spLeads.length;
    const spCompleted = spLeads.filter(l => l.followUp.isCompleted).length;
    const spOverdue = spLeads.filter(l => !l.followUp.isCompleted && l.followUp.date < todayStr).length;
    const spToday = spLeads.filter(l => !l.followUp.isCompleted && l.followUp.date === todayStr).length;
    const spWon = spLeads.filter(l => l.followUp?.lastOutcome?.includes("ปิดการขาย") || l.status === "activated" || l.status === "registered").length;
    const completionRate = spTotal > 0 ? Math.round((spCompleted / spTotal) * 100) : 0;

    return {
      name: sp,
      total: spTotal,
      completed: spCompleted,
      overdue: spOverdue,
      today: spToday,
      won: spWon,
      completionRate
    };
  }).sort((a, b) => b.total - a.total);

  return (
    <div className="space-y-6" id="followup-performance-dashboard">
      {/* Top Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5 text-blue-600" /> นัดหมายทั้งหมด
          </span>
          <div className="text-2xl font-black text-slate-900">{totalFollowUps}</div>
          <span className="text-[11px] text-slate-400">คิวงานติดตามในระบบ</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-rose-200 bg-rose-50/20 shadow-xs space-y-1">
          <span className="text-xs font-semibold text-rose-700 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" /> เลยกำหนด (Overdue)
          </span>
          <div className="text-2xl font-black text-rose-600">{overdueCount}</div>
          <span className="text-[11px] text-rose-500 font-medium">ต้องรีบติดตามด่วน</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-amber-200 bg-amber-50/20 shadow-xs space-y-1">
          <span className="text-xs font-semibold text-amber-800 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-600" /> ต้องโทรวันนี้
          </span>
          <div className="text-2xl font-black text-amber-700">{todayCount}</div>
          <span className="text-[11px] text-amber-600 font-medium">คิวประจำวัน</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-xs space-y-1">
          <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> ติดต่อสำเร็จแล้ว
          </span>
          <div className="text-2xl font-black text-emerald-600">{completedCount}</div>
          <span className="text-[11px] text-emerald-600 font-medium">
            {totalFollowUps > 0 ? `${Math.round((completedCount / totalFollowUps) * 100)}% ของงานทั้งหมด` : "0%"}
          </span>
        </div>
      </div>

      {/* Salesperson Performance Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">ประสิทธิภาพการติดตามงานแยกตาม Sales</h3>
              <p className="text-xs text-slate-500">สถิติจำนวนงานที่ติดตามแล้ว และงานค้างของแต่ละคนในทีม</p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-bold bg-slate-50/80">
                <th className="py-2.5 px-3 rounded-l-xl">Sales</th>
                <th className="py-2.5 px-3 text-center">นัดหมายทั้งหมด</th>
                <th className="py-2.5 px-3 text-center">ติดตามแล้ว</th>
                <th className="py-2.5 px-3 text-center">เลยกำหนด</th>
                <th className="py-2.5 px-3 text-center">วันนี้</th>
                <th className="py-2.5 px-3 text-center">ปิดการขาย</th>
                <th className="py-2.5 px-3 text-right rounded-r-xl">ความคืบหน้า</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {salesStats.map((sp) => (
                <tr key={sp.name} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3 px-3 font-bold text-slate-800 flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center">
                      {sp.name.charAt(0)}
                    </div>
                    <span>{sp.name}</span>
                  </td>
                  <td className="py-3 px-3 text-center font-bold text-slate-700">{sp.total}</td>
                  <td className="py-3 px-3 text-center font-bold text-emerald-600">{sp.completed}</td>
                  <td className="py-3 px-3 text-center">
                    {sp.overdue > 0 ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                        {sp.overdue}
                      </span>
                    ) : (
                      <span className="text-slate-400">0</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-center">
                    {sp.today > 0 ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                        {sp.today}
                      </span>
                    ) : (
                      <span className="text-slate-400">0</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-center font-bold text-blue-600">{sp.won}</td>
                  <td className="py-3 px-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-24 bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-emerald-500 h-full rounded-full transition-all"
                          style={{ width: `${sp.completionRate}%` }}
                        />
                      </div>
                      <span className="font-bold text-slate-700 w-8">{sp.completionRate}%</span>
                    </div>
                  </td>
                </tr>
              ))}
              {salesStats.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                    ยังไม่มีข้อมูลสถิติการติดตามงานของทีม Sales
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Outcome Breakdown */}
      {Object.keys(outcomeCounts).length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-3">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-blue-600" />
            <span>สถิติผลการติดตามที่บันทึกล่าสุด</span>
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
            {Object.entries(outcomeCounts).map(([outcomeName, count]) => (
              <div key={outcomeName} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <span className="text-slate-700 font-semibold truncate mr-2">{outcomeName}</span>
                <span className="font-bold text-blue-700 bg-white px-2 py-0.5 rounded-lg border border-slate-200 shrink-0">
                  {count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
