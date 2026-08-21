import * as XLSX from "xlsx";
import { Lead, LeadStatus, StatusLabels, THAI_PROVINCES } from "../types";

export interface ParsedLeadRow {
  shopName: string;
  contactName?: string;
  phone?: string;
  lineId?: string;
  facebook?: string;
  province?: string;
  channel?: string;
  campaign?: string;
  status?: LeadStatus;
  salesPerson?: string;
  tags?: string[];
  score?: number;
  shipmentsPerDay?: number;
  preferredTransport?: string[];
  competitor?: string;
  address?: string;
  customerType?: "individual" | "corporate";
  followUpDate?: string;
  followUpTime?: string;
  followUpNote?: string;
  initialNote?: string;
  isValid: boolean;
  validationError?: string;
  rawRow: Record<string, any>;
}

export interface ExcelImportResult {
  success: boolean;
  totalRows: number;
  validRows: ParsedLeadRow[];
  invalidRows: ParsedLeadRow[];
  errorMessage?: string;
}

/**
 * Maps Thai/English column names to recognized lead fields
 */
function normalizeKey(header: string): string {
  const clean = header.trim().toLowerCase().replace(/[\s\-_()]/g, "");
  
  if (clean.includes("ชื่อร้าน") || clean.includes("ร้านค้า") || clean.includes("shopname") || clean.includes("brand") || clean.includes("แบรนด์")) {
    return "shopName";
  }
  if (clean.includes("ชื่อผู้ติดต่อ") || clean.includes("ผู้ติดต่อ") || clean.includes("contactname") || clean.includes("contact") || clean.includes("ชื่อลูกค้า")) {
    return "contactName";
  }
  if (clean.includes("เบอร์โทร") || clean.includes("โทรศัพท์") || clean.includes("phone") || clean.includes("tel") || clean.includes("mobile")) {
    return "phone";
  }
  if (clean.includes("line") || clean.includes("ไลน์") || clean.includes("lineid")) {
    return "lineId";
  }
  if (clean.includes("facebook") || clean.includes("เฟส") || clean.includes("fb")) {
    return "facebook";
  }
  if (clean.includes("จังหวัด") || clean.includes("province")) {
    return "province";
  }
  if (clean.includes("ช่องทาง") || clean.includes("channel") || clean.includes("source")) {
    return "channel";
  }
  if (clean.includes("แคมเปญ") || clean.includes("campaign")) {
    return "campaign";
  }
  if (clean.includes("สถานะ") || clean.includes("status") || clean.includes("pipeline")) {
    return "status";
  }
  if (clean.includes("เซลส์") || clean.includes("sales") || clean.includes("ผู้ดูแล") || clean.includes("salesperson")) {
    return "salesPerson";
  }
  if (clean.includes("tag") || clean.includes("แท็ก") || clean.includes("ป้ายกำกับ")) {
    return "tags";
  }
  if (clean.includes("คะแนน") || clean.includes("score") || clean.includes("เกรด") || clean.includes("grade")) {
    return "score";
  }
  if (clean.includes("ยอดส่ง") || clean.includes("จำนวนชิ้น") || clean.includes("shipment") || clean.includes("ชิ้น/เดือน") || clean.includes("volume")) {
    return "shipmentsPerDay";
  }
  if (clean.includes("ขนส่งที่สนใจ") || clean.includes("ขนส่ง") || clean.includes("transport") || clean.includes("courier")) {
    return "preferredTransport";
  }
  if (clean.includes("คู่แข่ง") || clean.includes("competitor")) {
    return "competitor";
  }
  if (clean.includes("ที่อยู่") || clean.includes("address") || clean.includes("ทำเล")) {
    return "address";
  }
  if (clean.includes("ประเภทลูกค้า") || clean.includes("customertype") || clean.includes("นิติบุคคล")) {
    return "customerType";
  }
  if (clean.includes("วันนัด") || clean.includes("วันที่follow") || clean.includes("followupdate") || clean.includes("วันโทร")) {
    return "followUpDate";
  }
  if (clean.includes("เวลานัด") || clean.includes("เวลาโทร") || clean.includes("followuptime")) {
    return "followUpTime";
  }
  if (clean.includes("รายละเอียดนัด") || clean.includes("เรื่องที่โทร") || clean.includes("followupnote")) {
    return "followUpNote";
  }
  if (clean.includes("หมายเหตุ") || clean.includes("note") || clean.includes("โน้ต") || clean.includes("บันทึก")) {
    return "initialNote";
  }

  return header.trim();
}

