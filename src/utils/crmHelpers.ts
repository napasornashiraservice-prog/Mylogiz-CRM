import * as XLSX from "xlsx";
import { Lead, FollowUp, CallReminder, PRESET_TAG_CATEGORIES, StatusLabels } from "../types";

export type FollowUpStatusType = "overdue" | "today" | "upcoming" | "no_followup" | "completed";

export interface FollowUpStatusInfo {
  status: FollowUpStatusType;
  label: string;
  badgeClass: string;
  textClass: string;
  dotColor: string;
  daysDiff?: number;
}

/**
 * Checks if the current logged-in user has permission to manage (add, edit, delete) tags.
 * The SuperAdmin accounts ("Phere" and "Jack") have full tag management permission.
 */
export function canManageTags(currentUser?: string | null, salespersons?: string[]): boolean {
  if (!currentUser) return false;
  const normalized = currentUser.trim().toLowerCase();
  if (normalized === "phere" || normalized === "jack") return true;
  if (salespersons && salespersons.length > 0) {
    const firstUser = salespersons[0]?.trim().toLowerCase();
    if ((firstUser === "phere" || firstUser === "jack") && (normalized === "phere" || normalized === "jack")) return true;
  }
  return false;
}

/**
 * Calculates accurate Follow-up status according to Thailand date/time.
 */
export function getFollowUpStatus(followUp?: FollowUp): FollowUpStatusInfo {
  if (!followUp || !followUp.date) {
    return {
      status: "no_followup",
      label: "ยังไม่กำหนดวันโทร",
      badgeClass: "bg-slate-100 text-slate-500 border-slate-200",
      textClass: "text-slate-500",
      dotColor: "bg-slate-400"
    };
  }

  if (followUp.isCompleted) {
    return {
      status: "completed",
      label: "ติดตามแล้ว",
      badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
      textClass: "text-emerald-700",
      dotColor: "bg-emerald-500"
    };
  }

  const now = new Date();
  const nowStr = now.toISOString().split("T")[0]; // YYYY-MM-DD
  const targetDateStr = followUp.date;

  const nowDate = new Date(nowStr);
  const targetDate = new Date(targetDateStr);
  const diffTime = targetDate.getTime() - nowDate.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return {
      status: "overdue",
      label: `เลยกำหนด (${Math.abs(diffDays)} วัน)`,
      badgeClass: "bg-rose-50 text-rose-700 border-rose-200 animate-pulse",
      textClass: "text-rose-600 font-bold",
      dotColor: "bg-rose-500",
      daysDiff: diffDays
    };
  }

  if (diffDays === 0) {
    return {
      status: "today",
      label: `ต้องโทรวันนี้ (${followUp.time || "10:00"} น.)`,
      badgeClass: "bg-amber-50 text-amber-800 border-amber-300 font-bold ring-1 ring-amber-400/40",
      textClass: "text-amber-700 font-bold",
      dotColor: "bg-amber-500",
      daysDiff: 0
    };
  }

  return {
    status: "upcoming",
    label: diffDays === 1 ? "พรุ่งนี้" : `อีก ${diffDays} วัน (${targetDateStr})`,
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
    textClass: "text-blue-600",
    dotColor: "bg-blue-500",
    daysDiff: diffDays
  };
}

/**
 * Returns display info for follow-up priority.
 */
export function getPriorityBadgeInfo(priority?: string): {
  label: string;
  badgeClass: string;
  iconText: string;
} {
  switch (priority) {
    case "urgent":
      return {
        label: "เร่งด่วน",
        badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
        iconText: "🔥"
      };
    case "important":
      return {
        label: "สำคัญ",
        badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
        iconText: "🟠"
      };
    default:
      return {
        label: "ปกติ",
        badgeClass: "bg-slate-100 text-slate-600 border-slate-200",
        iconText: "⚪"
      };
  }
}

/**
 * Returns color category name, Tailwind CSS classes, and metadata for a given tag.
 */
