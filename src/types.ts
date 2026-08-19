/**
 * Mylogiz Sales CRM - Shared Data Definitions
 */

export enum LeadStatus {
  NEW_LEAD = "new_lead",          // 🟡 Lead ใหม่
  CONTACTED = "contacted",        // 🟠 ติดต่อแล้ว
  SENT_DETAILS = "sent_details",  // 🔵 ส่งรายละเอียด
  MEETING = "meeting",            // 📅 นัด Meeting
  WAITING_DOCS = "waiting_docs",  // 🟣 รอเอกสาร
  REGISTERED = "registered",      // 🟢 สมัครแล้ว
  ACTIVATED = "activated",        // ✅ เปิดใช้งานแล้ว
  REGULAR = "regular",            // ⭐ ใช้งานประจำ
  LOST = "lost",                  // Lost
  NOT_INTERESTED = "not_interested", // ยังไม่สนใจ
  NO_CONTACT = "no_contact",      // ติดต่อไม่ได้
}

export const StatusLabels: Record<LeadStatus, string> = {
  [LeadStatus.NEW_LEAD]: "🟡 Lead ใหม่",
  [LeadStatus.CONTACTED]: "🟠 ติดต่อแล้ว",
  [LeadStatus.SENT_DETAILS]: "🔵 ส่งรายละเอียด",
  [LeadStatus.MEETING]: "📅 นัด Meeting",
  [LeadStatus.WAITING_DOCS]: "🟣 รอเอกสาร",
  [LeadStatus.REGISTERED]: "🟢 สมัครแล้ว",
  [LeadStatus.ACTIVATED]: "✅ เปิดใช้งานแล้ว",
  [LeadStatus.REGULAR]: "⭐ ใช้งานประจำ",
  [LeadStatus.LOST]: "❌ Lost",
  [LeadStatus.NOT_INTERESTED]: "⚪ ยังไม่สนใจ",
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

export interface Note {
  id: string;
  text: string;
  createdAt: string;
  author: string;
}

export interface TimelineItem {
  id: string;
  title: string;
  description: string;
  date: string;
  type: "call" | "details" | "document" | "activation" | "system" | "note";
}

export interface FollowUp {
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  isCompleted: boolean;
  note?: string; // หมายเหตุการติดตาม
}

export interface Documents {
  idCard: boolean;       // บัตรประชาชน
  bookBank: boolean;     // Book Bank
  companyReg: boolean;   // หนังสือรับรอง
  taxDoc: boolean;       // ภาษี
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
  documents: Documents;        // ตรวจเช็คเอกสาร
  calls: CallLog[];            // บันทึกการโทร
  files: CRMFile[];            // ไฟล์เอกสารแนบ
  salesPerson: string;         // เซลส์ผู้ดูแล
  createdAt: string;           // วันที่เพิ่ม Lead
  updatedAt: string;           // อัปเดตล่าสุด
  customerType?: "individual" | "corporate"; // ประเภทลูกค้า: บุคคลธรรมดา หรือ นิติบุคคล
  campaign?: string;           // แคมเปญการตลาดที่ลูกค้าเข้ามา
  
  // ฟิลด์พิเศษเมื่อสมัคร/เปิดใช้งานแล้ว (Registered/Activated)
  customerCode?: string;       // รหัสลูกค้า
  registeredDate?: string;     // วันที่สมัคร
  activationDate?: string;     // วันที่เปิดใช้งาน
  firstShipmentDate?: string;  // ส่งพัสดุครั้งแรก
  ratePlan?: string;           // เรทราคาที่ใช้
  paymentType?: string;        // เครดิต/เติมเงิน
}

export interface SalespersonPerformance {
  name: string;
  leadsCount: number;
  registeredCount: number;
  conversionRate: number;
  newShopsCount: number;
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