/**
 * Matches status text in Thai or English to LeadStatus enum
 */
function parseStatus(val?: any): LeadStatus {
  if (!val) return LeadStatus.NEW_LEAD;
  const s = String(val).trim().toLowerCase();

  if (s.includes("ใหม่") || s.includes("new")) return LeadStatus.NEW_LEAD;
  if (s.includes("ติดต่อแล้ว") || s.includes("contacted")) return LeadStatus.CONTACTED;
  if (s.includes("รอพิจารณา") || s.includes("พิจารณา") || s.includes("ส่งราย") || s.includes("detail") || s.includes("pending") || s.includes("sent")) return LeadStatus.SENT_DETAILS;
  if (s.includes("นัด") || s.includes("meeting")) return LeadStatus.MEETING;
  if (s.includes("รอเอกสาร") || s.includes("doc") || s.includes("waiting")) return LeadStatus.WAITING_DOCS;
  if (s.includes("ปิดการขาย") || s.includes("สมัคร") || s.includes("register") || s.includes("won")) return LeadStatus.REGISTERED;
  if (s.includes("เปิดใช้งาน") || s.includes("activate")) return LeadStatus.ACTIVATED;
  if (s.includes("ประจำ") || s.includes("regular")) return LeadStatus.REGULAR;
  if (s.includes("ปฏิเสธ") || s.includes("ไม่สนใจ") || s.includes("not_interested") || s.includes("reject")) return LeadStatus.NOT_INTERESTED;
  if (s.includes("lost") || s.includes("ยกเลิก") || s.includes("แพ้")) return LeadStatus.LOST;
  if (s.includes("ติดต่อไม่ได้") || s.includes("no_contact")) return LeadStatus.NO_CONTACT;

  return LeadStatus.NEW_LEAD;
}

/**
 * Cleans phone number string (e.g. 081-234-5678 -> 0812345678)
 */
function cleanPhone(val?: any): string {
  if (!val) return "";
  let str = String(val).trim();
  // If scientific notation e.g. 8.12345678e9
  if (/^\d+(\.\d+)?e\+\d+$/i.test(str)) {
    str = Number(str).toFixed(0);
  }
  // Remove non-digit except +
  str = str.replace(/[^\d+]/g, "");
  // Add leading 0 if 9 digits starting with 8, 9, 6
  if (/^[689]\d{8}$/.test(str)) {
    str = "0" + str;
  }
  return str;
}

/**
 * Normalizes province to standard Thai province list if matched
 */
function normalizeProvince(val?: any): string {
  if (!val) return "กรุงเทพมหานคร";
  const str = String(val).trim();
  const found = THAI_PROVINCES.find(p => p.includes(str) || str.includes(p));
  return found || str || "กรุงเทพมหานคร";
}

/**
 * Parses tags from comma or semicolon separated string
 */
function parseTags(val?: any): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val.map(String).filter(Boolean);
  return String(val)
    .split(/[,;\n|/]/)
    .map(t => t.trim())
    .filter(Boolean);
}

/**
 * Parses transport carriers
 */
function parseTransport(val?: any): string[] {
  if (!val) return ["Flash"];
  if (Array.isArray(val)) return val.map(String).filter(Boolean);
  const raw = String(val).split(/[,;\n|/]/).map(t => t.trim()).filter(Boolean);
  return raw.length > 0 ? raw : ["Flash"];
}

/**
 * Parse Excel file array buffer into structured and validated Lead rows
 */
