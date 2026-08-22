/**
 * Mylogiz Sales CRM - Shared Data Definitions
 */

export enum LeadStatus {
  NEW_LEAD = "new_lead",          // 🟡 Lead ใหม่
  CONTACTED = "contacted",        // 🟠 ติดต่อแล้ว
  SENT_DETAILS = "sent_details",  // 🔵 รอพิจารณา
  MEETING = "meeting",            // 📅 นัด Meeting
  WAITING_DOCS = "waiting_docs",  // 🟣 รอเอกสาร
  REGISTERED = "registered",      // 🟢 ปิดการขาย (สมัครแล้ว)
  ACTIVATED = "activated",        // ✅ เปิดใช้งานแล้ว
  REGULAR = "regular",            // ⭐ ใช้งานประจำ
  LOST = "lost",                  // ❌ Lost
  NOT_INTERESTED = "not_interested", // ⚪ ปฏิเสธ
  NO_CONTACT = "no_contact",      // 🔇 ติดต่อไม่ได้
}

export const StatusLabels: Record<LeadStatus, string> = {
  [LeadStatus.NEW_LEAD]: "🟡 Lead ใหม่",
  [LeadStatus.CONTACTED]: "🟠 ติดต่อแล้ว",
  [LeadStatus.SENT_DETAILS]: "🔵 รอพิจารณา",
  [LeadStatus.MEETING]: "📅 นัด Meeting",
  [LeadStatus.WAITING_DOCS]: "🟣 รอเอกสาร",
  [LeadStatus.REGISTERED]: "🟢 ปิดการขาย (สมัครแล้ว)",
  [LeadStatus.ACTIVATED]: "✅ เปิดใช้งานแล้ว",
  [LeadStatus.REGULAR]: "⭐ ใช้งานประจำ",
  [LeadStatus.LOST]: "❌ Lost",
  [LeadStatus.NOT_INTERESTED]: "⚪ ปฏิเสธ",
  [LeadStatus.NO_CONTACT]: "🔇 ติดต่อไม่ได้",
};

export const StatusColors: Record<LeadStatus, string> = {
  [LeadStatus.NEW_LEAD]: "bg-amber-100 text-amber-800 border-amber-300 font-medium",
  [LeadStatus.CONTACTED]: "bg-orange-100 text-orange-800 border-orange-300 font-medium",
  [LeadStatus.SENT_DETAILS]: "bg-blue-100 text-blue-800 border-blue-300 font-medium",
  [LeadStatus.MEETING]: "bg-indigo-100 text-indigo-800 border-indigo-300 font-medium",
  [LeadStatus.WAITING_DOCS]: "bg-purple-100 text-purple-800 border-purple-300 font-medium",
  [LeadStatus.REGISTERED]: "bg-green-100 text-green-800 border-green-300 font-medium",
  [LeadStatus.ACTIVATED]: "bg-emerald-100 text-emerald-800 border-emerald-300 font-medium",
  [LeadStatus.REGULAR]: "bg-yellow-100 text-yellow-800 border-yellow-300 font-medium",
  [LeadStatus.LOST]: "bg-rose-100 text-rose-800 border-rose-300 font-medium",
  [LeadStatus.NOT_INTERESTED]: "bg-gray-100 text-gray-700 border-gray-300 font-medium",
  [LeadStatus.NO_CONTACT]: "bg-slate-100 text-slate-700 border-slate-300 font-medium",
};

// Presets for Pipeline Rejection Reason (สาเหตุที่ปฏิเสธ)
export const REJECTION_REASONS = [
  "ได้ราคาจากเจ้าอื่นดีกว่า",
  "ติดสัญญากับคู่แข่ง",
  "ใช้บริการเจ้าอื่นอยู่แล้ว",
  "แค่สอบถามข้อมูล",
  "ยังไม่มีแพลนในเร็ว ๆ นี้",
  "ระบบใช้งานยาก",
  "บริการไม่ตรงกับความต้องการ",
  "ต้องปรึกษาหุ้นส่วน/ผู้มีอำนาจตัดสินใจ",
  "ยังไม่สนใจ",
  "ไม่ให้เหตุผล",
  "อื่น ๆ"
] as const;

