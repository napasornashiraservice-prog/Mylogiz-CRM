import * as XLSX from "xlsx";
import { Lead, LeadStatus, MonthlyUsageRecord, CustomerBehaviorStatus } from "../types";

export interface AnalyzedCustomerUsage {
  lead: Lead;
  id: string;
  shopName: string;
  contactName: string;
  phone: string;
  customerCode: string;
  salesPerson: string;
  province: string;
  status: LeadStatus;
  behaviorStatus: CustomerBehaviorStatus;
  statusLabel: string;
  statusColor: {
    bg: string;
    text: string;
    border: string;
    badge: string;
  };
  monthlyRecords: Record<string, MonthlyUsageRecord>;
  currentMonthPieces: number;
  currentMonthRevenue: number;
  previousMonthPieces: number;
  previousMonthRevenue: number;
  momPiecesGrowth: number | null; // percentage e.g. +25% or -50%
  momRevenueGrowth: number | null;
  totalPieces: number;
  totalRevenue: number;
  avgMonthlyPieces: number;
  avgMonthlyRevenue: number;
  isLostOrZero: boolean;
  lostReason?: string;
  lostDate?: string;
  lostRevenueImpact: number; // Potential lost revenue per month
}

/**
 * Returns a list of past N months strings in "YYYY-MM" format ending with given baseMonth
 */
export function getPastMonthsList(baseMonth: string, count: number = 6): string[] {
  const result: string[] = [];
  const [yearStr, monthStr] = baseMonth.split("-");
  let year = parseInt(yearStr, 10);
  let month = parseInt(monthStr, 10); // 1-12

  for (let i = count - 1; i >= 0; i--) {
    let targetMonth = month - i;
    let targetYear = year;
    while (targetMonth <= 0) {
      targetMonth += 12;
      targetYear -= 1;
    }
    const mPadded = targetMonth.toString().padStart(2, "0");
    result.push(`${targetYear}-${mPadded}`);
  }

  return result;
}

/**
 * Formats "YYYY-MM" to Thai month display e.g. "ส.ค. 2569" or "สิงหาคม 2569"
 */
export function formatMonthThai(monthStr: string, short: boolean = true): string {
  if (!monthStr || !monthStr.includes("-")) return monthStr;
  const [yearStr, mStr] = monthStr.split("-");
  const m = parseInt(mStr, 10);
  const thaiYear = parseInt(yearStr, 10) + 543;

  const shortMonths = [
    "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
    "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
  ];

  const fullMonths = [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
  ];

  const monthName = short ? shortMonths[m - 1] : fullMonths[m - 1];
  return `${monthName} ${thaiYear}`;
}

/**
 * Estimates average unit price per piece (THB) from lead's ratePlan or volume
 */
export function estimatePricePerPiece(lead: Lead): number {
  if (lead.ratePlan) {
    const numMatch = lead.ratePlan.match(/\d+(\.\d+)?/);
    if (numMatch) {
      const parsed = parseFloat(numMatch[0]);
      if (parsed >= 15 && parsed <= 120) return parsed;
    }
  }
  const volume = Number(lead.shipmentsPerDay) || 0;
  if (volume >= 1000) return 30;
  if (volume >= 500) return 35;
  if (volume >= 100) return 38;
  return 42;
}

/**
 * Resolves monthly usage history for a lead across the target months list.
 * If manual monthly records exist on `lead.monthlyUsage`, it uses them.
 * Otherwise, generates realistic historical profile based on lead creation/shipments.
 */
export function getLeadMonthlyUsageMap(lead: Lead, months: string[]): Record<string, MonthlyUsageRecord> {
  const map: Record<string, MonthlyUsageRecord> = {};
  const existingMap: Record<string, MonthlyUsageRecord> = {};

  if (Array.isArray(lead.monthlyUsage)) {
    lead.monthlyUsage.forEach(r => {
      if (r && r.month) {
        existingMap[r.month] = r;
      }
    });
  }

  const unitPrice = estimatePricePerPiece(lead);

  months.forEach((m) => {
    if (existingMap[m]) {
      map[m] = existingMap[m];
    } else {
      map[m] = {
        month: m,
        pieces: 0,
        revenue: 0,
        orders: 0,
        avgPricePerPiece: unitPrice
      };
    }
  });

  return map;
}

/**
 * Analyzes behavioral health and churn risk purely based on actual monthly usage records
 */
