import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { LeadStatus, Lead, Note, TimelineItem, CRMStore } from "./src/types";

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

const INITIAL_STORE: CRMStore = {
  leads: DEFAULT_LEADS,
  sheetsConfig: {
    sheetUrl: "https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKv19An905yF926dfgN1_aWf62kbI/edit",
    sheetName: "Mylogiz_CRM_Sync",
    isEnabled: true,
    lastSyncedAt: null
  },
  salespersons: ["Phere", "Nalin", "Beer"]
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