export async function parseExcelLeadsFile(file: File, defaultSalesperson?: string): Promise<ExcelImportResult> {
  try {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: "array", cellDates: true });

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      return {
        success: false,
        totalRows: 0,
        validRows: [],
        invalidRows: [],
        errorMessage: "ไฟล์ Excel ไม่มี Worksheet ข้อมูล"
      };
    }

    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

    if (!rawJson || rawJson.length === 0) {
      return {
        success: false,
        totalRows: 0,
        validRows: [],
        invalidRows: [],
        errorMessage: "ไม่พบแถวข้อมูลในไฟล์ Excel ที่เลือก"
      };
    }

    const validRows: ParsedLeadRow[] = [];
    const invalidRows: ParsedLeadRow[] = [];

    rawJson.forEach((row, index) => {
      // Map normalized columns
      const normalizedRow: Record<string, any> = {};
      Object.keys(row).forEach(header => {
        const standardKey = normalizeKey(header);
        normalizedRow[standardKey] = row[header];
      });

      const shopName = String(normalizedRow.shopName || normalizedRow["ชื่อร้าน"] || "").trim();
      const contactName = String(normalizedRow.contactName || "").trim();
      const phone = cleanPhone(normalizedRow.phone);
      const lineId = String(normalizedRow.lineId || "").trim();
      const facebook = String(normalizedRow.facebook || "").trim();
      const province = normalizeProvince(normalizedRow.province);
      const channel = String(normalizedRow.channel || "Facebook").trim() || "Facebook";
      const campaign = String(normalizedRow.campaign || "").trim();
      const status = parseStatus(normalizedRow.status);
      const salesPerson = String(normalizedRow.salesPerson || defaultSalesperson || "Phere").trim() || (defaultSalesperson || "Phere");
      const tags = parseTags(normalizedRow.tags);
      
      let score = Number(normalizedRow.score);
      if (isNaN(score) || score < 1 || score > 5) score = 3;

      let shipmentsPerDay = Number(normalizedRow.shipmentsPerDay);
      if (isNaN(shipmentsPerDay) || shipmentsPerDay < 0) shipmentsPerDay = 0;

      const preferredTransport = parseTransport(normalizedRow.preferredTransport);
      const competitor = String(normalizedRow.competitor || "").trim();
      const address = String(normalizedRow.address || "").trim();

      const custTypeRaw = String(normalizedRow.customerType || "").toLowerCase();
      const customerType: "individual" | "corporate" = 
        custTypeRaw.includes("corporate") || custTypeRaw.includes("นิติ") || custTypeRaw.includes("บริษัท") 
          ? "corporate" 
          : "individual";

      // Follow-up
      let followUpDate = "";
      if (normalizedRow.followUpDate) {
        if (normalizedRow.followUpDate instanceof Date) {
          followUpDate = normalizedRow.followUpDate.toISOString().split("T")[0];
        } else {
          followUpDate = String(normalizedRow.followUpDate).trim();
        }
      }
      const followUpTime = String(normalizedRow.followUpTime || "10:00").trim() || "10:00";
      const followUpNote = String(normalizedRow.followUpNote || "").trim();
      const initialNote = String(normalizedRow.initialNote || "").trim();

      // Validation
      let isValid = true;
      let validationError = "";

      if (!shopName && !contactName && !phone) {
        // completely empty row skip or invalid
        return;
      }

      if (!shopName) {
        isValid = false;
        validationError = "ไม่มีชื่อร้านค้า / แบรนด์ (จำเป็น)";
      }

      const parsed: ParsedLeadRow = {
        shopName: shopName || contactName || `ร้านค้าไม่มีชื่อ (แถวที่ ${index + 2})`,
        contactName,
        phone,
        lineId,
        facebook,
        province,
        channel,
        campaign,
        status,
        salesPerson,
        tags,
        score,
        shipmentsPerDay,
        preferredTransport,
        competitor,
        address,
        customerType,
        followUpDate,
        followUpTime,
        followUpNote,
        initialNote,
        isValid,
        validationError,
        rawRow: row
      };

      if (isValid) {
        validRows.push(parsed);
      } else {
        invalidRows.push(parsed);
      }
    });

    return {
      success: true,
      totalRows: validRows.length + invalidRows.length,
      validRows,
      invalidRows
    };
  } catch (err: any) {
    console.error("parseExcelLeadsFile error:", err);
    return {
      success: false,
      totalRows: 0,
      validRows: [],
      invalidRows: [],
      errorMessage: err?.message || "ไม่สามารถอ่านไฟล์ Excel ได้ กรุณาตรวจสอบรูปแบบไฟล์"
    };
  }
}

/**
 * Generates and downloads a clean Excel template for importing leads
 */