export type RejectionReason = typeof REJECTION_REASONS[number];

// Presets for Pipeline Won Reason (สาเหตุที่ปิดการขาย)
export const WON_REASONS = [
  "มีโปรโมชั่น/สิทธิประโยชน์ที่ตอบโจทย์",
  "ราคาทุนถูกกว่า",
  "ขนส่งหลากหลาย",
  "ระบบใช้งานง่าย",
  "มีทีมดูแลหลังการขาย",
  "ลูกค้ามั่นใจในคุณภาพบริการ",
  "ตอบโจทย์รูปแบบธุรกิจของลูกค้า",
  "เปลี่ยนจากผู้ให้บริการเดิมแล้วคุ้มค่ากว่า",
  "อื่น ๆ"
] as const;

export type WonReason = typeof WON_REASONS[number];

export const NOTE_CATEGORIES = [
  "ข้อมูลสำคัญของลูกค้า",
  "ความต้องการของลูกค้า",
  "ราคา / โปรโมชั่น",
  "การใช้งานระบบ",
  "การขนส่ง",
  "คู่แข่ง",
  "Follow-up",
  "ปัญหา / Complaint",
  "การตัดสินใจ",
  "อื่น ๆ"
] as const;

export type NoteCategory = typeof NOTE_CATEGORIES[number];

export type NotePriority = "normal" | "important" | "urgent";

export interface Note {
  id: string;
  text: string;
  createdAt: string;
  author: string;
  category?: NoteCategory | string;
  priority?: NotePriority;
  isPinned?: boolean;
  updatedAt?: string;
  updatedBy?: string;
}

export type TimelineType = 
  | "call" 
  | "details" 
  | "document" 
  | "activation" 
  | "system" 
  | "note"
  | "tag_add"
  | "tag_remove"
  | "status_change"
  | "followup"
  | "reminder"
  | "quote"
  | "meeting"
  | "interest"
  | "rejection"
  | "message"
  | "edit_lead";

export interface TimelineItem {
  id: string;
  title: string;
  description: string;
  date: string;
  type: TimelineType;
  author?: string;
}

export type FollowUpPriority = "urgent" | "important" | "normal";

export const FOLLOWUP_OUTCOMES = [
  "ติดต่อสำเร็จ",
  "ติดต่อไม่ได้",
  "ลูกค้าขอรายละเอียดเพิ่มเติม",
  "ลูกค้าขอใบเสนอราคา",
  "ลูกค้ารอพิจารณา",
  "นัดติดตามอีกครั้ง",
  "ลูกค้าไม่สนใจ",
  "ปิดการขาย",
  "ปฏิเสธ",
  "อื่น ๆ"
] as const;

export type FollowUpOutcome = typeof FOLLOWUP_OUTCOMES[number];

export const NO_CONTACT_REASONS = [
  "ไม่รับสาย",
  "สายไม่ว่าง",
  "ติดต่อไม่ได้",
  "เบอร์ไม่ถูกต้อง",
  "อื่น ๆ"
] as const;

export type NoContactReason = typeof NO_CONTACT_REASONS[number];

export interface FollowUp {
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  isCompleted: boolean;
  note?: string; // รายละเอียดการติดตาม
  detail?: string; // ข้อความเพิ่มเติม
  topic?: string; // หัวข้อการติดตาม
  priority?: FollowUpPriority; // 🔥 เร่งด่วน, 🟠 สำคัญ, ⚪ ปกติ
  lastOutcome?: string; // ผลการติดตามล่าสุด
  lastOutcomeDetail?: string; // รายละเอียดเพิ่มเติม
  lastOutcomeReason?: string; // เหตุผลย่อย เช่น กรณีติดต่อไม่ได้
  completedAt?: string; // ISO datetime
  completedBy?: string; // ชื่อผู้ติดตาม
  updatedAt?: string;
  updatedBy?: string;
}

export interface CallReminder {
  id: string;
  leadId: string;
  shopName: string;
  phone: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  topic?: string;
  detail?: string;
  status: "pending" | "completed" | "snoozed" | "cancelled";
  snoozedUntil?: string; // ISO datetime
  completedAt?: string; // ISO datetime
  createdAt: string;
  createdBy?: string;
}

