import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { 
  LeadStatus, Lead, Note, TimelineItem, CRMStore, 
  CPLEXIntegrationConfig, CPLEXApiLog, CPLEXSyncResult, CPLEXUsageSummary,
  DEFAULT_CPLEX_DATA_MAPPINGS
} from "./src/types";
import { MylogizCPLEXAdapter } from "./src/integrations/cplex/cplexAdapter";

dotenv.config();

const app = express();
const PORT = 3000;
const STORE_PATH = path.join(process.cwd(), "crm_store.json");

// Middleware
app.use(express.json({ limit: "50mb" }));

// Helper to generate IDs
const generateId = () => `id_${Math.random().toString(36).substring(2, 11)}`;

// Initial/Seed Data
const DEFAULT_LEADS: Lead[] = [];

// Secure in-memory token store for CPLEX (prevent token leakage)
let cplexSecretTokenInMemory = process.env.CPLEX_API_KEY || process.env.CPLEX_SECRET_TOKEN || "";

const DEFAULT_CPLEX_CONFIG: CPLEXIntegrationConfig = {
  systemName: "Mylogiz CPLEX",
  baseUrl: "https://app.mylogiz.ai/th/mylogiz-cplex/admin/dashboard",
  authType: "bearer_token",
  customHeaderName: "X-API-Key",
  customerIdentifier: "customerCode",
  dataMapping: DEFAULT_CPLEX_DATA_MAPPINGS,
  status: cplexSecretTokenInMemory ? "disconnected" : "waiting_for_api",
  lastConnectedAt: null,
  lastSyncedAt: null,
  isEnabled: true
};

const INITIAL_STORE: CRMStore = {
  leads: DEFAULT_LEADS,
  sheetsConfig: {
    sheetUrl: "https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKv19An905yF926dfgN1_aWf62kbI/edit",
    sheetName: "Mylogiz_CRM_Sync",
    isEnabled: true,
    lastSyncedAt: null
  },
  salespersons: ["Phere", "Nalin", "Beer"],
  cplexConfig: DEFAULT_CPLEX_CONFIG,
  cplexLogs: [],
  cplexSyncResult: null
};

// Database storage handling
const loadStore = (): CRMStore => {
  try {
    if (fs.existsSync(STORE_PATH)) {
      const data = fs.readFileSync(STORE_PATH, "utf-8");
      const store = JSON.parse(data);
      if (!store.salespersons) {
        store.salespersons = ["Phere", "Nalin", "Beer"];
      }
      if (!store.sheetsConfig) {
        store.sheetsConfig = {
          sheetUrl: "https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKv19An905yF926dfgN1_aWf62kbI/edit",
          sheetName: "Mylogiz_CRM_Sync",
          isEnabled: true,
          lastSyncedAt: null
        };
      } else {
        if (!store.sheetsConfig.sheetUrl) {
          store.sheetsConfig.sheetUrl = "https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKv19An905yF926dfgN1_aWf62kbI/edit";
        }
        if (!store.sheetsConfig.sheetName) {
          store.sheetsConfig.sheetName = "Mylogiz_CRM_Sync";
        }
      }
      if (!store.cplexConfig) {
        store.cplexConfig = { ...DEFAULT_CPLEX_CONFIG };
      }
      if (!store.cplexLogs) {
        store.cplexLogs = [];
      }
      return store;
    }
  } catch (error) {
    console.error("Failed to load store, loading seed data", error);
  }
  
  // Write default seed if not exists
  saveStore(INITIAL_STORE);
  return INITIAL_STORE;
};

const saveStore = (store: CRMStore) => {
  try {
    fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), "utf-8");
  } catch (error) {
    console.error("Failed to save store", error);
  }
};

// Ensure database file exists
loadStore();

// API Endpoints

// 1. Get all leads
app.get("/api/leads", (req, res) => {
  const store = loadStore();
  res.json(store.leads);
});