export function downloadLeadImportTemplate() {
  const sampleData = [
    {
      "ชื่อร้านค้า/แบรนด์ *": "ร้านน้องหมวย แฟชั่นสไตล์",
      "ชื่อผู้ติดต่อ": "คุณหมวย นิภาดา",
      "เบอร์โทรศัพท์": "0891234567",
      "LINE ID": "@mouyfashion",
      "Facebook": "NongMouy Shop Official",
      "จังหวัด": "กรุงเทพมหานคร",
      "ที่อยู่": "123/45 ถนนสุขุมวิท แขวงคลองเตย",
      "ช่องทางที่ได้ Lead": "Facebook",
      "แคมเปญการตลาด": "แคมเปญ 8.8 Sales Shock",
      "สถานะ (Pipeline Status)": "Lead ใหม่",
      "เซลส์ผู้ดูแล": "Phere",
      "Tags (คั่นด้วยจุลภาค)": "ร้านค้าออนไลน์, VIP 1000 up, ลูกค้าพร้อมเปิดร้านทันที",
      "คะแนนความสนใจ (1-5)": 4,
      "ยอดส่งต่อเดือน (ชิ้น/เดือน)": 1500,
      "ขนส่งที่สนใจ": "Flash, SPX",
      "ขนส่งคู่แข่งที่ใช้อยู่": "Kerry, J&T",
      "ประเภทลูกค้า (บุคคล/นิติบุคคล)": "บุคคลธรรมดา",
      "วันที่นัด Follow-up (YYYY-MM-DD)": new Date().toISOString().split("T")[0],
      "เวลานัด Follow-up (HH:MM)": "14:00",
      "รายละเอียดนัดหมาย": "โทรนำเสนอโปรโมชั่นเรทพิเศษ VIP",
      "หมายเหตุเพิ่มเติม": "ลูกค้าต้องการรถเข้ารับพัสดุทุกวัน 16:00 น."
    },
    {
      "ชื่อร้านค้า/แบรนด์ *": "บจก. สยาม โกลบอล เทรดดิ้ง",
      "ชื่อผู้ติดต่อ": "คุณธีรศักดิ์ (จัดซื้อ)",
      "เบอร์โทรศัพท์": "029876543",
      "LINE ID": "siamglobal_bkk",
      "Facebook": "Siam Global Trading Co.",
      "จังหวัด": "สมุทรปราการ",
      "ที่อยู่": "88 หมู่ 3 นิคมบางพลี",
      "ช่องทางที่ได้ Lead": "Website",
      "แคมเปญการตลาด": "แคมเปญ Google Search",
      "สถานะ (Pipeline Status)": "ติดต่อแล้ว",
      "เซลส์ผู้ดูแล": "Nalin",
      "Tags (คั่นด้วยจุลภาค)": "B2B/บริษัท, Volume ปานกลาง (>500 ชิ้น/เดือน), กำลังเปรียบเทียบราคา",
      "คะแนนความสนใจ (1-5)": 5,
      "ยอดส่งต่อเดือน (ชิ้น/เดือน)": 3000,
      "ขนส่งที่สนใจ": "Flash, DHL",
      "ขนส่งคู่แข่งที่ใช้อยู่": "Flash เดิม",
      "ประเภทลูกค้า (บุคคล/นิติบุคคล)": "นิติบุคคล",
      "วันที่นัด Follow-up (YYYY-MM-DD)": "",
      "เวลานัด Follow-up (HH:MM)": "",
      "รายละเอียดนัดหมาย": "",
      "หมายเหตุเพิ่มเติม": "ขอยอดวางบิลเครดิตเทอม 30 วัน"
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);

  // Column width formatting
  const colWidths = [
    { wch: 26 }, // ชื่อร้าน
    { wch: 20 }, // ชื่อผู้ติดต่อ
    { wch: 16 }, // เบอร์โทร
    { wch: 18 }, // LINE ID
    { wch: 24 }, // Facebook
    { wch: 18 }, // จังหวัด
    { wch: 30 }, // ที่อยู่
    { wch: 18 }, // ช่องทาง
    { wch: 22 }, // แคมเปญ
    { wch: 20 }, // สถานะ
    { wch: 15 }, // เซลส์
    { wch: 35 }, // Tags
    { wch: 18 }, // คะแนน
    { wch: 24 }, // ยอดส่ง
    { wch: 18 }, // ขนส่งที่สนใจ
    { wch: 20 }, // คู่แข่ง
    { wch: 22 }, // ประเภทลูกค้า
    { wch: 25 }, // วันที่นัด
    { wch: 20 }, // เวลานัด
    { wch: 30 }, // รายละเอียดนัด
    { wch: 35 }  // หมายเหตุ
  ];
  worksheet["!cols"] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Template_Import_Leads");

  XLSX.writeFile(workbook, "Mylogiz_CRM_Import_Leads_Template.xlsx");
}