export function getTagInfo(tag: string): {
  color: "blue" | "purple" | "green" | "orange" | "red" | "gray";
  category: "business_type" | "customer_segment" | "sales_status" | "other";
  categoryLabel: string;
  iconName: string;
  badgeClass: string;
  pillClass: string;
} {
  const cleanTag = tag.trim().replace(/^🔥\s*/, "");
  const lowerTag = cleanTag.toLowerCase();

  // Special case: ลูกค้าด่วนมาก
  if (lowerTag.includes("ด่วน") || tag.includes("🔥")) {
    return {
      color: "red",
      category: "sales_status",
      categoryLabel: "สถานะการขาย / Follow-up",
      iconName: "Flame",
      badgeClass: "bg-rose-50 text-rose-700 border-rose-200/80 hover:bg-rose-100/80",
      pillClass: "bg-rose-100 text-rose-800 border-rose-300"
    };
  }

  // 1. Check Category A: ประเภทธุรกิจ
  const businessTags = [
    { name: "ร้านค้าออนไลน์", icon: "Store" },
    { name: "Drop-off", icon: "Package" },
    { name: "B2B/บริษัท", icon: "Building2" },
    { name: "หน้าร้าน/ออฟไลน์", icon: "Store" },
    { name: "Affiliate", icon: "Handshake" }
  ];

  const matchedBusiness = businessTags.find(
    b => b.name.toLowerCase() === lowerTag || lowerTag.includes(b.name.toLowerCase())
  );
  if (matchedBusiness || lowerTag.includes("ออนไลน์") || lowerTag.includes("b2b") || lowerTag.includes("หน้าร้าน") || lowerTag.includes("affiliate") || lowerTag.includes("drop-off") || lowerTag.includes("dropship") || lowerTag.includes("shopee") || lowerTag.includes("lazada") || lowerTag.includes("tiktok")) {
    return {
      color: "blue",
      category: "business_type",
      categoryLabel: "ประเภทธุรกิจ",
      iconName: matchedBusiness?.icon || (lowerTag.includes("b2b") ? "Building2" : lowerTag.includes("affiliate") ? "Handshake" : lowerTag.includes("drop") ? "Package" : "Store"),
      badgeClass: "bg-sky-50 text-sky-800 border-sky-200/80 hover:bg-sky-100/80",
      pillClass: "bg-sky-100 text-sky-900 border-sky-300"
    };
  }

  // 2. Check Category B: กลุ่มลูกค้า
  const segmentTags = [
    { name: "VIP 1000 up", icon: "Crown" },
    { name: "Volume ปานกลาง (>500 ชิ้น/เดือน)", icon: "Boxes" },
    { name: "Volume น้อย (100-400 ชิ้น/เดือน)", icon: "Layers" },
    { name: "ร้านค้าเปิดใหม่", icon: "Sparkles" },
    { name: "ลูกค้าพร้อมเปิดร้านทันที", icon: "Rocket" },
    { name: "มีแนวโน้มโตสูง", icon: "TrendingUp" }
  ];

  const matchedSegment = segmentTags.find(
    s => s.name.toLowerCase() === lowerTag || lowerTag.includes(s.name.toLowerCase())
  );
  if (matchedSegment || lowerTag.includes("vip") || lowerTag.includes("volume") || lowerTag.includes("เปิดร้าน") || lowerTag.includes("เปิดใหม่") || lowerTag.includes("โตสูง") || lowerTag.includes("ศักยภาพ")) {
    return {
      color: "green",
      category: "customer_segment",
      categoryLabel: "กลุ่มลูกค้า",
      iconName: matchedSegment?.icon || (lowerTag.includes("vip") ? "Crown" : lowerTag.includes("เปิดใหม่") ? "Sparkles" : lowerTag.includes("พร้อม") ? "Rocket" : lowerTag.includes("โต") ? "TrendingUp" : "Boxes"),
      badgeClass: "bg-teal-50 text-teal-800 border-teal-200/80 hover:bg-teal-100/80",
      pillClass: "bg-teal-100 text-teal-900 border-teal-300"
    };
  }

  // 3. Check Category C: สถานะการขาย / Follow-up
  const salesTags = [
    { name: "ติดสัญญากับคู่แข่ง", icon: "AlertTriangle" },
    { name: "กำลังเปรียบเทียบราคา", icon: "Scale" },
    { name: "รอตัดสินใจสิ้นเดือน", icon: "Clock" },
    { name: "รอเปิดสาขาใหม่", icon: "Hammer" },
    { name: "ลูกค้าด่วนมาก", icon: "Flame" }
  ];

  const matchedSales = salesTags.find(
    s => s.name.toLowerCase() === lowerTag || lowerTag.includes(s.name.toLowerCase())
  );
  if (matchedSales || lowerTag.includes("สัญญา") || lowerTag.includes("คู่แข่ง") || lowerTag.includes("ราคา") || lowerTag.includes("รอ") || lowerTag.includes("เปรียบเทียบ") || lowerTag.includes("นัด") || lowerTag.includes("ติดตาม")) {
    return {
      color: "orange",
      category: "sales_status",
      categoryLabel: "สถานะการขาย / Follow-up",
      iconName: matchedSales?.icon || (lowerTag.includes("สัญญา") ? "AlertTriangle" : lowerTag.includes("ราคา") ? "Scale" : lowerTag.includes("รอ") ? "Clock" : "Clock"),
      badgeClass: "bg-amber-50 text-amber-900 border-amber-200/80 hover:bg-amber-100/80",
      pillClass: "bg-amber-100 text-amber-950 border-amber-300"
    };
  }

  // Legacy / other tags fallback: clean soft neutral
  return {
    color: "gray",
    category: "other",
    categoryLabel: "Tags อื่นๆ",
    iconName: "Tag",
    badgeClass: "bg-slate-50 text-slate-700 border-slate-200/80 hover:bg-slate-100/80",
    pillClass: "bg-slate-100 text-slate-800 border-slate-300"
  };
}