export function analyzeCustomer(lead: Lead, months: string[]): AnalyzedCustomerUsage {
  const currentMonth = months[months.length - 1];
  const previousMonth = months.length > 1 ? months[months.length - 2] : currentMonth;

  const monthlyRecords = getLeadMonthlyUsageMap(lead, months);
  const cur = monthlyRecords[currentMonth] || { pieces: 0, revenue: 0, month: currentMonth };
  const prev = monthlyRecords[previousMonth] || { pieces: 0, revenue: 0, month: previousMonth };

  const currentMonthPieces = cur.pieces || 0;
  const currentMonthRevenue = cur.revenue || 0;
  const previousMonthPieces = prev.pieces || 0;
  const previousMonthRevenue = prev.revenue || 0;

  // Calculate totals and averages across analyzed months
  let totalPieces = 0;
  let totalRevenue = 0;
  let activeMonthsCount = 0;

  months.forEach(m => {
    const rec = monthlyRecords[m];
    if (rec) {
      totalPieces += rec.pieces || 0;
      totalRevenue += rec.revenue || 0;
      if (rec.pieces > 0) activeMonthsCount++;
    }
  });

  const avgMonthlyPieces = activeMonthsCount > 0 ? Math.round(totalPieces / activeMonthsCount) : 0;
  const avgMonthlyRevenue = activeMonthsCount > 0 ? Math.round(totalRevenue / activeMonthsCount) : 0;

  // Month-over-month growth
  let momPiecesGrowth: number | null = null;
  let momRevenueGrowth: number | null = null;

  if (previousMonthPieces > 0) {
    momPiecesGrowth = Math.round(((currentMonthPieces - previousMonthPieces) / previousMonthPieces) * 100);
  } else if (currentMonthPieces > 0) {
    momPiecesGrowth = 100;
  }

  if (previousMonthRevenue > 0) {
    momRevenueGrowth = Math.round(((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100);
  } else if (currentMonthRevenue > 0) {
    momRevenueGrowth = 100;
  }

  // Determine Customer Behavior purely from actual usage data (Independent of Lead Status)
  let behaviorStatus: CustomerBehaviorStatus = "no_usage";
  const hadPastUsage = (totalPieces - currentMonthPieces) > 0 || previousMonthPieces > 0;

  if (totalPieces === 0 && currentMonthPieces === 0) {
    // 1. No usage at all in any analyzed month
    behaviorStatus = "no_usage";
  } else if (currentMonthPieces === 0 && hadPastUsage) {
    // 2. Stopped shipping / Lost in current month (had previous shipments)
    behaviorStatus = "lost";
  } else if (previousMonthPieces > 0 && currentMonthPieces > 0 && currentMonthPieces <= previousMonthPieces * 0.5) {
    // 3. Severe usage drop (>50% drop)
    behaviorStatus = "churn_risk";
  } else if (previousMonthPieces > 0 && currentMonthPieces > 0 && currentMonthPieces < previousMonthPieces) {
    // 4. Moderate usage drop
    behaviorStatus = "dropping";
  } else if (currentMonthPieces > 0 && ((previousMonthPieces > 0 && momPiecesGrowth !== null && momPiecesGrowth > 10) || (previousMonthPieces === 0 && currentMonthPieces > 0 && totalPieces > 0))) {
    // 5. Growing usage (>10% MoM increase or newly active with shipments)
    behaviorStatus = "growing";
  } else if (currentMonthPieces > 0 || totalPieces > 0) {
    // 6. Active and stable shipments
    behaviorStatus = "active";
  } else {
    behaviorStatus = "no_usage";
  }

  // Label & color metadata
  let statusLabel = "⚪ ยังไม่มีการใช้งาน";
  let statusColor = {
    bg: "bg-slate-50",
    text: "text-slate-600",
    border: "border-slate-200",
    badge: "bg-slate-100 text-slate-700"
  };

  if (behaviorStatus === "active") {
    statusLabel = "🟢 ใช้งานต่อเนื่อง (Active)";
    statusColor = {
      bg: "bg-emerald-50",
      text: "text-emerald-700",
      border: "border-emerald-200",
      badge: "bg-emerald-100 text-emerald-800"
    };
  } else if (behaviorStatus === "growing") {
    statusLabel = "🚀 เติบโตต่อเนื่อง (Growing)";
    statusColor = {
      bg: "bg-blue-50",
      text: "text-blue-700",
      border: "border-blue-200",
      badge: "bg-blue-100 text-blue-800"
    };
  } else if (behaviorStatus === "dropping") {
    statusLabel = "🟡 ยอดส่งลดลง (Dropping)";
    statusColor = {
      bg: "bg-amber-50",
      text: "text-amber-700",
      border: "border-amber-200",
      badge: "bg-amber-100 text-amber-800"
    };
  } else if (behaviorStatus === "churn_risk") {
    statusLabel = "🟠 เสี่ยงหลุดวิกฤต (Churn Risk)";
    statusColor = {
      bg: "bg-orange-50",
      text: "text-orange-700",
      border: "border-orange-200",
      badge: "bg-orange-100 text-orange-800"
    };
  } else if (behaviorStatus === "lost") {
    statusLabel = "🔴 หยุดส่งพัสดุ / Lost (0 ชิ้น)";
    statusColor = {
      bg: "bg-rose-50",
      text: "text-rose-700",
      border: "border-rose-200",
      badge: "bg-rose-100 text-rose-800"
    };
  } else if (behaviorStatus === "no_usage") {
    statusLabel = "⚪ ยังไม่มีการใช้งาน";
    statusColor = {
      bg: "bg-slate-50",
      text: "text-slate-600",
      border: "border-slate-200",
      badge: "bg-slate-100 text-slate-700"
    };
  }

  const lostRevenueImpact = behaviorStatus === "lost" 
    ? (previousMonthRevenue > 0 ? previousMonthRevenue : (avgMonthlyRevenue > 0 ? avgMonthlyRevenue : 0))
    : (behaviorStatus === "churn_risk" || behaviorStatus === "dropping" 
        ? Math.max(0, previousMonthRevenue - currentMonthRevenue) 
        : 0);

  return {
    lead,
    id: lead.id,
    shopName: lead.shopName || "ไม่ระบุชื่อร้าน",
    contactName: lead.contactName || "-",
    phone: lead.phone || "-",
    customerCode: lead.customerCode || lead.id.substring(0, 8).toUpperCase(),
    salesPerson: lead.salesPerson || "Phere",
    province: lead.province || "กรุงเทพมหานคร",
    status: lead.status,
    behaviorStatus,
    statusLabel,
    statusColor,
    monthlyRecords,
    currentMonthPieces,
    currentMonthRevenue,
    previousMonthPieces,
    previousMonthRevenue,
    momPiecesGrowth,
    momRevenueGrowth,
    totalPieces,
    totalRevenue,
    avgMonthlyPieces,
    avgMonthlyRevenue,
    isLostOrZero: behaviorStatus === "lost",
    lostReason: lead.lostReason,
    lostDate: lead.lostDate,
    lostRevenueImpact
  };
}

/**
 * Export Customer Monthly Usage and Behavior Matrix to Excel
 */
export function exportCustomerBehaviorToExcel(
  analyzedCustomers: AnalyzedCustomerUsage[],
  months: string[]
) {
  const exportRows = analyzedCustomers.map((c, idx) => {
    const row: Record<string, any> = {
      "ลำดับ": idx + 1,
      "รหัสลูกค้า": c.customerCode,
      "ชื่อร้านค้า / แบรนด์": c.shopName,
      "ผู้ติดต่อ": c.contactName,
      "เบอร์โทรศัพท์": c.phone,
      "จังหวัด": c.province,
      "เซลส์ผู้ดูแล": c.salesPerson,
      "สถานะพฤติกรรมลูกค้า": c.statusLabel.replace(/[🟢🚀🟡🟠🔴⚪]/g, "").trim(),
      "สถานะ Pipeline": c.status,
      "สาเหตุที่หยุดส่ง (ถ้ามี)": c.lostReason || "-"
    };

    // Add monthly pieces & revenues
    months.forEach(m => {
      const thaiM = formatMonthThai(m, true);
      const rec = c.monthlyRecords[m] || { pieces: 0, revenue: 0 };
      row[`จำนวนชิ้น (${thaiM})`] = rec.pieces || 0;
      row[`ยอดขาย ฿ (${thaiM})`] = rec.revenue || 0;
    });

    row["ยอดส่งรวมสะสม (ชิ้น)"] = c.totalPieces;
    row["ยอดขายรวมสะสม (บาท)"] = c.totalRevenue;
    row["การเปลี่ยนแปลง MoM (%)"] = c.momPiecesGrowth !== null ? `${c.momPiecesGrowth}%` : "-";
    row["มูลค่ายอดขายที่เสี่ยง/สูญเสีย (บาท/เดือน)"] = c.lostRevenueImpact > 0 ? c.lostRevenueImpact : 0;

    return row;
  });

  const worksheet = XLSX.utils.json_to_sheet(exportRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Customer_Behavior_Analysis");

  const todayStr = new Date().toISOString().split("T")[0];
  XLSX.writeFile(workbook, `Mylogiz_Customer_Behavior_Monthly_Report_${todayStr}.xlsx`);
}