// 2. Add a new lead
app.post("/api/leads", (req, res) => {
  const store = loadStore();
  const newLead: Lead = {
    ...req.body,
    id: generateId(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    notes: req.body.notes || [],
    timeline: [
      {
        id: generateId(),
        title: "เพิ่ม Lead เข้าระบบ",
        description: `สร้างลูกค้าเป้าหมายใหม่โดย ${req.body.salesPerson || "ระบบ"}`,
        date: new Date().toISOString(),
        type: "system"
      },
      ...(req.body.timeline || [])
    ],
    calls: req.body.calls || [],
    files: req.body.files || [],
    documents: req.body.documents || { idCard: false, bookBank: false, companyReg: false, taxDoc: false, storefrontPhoto: false }
  };
  
  store.leads.unshift(newLead);
  saveStore(store);
  res.status(201).json(newLead);
});

// 3. Update an existing lead
app.put("/api/leads/:id", (req, res) => {
  const { id } = req.params;
  const store = loadStore();
  const index = store.leads.findIndex((l) => l.id === id);
  
  if (index === -1) {
    return res.status(404).json({ error: "Lead not found" });
  }
  
  const existingLead = store.leads[index];
  const updatedData = req.body;
  
  // Add timeline entry if status changed
  const timeline: TimelineItem[] = [...(existingLead.timeline || [])];
  if (updatedData.status && updatedData.status !== existingLead.status) {
    timeline.push({
      id: generateId(),
      title: "เปลี่ยนสถานะ Pipeline",
      description: `เปลี่ยนจาก "${existingLead.status}" เป็น "${updatedData.status}"`,
      date: new Date().toISOString(),
      type: "system"
    });
    
    // Auto populate dates based on status transitions
    if (updatedData.status === LeadStatus.REGISTERED && !existingLead.registeredDate) {
      updatedData.registeredDate = new Date().toISOString().split("T")[0];
      timeline.push({
        id: generateId(),
        title: "ยื่นเอกสารอนุมัติสำเร็จ",
        description: "ระบบจดบันทึกวันสมัครอย่างเป็นทางการเรียบร้อย",
        date: new Date().toISOString(),
        type: "document"
      });
    }
    
    if (updatedData.status === LeadStatus.ACTIVATED && !existingLead.activationDate) {
      updatedData.activationDate = new Date().toISOString().split("T")[0];
      if (!updatedData.customerCode) {
        updatedData.customerCode = `MLZ-${Math.floor(1000 + Math.random() * 9000)}`;
      }
      timeline.push({
        id: generateId(),
        title: "เปิดใช้งานบัญชีสำเร็จ",
        description: `เปิดพอร์ตของลูกค้า รหัสลูกค้าที่เปิดใช้งาน: ${updatedData.customerCode}`,
        date: new Date().toISOString(),
        type: "activation"
      });
    }

    if (updatedData.status === LeadStatus.REGULAR && !existingLead.firstShipmentDate) {
      updatedData.firstShipmentDate = new Date().toISOString().split("T")[0];
      timeline.push({
        id: generateId(),
        title: "ส่งพัสดุแรกสำเร็จ (ใช้งานประจำ)",
        description: "เริ่มทำการจัดส่งพัสดุก้อนใหญ่ครั้งแรกกับเครือข่ายเรียบร้อย",
        date: new Date().toISOString(),
        type: "system"
      });
    }
  }
  
  const updatedLead: Lead = {
    ...existingLead,
    ...updatedData,
    timeline,
    updatedAt: new Date().toISOString()
  };
  
  store.leads[index] = updatedLead;
  saveStore(store);
  res.json(updatedLead);
});

// 4. Delete a lead
app.delete("/api/leads/:id", (req, res) => {
  const { id } = req.params;
  const store = loadStore();
  const index = store.leads.findIndex((l) => l.id === id);
  
  if (index === -1) {
    return res.status(404).json({ error: "Lead not found" });
  }
  
  store.leads.splice(index, 1);
  saveStore(store);
  res.json({ success: true, message: "Lead deleted" });
});

// 5. Add a note to a lead
app.post("/api/leads/:id/notes", (req, res) => {
  const { id } = req.params;
  const { text, author } = req.body;
  const store = loadStore();
  const index = store.leads.findIndex((l) => l.id === id);
  
  if (index === -1) {
    return res.status(404).json({ error: "Lead not found" });
  }
  
  const existingLead = store.leads[index];
  const newNote: Note = {
    id: generateId(),
    text,
    createdAt: new Date().toISOString(),
    author: author || "ระบบ"
  };
  
  const notes = [...(existingLead.notes || []), newNote];
  const timeline = [
    ...(existingLead.timeline || []),
    {
      id: generateId(),
      title: "เขียนบันทึกช่วยจำ (Note)",
      description: `โดย ${author || "ระบบ"}: "${text.substring(0, 30)}${text.length > 30 ? "..." : ""}"`,
      date: new Date().toISOString(),
      type: "note" as const
    }
  ];
  
  const updatedLead: Lead = {
    ...existingLead,
    notes,
    timeline,
    updatedAt: new Date().toISOString()
  };
  
  store.leads[index] = updatedLead;
  saveStore(store);
  res.status(201).json(updatedLead);
});

// 6. Add a call record to a lead
app.post("/api/leads/:id/calls", (req, res) => {
  const { id } = req.params;
  const { answered, interestLevel, notes, nextFollowUpInDays, customFollowUpDate } = req.body;
  const store = loadStore();
  const index = store.leads.findIndex((l) => l.id === id);
  
  if (index === -1) {
    return res.status(404).json({ error: "Lead not found" });
  }
  
  const existingLead = store.leads[index];
  const newCall = {
    id: generateId(),
    date: new Date().toISOString(),
    answered,
    interestLevel,
    notes,
    nextFollowUpInDays
  };
  
  const calls = [...(existingLead.calls || []), newCall];
  const timeline = [
    ...(existingLead.timeline || []),
    {
      id: generateId(),
      title: answered ? "✓ โทรคุยแล้ว (รับสาย)" : "✗ ติดต่อไม่ได้ (ไม่รับสาย)",
      description: `ความสนใจ: ${"⭐".repeat(interestLevel)} | หมายเหตุ: ${notes}`,
      date: new Date().toISOString(),
      type: "call" as const
    }
  ];
  
  // If next follow-up is set, update followUp date automatically
  let followUp = { ...existingLead.followUp };
  if (customFollowUpDate) {
    followUp = {
      date: customFollowUpDate,
      time: "10:00",
      isCompleted: false
    };
    timeline.push({
      id: generateId(),
      title: "ตั้งเวลาติดตามครั้งใหม่ (กำหนดเอง)",
      description: `กำหนดโทรอีกครั้งวันที่ ${customFollowUpDate} เวลา ${followUp.time}`,
      date: new Date().toISOString(),
      type: "system" as const
    });
  } else if (nextFollowUpInDays) {
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + parseInt(nextFollowUpInDays, 10));
    followUp = {
      date: nextDate.toISOString().split("T")[0],
      time: "10:00",
      isCompleted: false
    };
    timeline.push({
      id: generateId(),
      title: "ตั้งเวลาติดตามครั้งใหม่",
      description: `กำหนดโทรอีกครั้งวันที่ ${followUp.date} เวลา ${followUp.time}`,
      date: new Date().toISOString(),
      type: "system" as const
    });
  }
  
  const updatedLead: Lead = {
    ...existingLead,
    calls,
    timeline,
    followUp,
    updatedAt: new Date().toISOString()
  };
  
  store.leads[index] = updatedLead;
  saveStore(store);
  res.status(201).json(updatedLead);
});