export interface TagCategory {
  name: string;
  colorName: "blue" | "purple" | "green" | "orange" | "red" | "gray";
  tags: string[];
}

export const PRESET_TAG_CATEGORIES: TagCategory[] = [
  {
    name: "ประเภทธุรกิจ",
    colorName: "blue",
    tags: [
      "ร้านค้าออนไลน์",
      "Drop-off",
      "B2B/บริษัท",
      "หน้าร้าน/ออฟไลน์",
      "Affiliate"
    ]
  },
  {
    name: "กลุ่มลูกค้า",
    colorName: "green",
    tags: [
      "VIP 1000 up",
      "Volume ปานกลาง (>500 ชิ้น/เดือน)",
      "Volume น้อย (100-400 ชิ้น/เดือน)",
      "ร้านค้าเปิดใหม่",
      "ลูกค้าพร้อมเปิดร้านทันที",
      "มีแนวโน้มโตสูง"
    ]
  },
  {
    name: "สถานะการขาย / Follow-up",
    colorName: "orange",
    tags: [
      "ติดสัญญากับคู่แข่ง",
      "กำลังเปรียบเทียบราคา",
      "รอตัดสินใจสิ้นเดือน",
      "รอเปิดสาขาใหม่",
      "ลูกค้าด่วนมาก"
    ]
  }
];

export interface Documents {
  idCard: boolean;       // บัตรประชาชน
  bookBank: boolean;     // Book Bank
  companyReg: boolean;   // หนังสือรับรอง
  taxDoc?: boolean;      // ภาษี (ภพ.20 - deprecated / optional)
  storefrontPhoto: boolean; // รูปถ่ายหน้าร้าน
}

export interface CRMFile {
  id: string;
  name: string;
  url: string;
  type: "image" | "pdf" | "other";
  size: string;
  uploadedAt: string;
}

export interface CallLog {
  id: string;
  date: string;
  answered: boolean;     // รับสายไหม
  interestLevel: number; // 1-5 คะแนนความสนใจ
  notes: string;
  nextFollowUpInDays?: number; // โทรซ้ำในกี่วัน
}

export interface Lead {
  id: string;
  shopName: string;            // ชื่อร้าน
  contactName: string;         // ชื่อผู้ติดต่อ
  phone: string;               // เบอร์โทร
  lineId: string;              // LINE ID
  facebook: string;            // Facebook
  province: string;            // จังหวัด
  channel: string;             // ช่องทาง (Facebook, TikTok, Website, Line OA, Phone, Recommendation)
  tags: string[];              // Tags (Online store, Shopee, Lazada, TikTok Shop, Flash existing, New shop)
  status: LeadStatus;          // Pipeline Status
  score: number;               // Lead Score (1-5)
  address: string;             // ที่อยู่
  preferredTransport: string[]; // สนใจขนส่ง (Flash, SPX, DHL, ฯลฯ)
  shipmentsPerDay: number;     // ยอดส่งต่อเดือน (ชิ้น/เดือน)
  competitor: string;          // คู่แข่งที่ใช้อยู่
  notes: Note[];               // ระบบบันทึกข้อความเสริม
  timeline: TimelineItem[];    // Timeline ประวัติการทำงาน
  followUp: FollowUp;          // ข้อมูลการติดตาม
  reminders?: CallReminder[];  // รายการแจ้งเตือนโทร
  documents: Documents;        // ตรวจเช็คเอกสาร
  calls: CallLog[];            // บันทึกการโทร
  files: CRMFile[];            // ไฟล์เอกสารแนบ
  salesPerson: string;         // เซลส์ผู้ดูแล
  createdAt: string;           // วันที่เพิ่ม Lead
  updatedAt: string;           // อัปเดตล่าสุด
  customerType?: "individual" | "corporate"; // ประเภทลูกค้า: บุคคลธรรมดา หรือ นิติบุคคล
  campaign?: string;           // แคมเปญการตลาดที่ลูกค้าเข้ามา
  affiliateId?: string;        // รหัสผู้แนะนำ Affiliate ID (เช่น AFF0001)
  
