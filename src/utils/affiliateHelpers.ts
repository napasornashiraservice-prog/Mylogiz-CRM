import { Affiliate, Lead, LeadStatus, StatusLabels } from "../types";
import * as XLSX from "xlsx";

/**
 * Generates the next sequential Affiliate ID in format AFF0001 (e.g. AFF0001, AFF0002, ...).
 */
export function generateNextAffiliateId(existingAffiliates: Affiliate[]): string {
  let maxNum = 0;

  for (const aff of existingAffiliates) {
    if (!aff.affiliateId) continue;
    const match = aff.affiliateId.match(/AFF-?0*(\d+)/i) || aff.affiliateId.match(/(\d+)/);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  }

  const nextNum = maxNum + 1;
  const padded = nextNum.toString().padStart(4, "0");
  return `AFF${padded}`;
}

/**
 * Checks if an affiliate ID is unique across all existing affiliates.
 */
export function isAffiliateIdUnique(
  affiliateId: string, 
  existingAffiliates: Affiliate[], 
  currentDocId?: string
): boolean {
  const normalized = affiliateId.trim().toUpperCase();
  if (!normalized) return false;
  return !existingAffiliates.some(
    a => a.id !== currentDocId && a.affiliateId.trim().toUpperCase() === normalized
  );
}

/**
 * Checks if the current user has permission to manage (create/edit/delete) affiliates.
 * SuperAdmins ("Phere" / "Jack") or Managers have full management rights.
 */
export function canManageAffiliates(currentUser?: string | null, salespersons?: string[]): boolean {
  if (!currentUser) return false;
  const normalized = currentUser.trim().toLowerCase();
  if (normalized === "phere" || normalized === "jack") return true;
  if (salespersons && salespersons.length > 0) {
    const firstUser = salespersons[0]?.trim().toLowerCase();
    if ((firstUser === "phere" || firstUser === "jack") && (normalized === "phere" || normalized === "jack")) {
      return true;
    }
  }
  return false;
}

/**
 * Calculates aggregate stats for an affiliate based on the leads list.
 */
export function getAffiliateStats(affiliate: Affiliate, leads: Lead[]) {
  const targetId = affiliate.affiliateId ? affiliate.affiliateId.trim().toUpperCase() : "";
  const referredLeads = leads.filter(l => {
    if (!l.affiliateId || !targetId) return false;
    return l.affiliateId.trim().toUpperCase() === targetId;
  });

  const totalReferred = referredLeads.length;
  const registeredCount = referredLeads.filter(
    l => l.status === LeadStatus.REGISTERED || l.status === LeadStatus.ACTIVATED || l.status === LeadStatus.REGULAR
  ).length;
  const activeCount = referredLeads.filter(
    l => l.status === LeadStatus.ACTIVATED || l.status === LeadStatus.REGULAR
  ).length;
  const regularCount = referredLeads.filter(
    l => l.status === LeadStatus.REGULAR
  ).length;
  const pipelineCount = referredLeads.filter(
    l => l.status !== LeadStatus.REGISTERED && 
         l.status !== LeadStatus.ACTIVATED && 
         l.status !== LeadStatus.REGULAR &&
         l.status !== LeadStatus.LOST &&
         l.status !== LeadStatus.NOT_INTERESTED
  ).length;

  return {
    referredLeads,
    totalReferred,
    registeredCount,
    activeCount,
    regularCount,
    pipelineCount
  };
}

/**
 * Exports Affiliate list and referred Members to an Excel file with 2 sheets:
 * 1. "Affiliate" - summary of each affiliate
 * 2. "Members" - all members/leads referred by the affiliates (linked by Affiliate ID)
 */