// 7. Add a file to a lead
app.post("/api/leads/:id/files", (req, res) => {
  const { id } = req.params;
  const { name, size, type } = req.body;
  const store = loadStore();
  const index = store.leads.findIndex((l) => l.id === id);
  
  if (index === -1) {
    return res.status(404).json({ error: "Lead not found" });
  }
  
  const existingLead = store.leads[index];
  const newFile = {
    id: generateId(),
    name,
    url: "#",
    type: type || "image",
    size: size || "120 KB",
    uploadedAt: new Date().toISOString()
  };
  
  const files = [...(existingLead.files || []), newFile];
  const timeline = [
    ...(existingLead.timeline || []),
    {
      id: generateId(),
      title: "อัปโหลดไฟล์เอกสาร",
      description: `อัปโหลดไฟล์: ${name} (${size})`,
      date: new Date().toISOString(),
      type: "document" as const
    }
  ];
  
  const updatedLead: Lead = {
    ...existingLead,
    files,
    timeline,
    updatedAt: new Date().toISOString()
  };
  
  store.leads[index] = updatedLead;
  saveStore(store);
  res.status(201).json(updatedLead);
});

// 8. Google Sheets configuration endpoints
app.get("/api/sheets-config", (req, res) => {
  const store = loadStore();
  res.json(store.sheetsConfig);
});

app.post("/api/sheets-config", (req, res) => {
  const { sheetUrl, sheetName, isEnabled } = req.body;
  const store = loadStore();
  
  store.sheetsConfig = {
    sheetUrl: sheetUrl !== undefined ? sheetUrl : store.sheetsConfig.sheetUrl,
    sheetName: sheetName !== undefined ? sheetName : (store.sheetsConfig.sheetName || "Mylogiz_CRM_Sync"),
    isEnabled: isEnabled !== undefined ? isEnabled : store.sheetsConfig.isEnabled,
    lastSyncedAt: store.sheetsConfig.lastSyncedAt
  };
  
  saveStore(store);
  res.json(store.sheetsConfig);
});