  // ฟิลด์พิเศษเมื่อสมัคร/เปิดใช้งานแล้ว (Registered/Activated)
  customerCode?: string;       // รหัสลูกค้า
  externalCustomerId?: string; // รหัสลูกค้าบนระบบ Mylogiz CPLEX (External ID)
  registeredDate?: string;     // วันที่สมัคร
  activationDate?: string;     // วันที่เปิดใช้งาน
  firstShipmentDate?: string;  // ส่งพัสดุครั้งแรก
  ratePlan?: string;           // เรทราคาที่ใช้
  paymentType?: string;        // เครดิต/เติมเงิน

  // บันทึกประวัติการใช้งานรายเดือน (Monthly Usage History) & พฤติกรรมลูกค้า
  monthlyUsage?: MonthlyUsageRecord[]; // บันทึกประวัติยอดส่งและยอดขายรายเดือน
  behaviorStatus?: CustomerBehaviorStatus; // สถานะพฤติกรรมลูกค้า (ใช้งานปกติ, เติบโต, ส่งลดลง, เสี่ยงหลุด, หยุดส่ง/Lost)
  // บันทึกสาเหตุปิดการขาย (Won reason) / สาเหตุที่ปฏิเสธ (Rejection/Lost reason)
  wonReason?: string;          // สาเหตุที่ปิดการขาย
  wonReasonOther?: string;     // รายละเอียดเพิ่มเติมเมื่อเลือก อื่น ๆ สำหรับปิดการขาย
  lostReason?: string;         // สาเหตุที่ปฏิเสธ / ลูกค้าหยุดส่ง (Lost / Rejection reason)
  lostReasonOther?: string;    // รายละเอียดเพิ่มเติมเมื่อเลือก อื่น ๆ สำหรับปฏิเสธ
  lostDate?: string;           // วันที่ระบุว่าลูกค้าปฏิเสธ/หยุดส่ง
  lostNote?: string;           // บันทึกรายละเอียดเพิ่มเติมการกู้คืนลูกค้า
}

export type CustomerBehaviorStatus = "growing" | "active" | "dropping" | "churn_risk" | "lost";

export interface MonthlyUsageRecord {
  month: string;              // รูปแบบ "YYYY-MM" เช่น "2026-08", "2026-07"
  pieces: number;             // จำนวนชิ้นที่ส่งในเดือนนั้น
  revenue: number;            // ยอดขายในเดือนนั้น (บาท)
  orders?: number;            // จำนวนออเดอร์
  avgPricePerPiece?: number;  // ราคาเฉลี่ยต่อชิ้น
  lastShipmentDate?: string;  // วันที่ส่งพัสดุล่าสุดในเดือนนั้น
  note?: string;              // โน้ตบันทึกเพิ่มเติม
  updatedAt?: string;         // วันที่อัปเดตล่าสุด
  updatedBy?: string;         // ผู้บันทึก/อัปเดต
}

export const LOST_REASON_PRESETS = [
  "คู่แข่งให้ราคา/เรทถูกกว่า",
  "ขนส่งเข้ารับล่าช้า / ไม่ตรงเวลา",
  "พัสดุเสียหาย / เคลมประกันช้า",
  "ร้านค้าปิดกิจการ / เลิกขายของ",
  "สินค้าหมดฤดูกาล (Off-season)",
  "ย้ายไปใช้ Flash Express โดยตรง",
  "ย้ายไปใช้ SPX / TikTok Shipping",
  "ระบบหลังบ้านใช้งานยาก / ติดปัญหา COD",
  "ไม่ระบุสาเหตุ / ติดต่อไม่ได้"
];

export interface SalespersonPerformance {
  name: string;
  leadsCount: number;
  registeredCount: number;
  conversionRate: number;
  newShopsCount: number;
  activePieces: number;
  estimatedRevenue: number;
}

export interface SalespersonKpiTarget {
  salesperson: string;
  targetWonDeals: number;      // เป้าหมายปิดการขาย (เจ้า)
  targetRegistered: number;    // เป้าหมายสมัครสมาชิก (เจ้า)
  targetActivePieces: number;  // เป้าหมายจำนวนชิ้น/พัสดุใช้งาน (ชิ้น)
  targetRevenue: number;       // เป้าหมายยอดขายรวม (บาท)
  updatedAt?: string;
  updatedBy?: string;
}