export function exportAffiliatesToExcel(
  affiliates: Affiliate[],
  leads: Lead[],
  customFilename?: string
) {
  // Sheet 1: Affiliate
  const affiliateRows = affiliates.map((aff, idx) => {
    const stats = getAffiliateStats(aff, leads);
    return {
      "ลำดับ": idx + 1,
      "Affiliate ID": aff.affiliateId,
      "ชื่อผู้แนะนำ (Name)": aff.name,
      "เบอร์โทรศัพท์": aff.phone,
      "LINE ID": aff.lineId || "-",
      "ช่องทางติดต่อ": aff.contactChannel || "-",
      "สถานะ Affiliate": aff.status === "active" ? "Active (เปิดใช้งาน)" : "Inactive (ปิดใช้งาน)",
      "จำนวนสมาชิกทั้งหมด": stats.totalReferred,
      "สมัครสำเร็จ (Registered)": stats.registeredCount,
      "เปิดพอร์ตใช้งาน (Activated)": stats.activeCount,
      "ส่งประจำ (Regular)": stats.regularCount,
      "อยู่ใน Pipeline": stats.pipelineCount,
      "วันที่เพิ่มเข้าระบบ": aff.createdAt ? new Date(aff.createdAt).toLocaleDateString("th-TH") : "-",
      "หมายเหตุ": aff.notes || "-"
    };
  });

  // Sheet 2: Members (linked by Affiliate ID)
  const membersRows: any[] = [];
  let memberIndex = 1;

  for (const aff of affiliates) {
    const targetId = aff.affiliateId ? aff.affiliateId.trim().toUpperCase() : "";
    const referredLeads = leads.filter(l => {
      if (!l.affiliateId || !targetId) return false;
      return l.affiliateId.trim().toUpperCase() === targetId;
    });

    for (const lead of referredLeads) {
      const isActivated = lead.status === LeadStatus.ACTIVATED || lead.status === LeadStatus.REGULAR || Boolean(lead.activationDate);
      const regDateStr = lead.registeredDate 
        ? new Date(lead.registeredDate).toLocaleDateString("th-TH") 
        : (lead.createdAt ? new Date(lead.createdAt).toLocaleDateString("th-TH") : "-");

      membersRows.push({
        "ลำดับ": memberIndex++,
        "Affiliate ID": aff.affiliateId,
        "ชื่อผู้แนะนำ": aff.name,
        "Member ID / รหัสลูกค้า": lead.customerCode || lead.externalCustomerId || lead.id,
        "ชื่อลูกค้า": lead.shopName || lead.contactName || "-",
        "ชื่อผู้ติดต่อ": lead.contactName || "-",
        "เบอร์โทร": lead.phone || "-",
        "LINE ID": lead.lineId || "-",
        "จังหวัด": lead.province || "-",
        "วันที่สมัคร": regDateStr,
        "สถานะ": StatusLabels[lead.status] || lead.status,
        "สถานะเปิดพอร์ต": isActivated ? "เปิดพอร์ตแล้ว (Activated)" : "ยังไม่เปิดพอร์ต",
        "วันที่เปิดพอร์ต": lead.activationDate ? new Date(lead.activationDate).toLocaleDateString("th-TH") : "-",
        "วันที่ส่งพัสดุแรก": lead.firstShipmentDate ? new Date(lead.firstShipmentDate).toLocaleDateString("th-TH") : "-",
        "เรทราคา": lead.ratePlan || "-",
        "เซลส์ผู้ดูแล": lead.salesPerson || "-"
      });
    }
  }

  // Handle empty state gracefully for Members sheet
  if (membersRows.length === 0) {
    membersRows.push({
      "ลำดับ": "-",
      "Affiliate ID": "-",
      "ชื่อผู้แนะนำ": "-",
      "Member ID / รหัสลูกค้า": "-",
      "ชื่อลูกค้า": "ไม่มีข้อมูลสมาชิกภายใต้ Affiliate ที่เลือก",
      "ชื่อผู้ติดต่อ": "-",
      "เบอร์โทร": "-",
      "LINE ID": "-",
      "จังหวัด": "-",
      "วันที่สมัคร": "-",
      "สถานะ": "-",
      "สถานะเปิดพอร์ต": "-",
      "วันที่เปิดพอร์ต": "-",
      "วันที่ส่งพัสดุแรก": "-",
      "เรทราคา": "-",
      "เซลส์ผู้ดูแล": "-"
    });
  }

  const wsAffiliate = XLSX.utils.json_to_sheet(
    affiliateRows.length > 0 ? affiliateRows : [{ "ข้อความ": "ไม่มีข้อมูล Affiliate ตามเงื่อนไข" }]
  );
  const wsMembers = XLSX.utils.json_to_sheet(membersRows);

  wsAffiliate["!cols"] = [
    { wch: 6 },  // ลำดับ
    { wch: 16 }, // Affiliate ID
    { wch: 25 }, // ชื่อผู้แนะนำ
    { wch: 15 }, // เบอร์โทรศัพท์
    { wch: 15 }, // LINE ID
    { wch: 18 }, // ช่องทางติดต่อ
    { wch: 22 }, // สถานะ Affiliate
    { wch: 18 }, // จำนวนสมาชิกทั้งหมด
    { wch: 20 }, // สมัครสำเร็จ
    { wch: 22 }, // เปิดพอร์ตใช้งาน
    { wch: 18 }, // ส่งประจำ
    { wch: 18 }, // อยู่ใน Pipeline
    { wch: 16 }, // วันที่เพิ่ม
    { wch: 30 }  // หมายเหตุ
  ];

  wsMembers["!cols"] = [
    { wch: 6 },  // ลำดับ
    { wch: 16 }, // Affiliate ID
    { wch: 22 }, // ชื่อผู้แนะนำ
    { wch: 20 }, // Member ID / รหัสลูกค้า
    { wch: 28 }, // ชื่อลูกค้า
    { wch: 20 }, // ชื่อผู้ติดต่อ
    { wch: 16 }, // เบอร์โทร
    { wch: 15 }, // LINE ID
    { wch: 16 }, // จังหวัด
    { wch: 16 }, // วันที่สมัคร
    { wch: 24 }, // สถานะ
    { wch: 24 }, // สถานะเปิดพอร์ต
    { wch: 16 }, // วันที่เปิดพอร์ต
    { wch: 16 }, // วันที่ส่งพัสดุแรก
    { wch: 16 }, // เรทราคา
    { wch: 16 }  // เซลส์ผู้ดูแล
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, wsAffiliate, "Affiliate");
  XLSX.utils.book_append_sheet(workbook, wsMembers, "Members");

  const dateStr = new Date().toISOString().split("T")[0];
  const finalFilename = customFilename || `Mylogiz_Affiliate_Members_Tracking_${dateStr}.xlsx`;
  XLSX.writeFile(workbook, finalFilename);
}