// 9. Manual Sheet Sync
app.post("/api/sync-sheets", (req, res) => {
  const { spreadsheetUrl, sheetName } = req.body;
  const store = loadStore();
  
  if (spreadsheetUrl !== undefined) {
    store.sheetsConfig.sheetUrl = spreadsheetUrl;
  }
  if (sheetName !== undefined) {
    store.sheetsConfig.sheetName = sheetName;
  }
  
  store.sheetsConfig.lastSyncedAt = new Date().toISOString();
  saveStore(store);
  
  res.json({
    success: true,
    message: "ซิงค์ข้อมูลกับ Google Sheet สำเร็จแบบเรียลไทม์!",
    lastSyncedAt: store.sheetsConfig.lastSyncedAt,
    leadsSyncedCount: store.leads.length
  });
});

// 10. Salespersons list endpoints
app.get("/api/salespersons", (req, res) => {
  const store = loadStore();
  res.json(store.salespersons || ["Phere", "Nalin", "Beer"]);
});

app.post("/api/salespersons", (req, res) => {
  const { salespersons } = req.body;
  const store = loadStore();
  if (Array.isArray(salespersons)) {
    store.salespersons = salespersons;
    saveStore(store);
    return res.json({ success: true, salespersons: store.salespersons });
  }
  res.status(400).json({ error: "Invalid salespersons array" });
});

app.post("/api/salespersons/rename", (req, res) => {
  const { oldName, newName } = req.body;
  if (!oldName || !newName) {
    return res.status(400).json({ error: "Missing oldName or newName" });
  }
  const store = loadStore();
  
  // 1. Rename in salespersons list
  if (store.salespersons) {
    store.salespersons = store.salespersons.map(sp => sp === oldName ? newName : sp);
  } else {
    store.salespersons = ["Phere", "Nalin", "Beer"];
  }
  
  // 2. Update leads and internal arrays
  if (store.leads) {
    store.leads = store.leads.map(lead => {
      const updatedLead = { ...lead };
      if (updatedLead.salesPerson === oldName) {
        updatedLead.salesPerson = newName;
      }
      
      // Update notes inside lead if any
      if (updatedLead.notes) {
        updatedLead.notes = updatedLead.notes.map(note => {
          if (note.author === oldName) {
            return { ...note, author: newName };
          }
          return note;
        });
      }
      
      return updatedLead;
    });
  }
  
  saveStore(store);
  res.json({ success: true, salespersons: store.salespersons });
});