export type SalesKpiStore = Record<string, SalespersonKpiTarget>;

export const DEFAULT_KPI_TARGETS: Record<string, SalespersonKpiTarget> = {
  "Phere": {
    salesperson: "Phere",
    targetWonDeals: 15,
    targetRegistered: 25,
    targetActivePieces: 10000,
    targetRevenue: 350000
  },
  "Nalin": {
    salesperson: "Nalin",
    targetWonDeals: 12,
    targetRegistered: 20,
    targetActivePieces: 8000,
    targetRevenue: 280000
  },
  "Beer": {
    salesperson: "Beer",
    targetWonDeals: 10,
    targetRegistered: 18,
    targetActivePieces: 6000,
    targetRevenue: 200000
  }
};

// ==========================================
// Mylogiz CPLEX Integration Standard Models
// ==========================================

export type CPLEXConnectionStatus = "disconnected" | "connected" | "error" | "syncing" | "waiting_for_api";
export type CPLEXAuthType = "api_key" | "bearer_token" | "custom_header";
export type CPLEXCustomerIdentifier = "customerId" | "customerCode" | "phone" | "email" | "externalCustomerId";
export type CPLEXDateRangeType = "today" | "yesterday" | "7days" | "30days" | "thisMonth" | "lastMonth" | "custom";

export type CPLEXDataMappingCategory = "customer" | "sales" | "shipping";

export interface CPLEXFieldMappingItem {
  id: string;
  category: CPLEXDataMappingCategory;
  crmFieldLabel: string;
  crmFieldKey: string;
  externalApiField?: string; // default empty/undefined ("รอกำหนด API Field")
  isEnabled: boolean;
  description?: string;
  statusLabel?: string; // default "รอกำหนด API Field"
}

export interface CPLEXIntegrationConfig {
  systemName: string; // Default: "Mylogiz CPLEX"
  baseUrl: string; // e.g. "https://app.mylogiz.ai/th/mylogiz-cplex"
  authType: CPLEXAuthType;
  customHeaderName?: string;
  tokenMasked?: string; // Masked representation e.g. "********"
  hasToken?: boolean;
  customerIdentifier: CPLEXCustomerIdentifier;
  dataMapping?: CPLEXFieldMappingItem[];
  status: CPLEXConnectionStatus;
  lastConnectedAt: string | null;
  lastSyncedAt: string | null;
  lastErrorMessage?: string | null;
  isEnabled: boolean;
}