/**
 * Exports leads to a styled Excel (.xlsx) file.
 */
export function exportLeadsToExcel(leads: Lead[], customFilename?: string): boolean {
  try {
    const dataRows = leads.map((lead, index) => {
      const followUpInfo = getFollowUpStatus(lead.followUp);
      const tagList = Array.isArray(lead.tags) ? lead.tags.join(", ") : "";
      const preferredTransports = Array.isArray(lead.preferredTransport) 
        ? lead.preferredTransport.join(", ") 
        : "";

      return {
        "ลำดับ": index + 1,
        "รหัส Lead": lead.id,
        "รหัสลูกค้า (Customer Code)": lead.customerCode || "-",
        "ประเภทลูกค้า": lead.customerType === "corporate" ? "🏢 นิติบุคคล" : "👤 บุคคลธรรมดา",
        "ชื่อร้านค้า/แบรนด์": lead.shopName || "-",
        "ชื่อผู้ติดต่อ": lead.contactName || "-",
        "เบอร์โทรศัพท์": lead.phone || "-",
        "LINE ID": lead.lineId || "-",
        "Facebook": lead.facebook || "-",
        "จังหวัด": lead.province || "-",
        "ที่อยู่": lead.address || "-",
        "ช่องทางที่ได้ Lead": lead.channel || "-",
        "แคมเปญการตลาด": lead.campaign || "-",
        "ผู้แนะนำ (Affiliate ID)": lead.affiliateId || "-",
        "สถานะ (Pipeline Status)": StatusLabels[lead.status] || lead.status,
        "สาเหตุที่ปิดการขาย": lead.wonReason ? `${lead.wonReason}${lead.wonReasonOther ? ` (${lead.wonReasonOther})` : ""}` : "-",
        "สาเหตุที่ปฏิเสธ": lead.lostReason ? `${lead.lostReason}${lead.lostReasonOther ? ` (${lead.lostReasonOther})` : ""}` : "-",
        "เซลส์ผู้ดูแล (Salesperson)": lead.salesPerson || "-",
        "Tags (ป้ายกำกับ)": tagList || "-",
        "ระดับคะแนน (Lead Score)": `${lead.score || 3}/5`,
        "ยอดส่งต่อเดือน (ชิ้น/เดือน)": lead.shipmentsPerDay || 0,
        "ขนส่งที่สนใจ": preferredTransports || "-",
        "ขนส่งคู่แข่งที่ใช้อยู่": lead.competitor || "-",
        "สถานะ Follow-up": followUpInfo.label,
        "วันที่นัด Follow-up": lead.followUp?.date || "-",
        "เวลานัด Follow-up": lead.followUp?.time || "-",
        "รายละเอียด Follow-up": lead.followUp?.note || lead.followUp?.detail || "-",
        "วันที่ลงทะเบียนเอกสาร": lead.registeredDate || "-",
        "วันที่เปิดใช้งาน": lead.activationDate || "-",
        "วันที่ส่งพัสดุแรก": lead.firstShipmentDate || "-",
        "เรทราคาเสนอขาย": lead.ratePlan || "-",
        "ประเภทการชำระเงิน": lead.paymentType || "-",
        "วันที่สร้าง Lead": lead.createdAt ? new Date(lead.createdAt).toLocaleString("th-TH") : "-",
        "อัปเดตล่าสุด": lead.updatedAt ? new Date(lead.updatedAt).toLocaleString("th-TH") : "-"
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataRows);

    // Set column auto-widths
    const colKeys = Object.keys(dataRows[0] || {});
    const colWidths = colKeys.map(key => {
      let maxLen = key.length * 2;
      dataRows.forEach(row => {
        const val = String((row as any)[key] || "");
        if (val.length > maxLen) {
          maxLen = Math.min(val.length, 45);
        }
      });
      return { wch: Math.max(maxLen + 4, 12) };
    });
    worksheet["!cols"] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Mylogiz_Leads_CRM");

    const dateStr = new Date().toISOString().split("T")[0];
    const finalFilename = customFilename || `Mylogiz_CRM_Leads_Export_${dateStr}.xlsx`;

    XLSX.writeFile(workbook, finalFilename);
    return true;
  } catch (error) {
    console.error("Failed to export Excel file:", error);
    return false;
  }
}