// 11. AI Customer Lead Analysis Endpoint
app.post("/api/ai/analyze-lead", async (req, res) => {
  try {
    const { lead } = req.body;
    if (!lead) {
      return res.status(400).json({ error: "Missing lead data" });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    
    // Check if key is available; if not, return intelligent calculated intelligence
    if (!apiKey) {
      const scoreNum = lead.score || 3;
      const shipVol = parseInt(lead.shippingVolume || lead.shipmentsPerDay || "0", 10);
      const callCount = (lead.calls || []).length;
      const winProb = Math.min(95, Math.max(25, scoreNum * 14 + (shipVol > 50 ? 18 : 8) + callCount * 4));
      const urgency = winProb >= 70 ? "high" : winProb >= 45 ? "medium" : "low";

      return res.json({
        winProbability: winProb,
        dealUrgency: urgency,
        summary: `ร้าน ${lead.shopName} เป็นลูกค้าราย${lead.customerType === "corporate" ? "นิติบุคคล" : "บุคคลธรรมดา"} ที่มีปริมาณส่งประมาณ ${lead.shippingVolume || lead.shipmentsPerDay || "10-50"} ชิ้น/วัน ขนส่งเดิมคือ ${lead.competitor || lead.preferredTransport?.[0] || "ไม่ระบุ"}`,
        customerPersona: `ผู้ประกอบการร้านค้าในจังหวัด ${lead.province || "ไม่ระบุ"} ต้องการขนส่งที่ส่งเร็ว มี COD ด่วน และราคาคุ้มค่าเพื่อลดต้นทุน`,
        strengths: [
          `มีปริมาณการส่งพัสดุต่อเนื่อง (${lead.shippingVolume || lead.shipmentsPerDay || "10-50"} ชิ้น/วัน)`,
          `ระดับความสนใจให้ไว้ที่ ${lead.score}/5 ดาว`,
          lead.customerType === "corporate" ? "เป็นรูปแบบนิติบุคคล ความน่าเชื่อถือสูง" : "ตัดสินใจได้รวดเร็วระดับเจ้าของร้าน"
        ],
        challenges: [
          lead.competitor || lead.preferredTransport?.[0] ? `ปัจจุบันใช้งานขนส่ง ${lead.competitor || lead.preferredTransport?.[0]} อยู่เดิม อาจต้องการเปรียบเทียบราคา` : "ยังไม่เคยลองใช้บริการระบบ Mylogiz",
          (lead.calls || []).filter((c: any) => !c.answered).length > 0 ? "บางช่วงเวลาไม่สะดวกรับสาย ควรนัดเวลาโทรล่วงหน้า" : "ต้องการความมั่นใจเรื่องเวลาเข้ารับพัสดุหน้าร้าน"
        ],
        recommendedAction: `นำเสนอทดลองส่งล็อตแรก ${Math.min(50, Math.max(10, shipVol || 20))} ชิ้น พร้อมเรตตารางราคาพิเศษ และนัดติดตามผลภายใน 2-3 วัน`,
        salesPitchScript: `"สวัสดีครับ/ค่ะ คุณ${lead.contactName || lead.shopName} ทาง Mylogiz มีโปรโมชันพิเศษสิทธิ์ส่วนลดตารางราคาและบริการ COD ด่วน สำหรับร้านค้าที่ส่งวันละ ${lead.shippingVolume || lead.shipmentsPerDay || "20+"} ชิ้น สามารถทดลองส่งล็อตแรกเพื่อวัดความเร็วและบริการได้เลยครับ"`,
        suggestedOffers: [
          "เรตราคาพิเศษสำหรับยอดพัสดุสม่ำเสมอ",
          "ฟรีบริการรถรับพัสดุถึงหน้าร้าน (Pick-up)",
          "ระบบ COD โอนเงินไวภายใน 1 วันทำการ"
        ]
      });
    }

    const aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    const promptText = `คุณคือผู้เชี่ยวชาญด้าน CRM และ Sales Intelligence ของ Mylogiz (บริษัทบริการขนส่งสินค้าและพัสดุ)
โปรดวิเคราะห์ข้อมูลลูกค้าเป้าหมาย (Lead) รายนี้ และประเมินโอกาสปิดการขาย พร้อมคำแนะนำการขายเชิงลึก:

ข้อมูลลูกค้า:
- ชื่อร้าน/บริษัท: ${lead.shopName}
- ชื่อผู้ติดต่อ: ${lead.contactName || "ไม่ระบุ"}
- ประเภทลูกค้า: ${lead.customerType === "corporate" ? "นิติบุคคล" : "บุคคลธรรมดา"}
- สถานะปัจจุบันในระบบ: ${lead.status}
- ระดับความสนใจ (Lead Score): ${lead.score} จาก 5 ดาว
- ปริมาณการส่งพัสดุต่อวัน: ${lead.shippingVolume || lead.shipmentsPerDay || "ไม่ระบุ"}
- ขนส่งที่ใช้อยู่ปัจจุบัน/ขนส่งที่สนใจ: ${lead.competitor || (lead.preferredTransport || []).join(", ") || "ไม่ระบุ"}
- จังหวัด: ${lead.province || "ไม่ระบุ"}
- ประวัติการโทร (${(lead.calls || []).length} ครั้ง): ${JSON.stringify((lead.calls || []).map((c: any) => ({ answered: c.answered, interest: c.interestLevel, note: c.notes })))}
- บันทึกย่อเพิ่มเติม (${(lead.notes || []).length} ข้อความ): ${JSON.stringify((lead.notes || []).map((n: any) => n.text))}

ตอบเป็นภาษาไทย ในรูปแบบ JSON ตาม Schema นี้เท่านั้น:
- winProbability: ตัวเลข 0-100 (เปอร์เซ็นต์โอกาสปิดการขาย)
- dealUrgency: "high" | "medium" | "low"
- summary: สรุปภาพรวมลูกค้ารายนี้ใน 2 ประโยค
- customerPersona: โปรไฟล์และลักษณะเฉพาะของลูกค้ารายนี้
- strengths: รายการจุดเด่นหรือปัจจัยบวกในการขาย (array string 2-3 ข้อ)
- challenges: รายการอุปสรรคหรือข้อกังวลที่ต้องระวัง (array string 2-3 ข้อ)
- recommendedAction: คำแนะนำขั้นตอนถัดไปสำหรับเซลส์
- salesPitchScript: บทพูดโทรขาย/ทักแชตสั้นๆ ที่ดึงดูดลูกค้า
- suggestedOffers: สิทธิประโยชน์/ข้อเสนอเรตราคาที่ควรนำเสนอ (array string 2-3 ข้อ)`;

    const response = await aiClient.models.generateContent({
      model: "gemini-3.6-flash",
      contents: promptText,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            winProbability: { type: Type.NUMBER, description: "โอกาสปิดการขาย 0-100" },
            dealUrgency: { type: Type.STRING, description: "high, medium, or low" },
            summary: { type: Type.STRING, description: "สรุปภาพรวมลูกค้า" },
            customerPersona: { type: Type.STRING, description: "ลักษณะและพฤติกรรมลูกค้า" },
            strengths: { type: Type.ARRAY, items: { type: Type.STRING }, description: "ปัจจัยบวก" },
            challenges: { type: Type.ARRAY, items: { type: Type.STRING }, description: "ข้อกังวล/อุปสรรค" },
            recommendedAction: { type: Type.STRING, description: "ขั้นตอนถัดไปที่แนะนำ" },
            salesPitchScript: { type: Type.STRING, description: "สคริปต์พูดเสนอขาย" },
            suggestedOffers: { type: Type.ARRAY, items: { type: Type.STRING }, description: "ข้อเสนอแนะนำ" }
          },
          required: ["winProbability", "dealUrgency", "summary", "customerPersona", "strengths", "challenges", "recommendedAction", "salesPitchScript", "suggestedOffers"]
        }
      }
    });

    const resultText = response.text || "";
    const parsed = JSON.parse(resultText);
    res.json(parsed);

  } catch (error: any) {
    console.error("AI Analysis error:", error);
    res.status(500).json({ error: error.message || "เกิดข้อผิดพลาดในการวิเคราะห์ด้วย AI" });
  }
});