export const DEFAULT_CPLEX_DATA_MAPPINGS: CPLEXFieldMappingItem[] = [
  // 1. Customer Info (ข้อมูลลูกค้า)
  { id: "cust_name", category: "customer", crmFieldLabel: "ชื่อร้าน / ชื่อลูกค้า", crmFieldKey: "shopName", externalApiField: "", isEnabled: true, description: "ชื่อร้านค้าหรือชื่อผู้ติดต่อของลูกค้า", statusLabel: "รอกำหนด API Field" },
  { id: "cust_code", category: "customer", crmFieldLabel: "รหัสลูกค้า (Customer Code)", crmFieldKey: "customerCode", externalApiField: "", isEnabled: true, description: "รหัสอ้างอิงลูกค้าในระบบ เช่น MLZ-1001", statusLabel: "รอกำหนด API Field" },
  { id: "cust_ext_id", category: "customer", crmFieldLabel: "External Customer ID", crmFieldKey: "externalCustomerId", externalApiField: "", isEnabled: true, description: "รหัสลูกค้าฝั่งระบบภายนอก (CPLEX)", statusLabel: "รอกำหนด API Field" },
  { id: "cust_phone", category: "customer", crmFieldLabel: "เบอร์โทรศัพท์ (Phone)", crmFieldKey: "phone", externalApiField: "", isEnabled: true, description: "เบอร์โทรศัพท์ติดต่อของร้านค้า", statusLabel: "รอกำหนด API Field" },
  { id: "cust_email", category: "customer", crmFieldLabel: "อีเมล (Email)", crmFieldKey: "email", externalApiField: "", isEnabled: false, description: "อีเมลติดต่อของร้านค้าหรือบริษัท", statusLabel: "รอกำหนด API Field" },

  // 2. Sales Info (ข้อมูลยอดขาย & ออเดอร์)
  { id: "sales_total_rev", category: "sales", crmFieldLabel: "ยอดขายรวม (Total Sales)", crmFieldKey: "totalSales", externalApiField: "", isEnabled: true, description: "มูลค่ายอดขายรวมสุทธิ (บาท)", statusLabel: "รอกำหนด API Field" },
  { id: "sales_orders", category: "sales", crmFieldLabel: "จำนวนออเดอร์ (Order Count)", crmFieldKey: "totalOrder", externalApiField: "", isEnabled: true, description: "จำนวนคำสั่งซื้อทั้งหมดของลูกค้า", statusLabel: "รอกำหนด API Field" },
  { id: "sales_items", category: "sales", crmFieldLabel: "จำนวนชิ้น (Item Count)", crmFieldKey: "totalItems", externalApiField: "", isEnabled: true, description: "จำนวนชิ้นสินค้าทั้งหมด", statusLabel: "รอกำหนด API Field" },
  { id: "sales_cod", category: "sales", crmFieldLabel: "ยอด COD (COD Amount)", crmFieldKey: "totalCod", externalApiField: "", isEnabled: true, description: "ยอดเงินเก็บเงินปลายทาง (บาท)", statusLabel: "รอกำหนด API Field" },

  // 3. Shipping Info (ข้อมูลการจัดส่ง & ขนส่ง)
  { id: "ship_parcels", category: "shipping", crmFieldLabel: "จำนวนพัสดุ (Parcel Count)", crmFieldKey: "totalShipment", externalApiField: "", isEnabled: true, description: "จำนวนพัสดุที่ทำการจัดส่งทั้งหมด", statusLabel: "รอกำหนด API Field" },
  { id: "ship_carrier", category: "shipping", crmFieldLabel: "บริษัทขนส่ง (Carrier)", crmFieldKey: "carrierBreakdown", externalApiField: "", isEnabled: true, description: "ผู้ให้บริการขนส่ง เช่น Flash, SPX, DHL, KEX", statusLabel: "รอกำหนด API Field" },
  { id: "ship_last_ship_date", category: "shipping", crmFieldLabel: "วันที่ส่งพัสดุล่าสุด (Last Shipping Date)", crmFieldKey: "lastShipmentDate", externalApiField: "", isEnabled: true, description: "วันที่ร้านค้าส่งพัสดุเข้าระบบล่าสุด", statusLabel: "รอกำหนด API Field" },
  { id: "ship_last_sale_date", category: "shipping", crmFieldLabel: "วันที่มียอดขายล่าสุด (Last Sales Date)", crmFieldKey: "lastActivityDate", externalApiField: "", isEnabled: true, description: "วันที่ร้านค้ามีธุรกรรมยอดขายล่าสุด", statusLabel: "รอกำหนด API Field" },
];

export interface CPLEXStandardCustomer {
  customerId: string;
  customerCode: string;
  customerName: string;
  phone: string;
  email?: string;
  externalCustomerId?: string;
}

export interface CPLEXStandardSales {
  salesAmount: number;
  salesDate: string;
  currency?: string;
}

export interface CPLEXStandardOrder {
  orderCount: number;
  orderDate: string;
  status?: string;
}

export interface CPLEXStandardShipment {
  shipmentCount: number;
  itemCount: number;
  shipmentDate: string;
  carrier?: string;
  trackingNumber?: string;
  codAmount?: number;
  shippingCost?: number;
}

export interface CPLEXUsageSummary {
  customerId?: string;
  customerCode?: string;
  customerName?: string;
  totalSales: number;        // ยอดขายรวม (บาท)
  totalOrder: number;        // จำนวนออเดอร์
  totalShipment: number;     // จำนวนพัสดุ
  totalItems: number;        // จำนวนชิ้น
  totalCod: number;          // ยอด COD (บาท)
  totalShippingCost: number; // ค่าขนส่ง (บาท)
  lastActivityDate: string | null; // วันที่ใช้งานล่าสุด (YYYY-MM-DD)
  lastShipmentDate: string | null; // วันที่ส่งพัสดุล่าสุด (YYYY-MM-DD)
  carrierBreakdown?: Record<string, number>;
  dailyTrend?: Array<{
    date: string;
    sales: number;
    shipments: number;
    orders: number;
    cod: number;
  }>;
}