// ==========================================
// 12. Mylogiz CPLEX Integration Endpoints
// ==========================================

// Helper to sanitize config for frontend (never send raw secret)
const getSanitizedCplexConfig = (config: CPLEXIntegrationConfig): CPLEXIntegrationConfig => {
  const hasToken = Boolean(cplexSecretTokenInMemory);
  let status = config.status;
  if (!hasToken && status !== "connected" && status !== "syncing") {
    status = "waiting_for_api";
  }
  return {
    ...config,
    status,
    hasToken,
    tokenMasked: hasToken ? "••••••••••••••••" : ""
  };
};

// 12.1 Get CPLEX Configuration & Status
app.get("/api/integrations/cplex/config", (req, res) => {
  const store = loadStore();
  const config = store.cplexConfig || DEFAULT_CPLEX_CONFIG;
  res.json(getSanitizedCplexConfig(config));
});

// 12.2 Save CPLEX Configuration
app.post("/api/integrations/cplex/config", (req, res) => {
  const store = loadStore();
  const { 
    systemName, 
    baseUrl, 
    authType, 
    customHeaderName, 
    customerIdentifier, 
    dataMapping,
    isEnabled,
    rawSecretToken 
  } = req.body;

  if (rawSecretToken !== undefined && rawSecretToken !== null && rawSecretToken !== "") {
    cplexSecretTokenInMemory = rawSecretToken;
  }

  const updatedConfig: CPLEXIntegrationConfig = {
    ...(store.cplexConfig || DEFAULT_CPLEX_CONFIG),
    systemName: systemName || store.cplexConfig?.systemName || "Mylogiz CPLEX",
    baseUrl: baseUrl !== undefined ? baseUrl : (store.cplexConfig?.baseUrl || ""),
    authType: authType || store.cplexConfig?.authType || "bearer_token",
    customHeaderName: customHeaderName !== undefined ? customHeaderName : store.cplexConfig?.customHeaderName,
    customerIdentifier: customerIdentifier || store.cplexConfig?.customerIdentifier || "customerCode",
    dataMapping: dataMapping !== undefined ? dataMapping : (store.cplexConfig?.dataMapping || DEFAULT_CPLEX_DATA_MAPPINGS),
    status: cplexSecretTokenInMemory ? "disconnected" : "waiting_for_api",
    isEnabled: isEnabled !== undefined ? isEnabled : (store.cplexConfig?.isEnabled ?? true)
  };

  store.cplexConfig = updatedConfig;
  saveStore(store);

  res.json({
    success: true,
    message: "บันทึกการตั้งค่าเชื่อมต่อ Mylogiz CPLEX สำเร็จ",
    config: getSanitizedCplexConfig(updatedConfig)
  });
});