export interface CPLEXSyncResult {
  status: "success" | "error" | "partial";
  lastSync: string;
  recordsImported: number;
  recordsUpdated: number;
  recordsFailed: number;
  message?: string;
}

export interface CPLEXApiLog {
  id: string;
  timestamp: string; // ISO string
  date: string;      // e.g. "19/08/2569"
  time: string;      // e.g. "15:30:00"
  connection: string;// "Mylogiz CPLEX"
  endpoint: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
  status: number;    // HTTP Status Code e.g. 200, 401, 500
  responseTime: number; // in milliseconds
  success: boolean;
  errorMessage?: string;
}

export interface CRMStore {
  leads: Lead[];
  sheetsConfig: {
    sheetUrl: string;
    sheetName?: string;
    isEnabled: boolean;
    lastSyncedAt: string | null;
  };
  salespersons?: string[];
  campaigns?: string[];
  cplexConfig?: CPLEXIntegrationConfig;
  cplexLogs?: CPLEXApiLog[];
  cplexSyncResult?: CPLEXSyncResult | null;
}

export const THAI_PROVINCES = [
  "กระบี่", "กรุงเทพมหานคร", "กาญจนบุรี", "กาฬสินธุ์", "กำแพงเพชร", 
  "ขอนแก่น", "จันทบุรี", "ฉะเชิงเทรา", "ชลบุรี", "ชัยนาท", 
  "ชัยภูมิ", "ชุมพร", "เชียงราย", "เชียงใหม่", "ตรัง", 
  "ตราด", "ตาก", "นครนายก", "นครปฐม", "นครพนม", 
  "นครราชสีมา", "นครศรีธรรมราช", "นครสวรรค์", "นนทบุรี", "นราธิวาส", 
  "น่าน", "บึงกาฬ", "บุรีรัมย์", "ปทุมธานี", "ประจวบคีรีขันธ์", 
  "ปราจีนบุรี", "ปัตตานี", "พระนครศรีอยุธยา", "พะเยา", "พังงา", 
  "พัทลุง", "พิจิตร", "พิษณุโลก", "เพชรบุรี", "เพชรบูรณ์", 
  "แพร่", "ภูเก็ต", "มหาสารคาม", "มุกดาหาร", "แม่ฮ่องสอน", 
  "ยโสธร", "ยะลา", "ร้อยเอ็ด", "ระนอง", "ระยอง", 
  "ราชบุรี", "ลพบุรี", "ลำปาง", "ลำพูน", "เลย", 
  "ศรีสะเกษ", "สกลนคร", "สงขลา", "สตูล", "สมุทรปราการ", 
  "สมุทรสงคราม", "สมุทรสาคร", "สระแก้ว", "สระบุรี", "สิงห์บุรี", 
  "สุโขทัย", "สุพรรณบุรี", "สุราษฎร์ธานี", "สุรินทร์", "หนองคาย", 
  "หนองบัวลำภู", "อ่างทอง", "อำนาจเจริญ", "อุดรธานี", "อุตรดิตถ์", 
  "อุทัยธานี", "อุบลราชธานี"
];

export const TRANSPORT_CARRIERS = [
  "flash", "dhl", "spx", "kex", "best express", "ไปรษณีย์", "ขนส่งต่างประเทศ", "ทั้งหมด"
];

// ==========================================
// Affiliate Member & Referral Tracking Models
// ==========================================
export interface Affiliate {
  id: string;              // Primary key (Firestore Doc ID)
  affiliateId: string;     // Unique Affiliate ID e.g. "AFF0001"
  name: string;            // ชื่อ Affiliate / ผู้แนะนำ
  phone: string;           // เบอร์โทรศัพท์
  lineId?: string;         // LINE ID
  contactChannel?: string; // ช่องทางติดต่อ / บันทึกช่องทาง
  status: "active" | "inactive"; // สถานะ: Active / Inactive
  createdAt: string;       // วันที่เพิ่ม (ISO string)
  updatedAt?: string;      // วันที่อัปเดตล่าสุด
  notes?: string;          // บันทึกเพิ่มเติม
}