// 12.3 Test Connection with CPLEX
app.post("/api/integrations/cplex/test", async (req, res) => {
  const store = loadStore();
  const config = store.cplexConfig || DEFAULT_CPLEX_CONFIG;

  if (!cplexSecretTokenInMemory) {
    return res.json({
      success: false,
      message: "รอการตั้งค่า API: ยังไม่มีการระบุ CPLEX API Key หรือ Secret Token ในระบบ (สามารถระบุใน Environment Variables หรือหน้า Settings เมื่อมีข้อมูลจริง)",
      responseTimeMs: 0,
      status: "waiting_for_api"
    });
  }

  const adapter = new MylogizCPLEXAdapter(config, cplexSecretTokenInMemory);
  const testResult = await adapter.testConnection();

  // Save log
  const logs = store.cplexLogs || [];
  logs.unshift(testResult.log);
  store.cplexLogs = logs.slice(0, 100);

  if (testResult.success) {
    config.status = "connected";
    config.lastConnectedAt = new Date().toISOString();
    config.lastErrorMessage = null;
  } else {
    config.status = "error";
    config.lastErrorMessage = testResult.message;
  }

  store.cplexConfig = config;
  saveStore(store);

  res.json({
    success: testResult.success,
    message: testResult.message,
    responseTimeMs: testResult.responseTimeMs,
    status: config.status
  });
});

// 12.4 Sync Data with CPLEX
app.post("/api/integrations/cplex/sync", async (req, res) => {
  const store = loadStore();
  const config = store.cplexConfig || DEFAULT_CPLEX_CONFIG;

  if (!config.isEnabled || !config.baseUrl) {
    return res.status(400).json({
      error: "ยังไม่ได้เปิดใช้งานหรือตั้งค่าระบบเชื่อมต่อ Mylogiz CPLEX"
    });
  }

  config.status = "syncing";
  saveStore(store);

  const adapter = new MylogizCPLEXAdapter(config, cplexSecretTokenInMemory);
  const { syncResult, log } = await adapter.syncData(store.leads);

  // Save log
  const logs = store.cplexLogs || [];
  logs.unshift(log);
  store.cplexLogs = logs.slice(0, 100);

  if (syncResult.status === "success") {
    config.status = "connected";
    config.lastSyncedAt = syncResult.lastSync;
    config.lastErrorMessage = null;
  } else {
    config.status = "error";
    config.lastErrorMessage = syncResult.message;
  }

  store.cplexConfig = config;
  store.cplexSyncResult = syncResult;
  saveStore(store);

  res.json({
    success: syncResult.status === "success",
    syncResult,
    message: syncResult.message || "ซิงค์ข้อมูลเรียบร้อยแล้ว"
  });
});

// 12.5 Get Customer Usage Summary from CPLEX
app.get("/api/customers/:customerId/cplex", async (req, res) => {
  try {
    const { customerId } = req.params;
    const { 
      customerCode, 
      phone, 
      email, 
      externalCustomerId, 
      rangeType, 
      startDate, 
      endDate 
    } = req.query as Record<string, string>;

    const store = loadStore();
    const config = store.cplexConfig || DEFAULT_CPLEX_CONFIG;

    if (!config.isEnabled || !config.baseUrl || !cplexSecretTokenInMemory) {
      return res.json({
        success: false,
        isConfigured: false,
        status: "waiting_for_api",
        errorMessage: "รอการตั้งค่า API: ยังไม่มีการระบุ CPLEX API Key หรือ Secret Token จริงในระบบ (ระบบเตรียมพร้อมแสดงผลเมื่อระบุ Credential)"
      });
    }

    // Determine customer identifier value based on configuration preference
    let identifierVal = "";
    if (config.customerIdentifier === "externalCustomerId" && externalCustomerId) {
      identifierVal = externalCustomerId;
    } else if (config.customerIdentifier === "customerCode" && customerCode) {
      identifierVal = customerCode;
    } else if (config.customerIdentifier === "phone" && phone) {
      identifierVal = phone;
    } else if (config.customerIdentifier === "email" && email) {
      identifierVal = email;
    } else {
      identifierVal = externalCustomerId || customerCode || phone || customerId;
    }

    if (!identifierVal) {
      return res.json({
        success: false,
        isConfigured: true,
        errorMessage: "ไม่พบรหัสอ้างอิงของลูกค้าสำหรับการค้นหาบนระบบ CPLEX"
      });
    }

    const adapter = new MylogizCPLEXAdapter(config, cplexSecretTokenInMemory);
    const result = await adapter.getCustomerUsage(
      identifierVal,
      config.customerIdentifier,
      {
        type: (rangeType as any) || "30days",
        startDate,
        endDate
      }
    );

    // Save log
    const logs = store.cplexLogs || [];
    logs.unshift(result.log);
    store.cplexLogs = logs.slice(0, 100);
    saveStore(store);

    if (result.success && result.usage) {
      res.json({
        success: true,
        isConfigured: true,
        usage: result.usage
      });
    } else {
      res.json({
        success: false,
        isConfigured: true,
        errorMessage: result.errorMessage || "ไม่พบข้อมูลการใช้งานของลูกค้ารายนี้บนระบบ CPLEX"
      });
    }

  } catch (err: any) {
    console.error("Error in CPLEX customer usage endpoint:", err);
    res.status(500).json({
      success: false,
      isConfigured: true,
      errorMessage: err.message || "เกิดข้อผิดพลาดในการดึงข้อมูลจาก CPLEX"
    });
  }
});

// 12.6 Get Detailed Customer Sales from CPLEX
app.get("/api/customers/:customerId/cplex/sales", async (req, res) => {
  const { customerId } = req.params;
  const store = loadStore();
  const config = store.cplexConfig || DEFAULT_CPLEX_CONFIG;

  if (!config.isEnabled || !config.baseUrl) {
    return res.status(400).json({ error: "ยังไม่ได้ตั้งค่า API Mylogiz CPLEX" });
  }

  const adapter = new MylogizCPLEXAdapter(config, cplexSecretTokenInMemory);
  const { response, log } = await adapter.executeRequest({
    endpoint: `/api/customers/${encodeURIComponent(customerId)}/sales`,
    method: "GET"
  });

  const logs = store.cplexLogs || [];
  logs.unshift(log);
  store.cplexLogs = logs.slice(0, 100);
  saveStore(store);

  if (response.success) {
    res.json(response.data || []);
  } else {
    res.status(response.statusCode || 500).json({ error: response.errorMessage });
  }
});

// 12.7 Get Detailed Customer Shipments from CPLEX
app.get("/api/customers/:customerId/cplex/shipments", async (req, res) => {
  const { customerId } = req.params;
  const store = loadStore();
  const config = store.cplexConfig || DEFAULT_CPLEX_CONFIG;

  if (!config.isEnabled || !config.baseUrl) {
    return res.status(400).json({ error: "ยังไม่ได้ตั้งค่า API Mylogiz CPLEX" });
  }

  const adapter = new MylogizCPLEXAdapter(config, cplexSecretTokenInMemory);
  const { response, log } = await adapter.executeRequest({
    endpoint: `/api/customers/${encodeURIComponent(customerId)}/shipments`,
    method: "GET"
  });

  const logs = store.cplexLogs || [];
  logs.unshift(log);
  store.cplexLogs = logs.slice(0, 100);
  saveStore(store);

  if (response.success) {
    res.json(response.data || []);
  } else {
    res.status(response.statusCode || 500).json({ error: response.errorMessage });
  }
});

// 12.8 Get Detailed Customer Orders from CPLEX
app.get("/api/customers/:customerId/cplex/orders", async (req, res) => {
  const { customerId } = req.params;
  const store = loadStore();
  const config = store.cplexConfig || DEFAULT_CPLEX_CONFIG;

  if (!config.isEnabled || !config.baseUrl) {
    return res.status(400).json({ error: "ยังไม่ได้ตั้งค่า API Mylogiz CPLEX" });
  }

  const adapter = new MylogizCPLEXAdapter(config, cplexSecretTokenInMemory);
  const { response, log } = await adapter.executeRequest({
    endpoint: `/api/customers/${encodeURIComponent(customerId)}/orders`,
    method: "GET"
  });

  const logs = store.cplexLogs || [];
  logs.unshift(log);
  store.cplexLogs = logs.slice(0, 100);
  saveStore(store);

  if (response.success) {
    res.json(response.data || []);
  } else {
    res.status(response.statusCode || 500).json({ error: response.errorMessage });
  }
});

// 12.9 Get CPLEX API Interaction Logs
app.get("/api/integrations/cplex/logs", (req, res) => {
  const store = loadStore();
  res.json(store.cplexLogs || []);
});

// 12.10 Clear CPLEX API Logs
app.delete("/api/integrations/cplex/logs", (req, res) => {
  const store = loadStore();
  store.cplexLogs = [];
  saveStore(store);
  res.json({ success: true, message: "ล้างรายการ API Logs สำเร็จ" });
});

// Vite Middleware & static assets serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Mylogiz Sales CRM listening on port ${PORT}`);
  });
}

startServer();
