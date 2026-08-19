import React, { useState, useEffect } from "react";
import { Lead, LeadStatus, TimelineItem } from "./types";
import { generateNextCustomerCode } from "./utils/codeGenerator";
import DashboardView from "./components/DashboardView";
import LeadsView from "./components/LeadsView";
import FollowUpView from "./components/FollowUpView";
import DocumentsView from "./components/DocumentsView";
import CustomersView from "./components/CustomersView";
import ReportsView from "./components/ReportsView";
import NotesView from "./components/NotesView";
import SettingsView from "./components/SettingsView";
import LeadDetailsModal from "./components/LeadDetailsModal";
import LoginView from "./components/LoginView";
import { 
  LayoutDashboard, Users, PhoneCall, FileText, Settings, 
  UserCheck, BarChart3, MessageSquare, LogOut, Menu, 
  RefreshCw, CloudLightning, ShieldAlert, X, ChevronRight, Sparkles,
  Sun, Moon, Palette
} from "lucide-react";
import { motion } from "motion/react";
import { db } from "./firebase";
import { collection, doc, onSnapshot, setDoc, updateDoc, writeBatch, deleteDoc } from "firebase/firestore";

function cleanFirestorePayload<T>(data: T): T {
  if (data === null || data === undefined) return "" as any;
  if (typeof data !== "object") return data;
  if (Array.isArray(data)) {
    return data.map(cleanFirestorePayload) as any;
  }
  const cleaned: any = {};
  for (const [key, val] of Object.entries(data)) {
    if (val !== undefined) {
      cleaned[key] = cleanFirestorePayload(val);
    }
  }
  return cleaned;
}

export default function App() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [salespersons, setSalespersons] = useState<string[]>([]);
  const [campaigns, setCampaigns] = useState<string[]>([]);
  const [currentUser, setCurrentUser] = useState<string | null>(() => {
    return localStorage.getItem("crm_current_user");
  });

  // Minimalist Theme state: "light" (มินิมอลสว่าง) | "dark" (มินิมอลเข้ม) | "soft" (ซอฟต์สบายตา)
  const [theme, setTheme] = useState<"light" | "dark" | "soft">(() => {
    return (localStorage.getItem("crm_theme") as "light" | "dark" | "soft") || "light";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("crm_theme", theme);
  }, [theme]);

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pheresFilterMode, setPheresFilterMode] = useState<"all" | "own">("all");
  const [userPasswords, setUserPasswords] = useState<Record<string, string>>({});
  const [sheetsConfig, setSheetsConfig] = useState<{
    sheetUrl: string;
    sheetName?: string;
    webAppUrl?: string;
    isEnabled: boolean;
    lastSyncedAt: string | null;
  }>({
    sheetUrl: "https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKv19An905yF926dfgN1_aWf62kbI/edit",
    sheetName: "Mylogiz_CRM_Sync",
    webAppUrl: "",
    isEnabled: true,
    lastSyncedAt: null
  });

  const handleUpdatePassword = async (salespersonName: string, newPass: string) => {
    try {
      const updatedMap = { ...userPasswords, [salespersonName]: newPass };
      await setDoc(doc(db, "config", "user_passwords"), { passwords: updatedMap });
      return true;
    } catch (err) {
      console.error("Failed to update user password", err);
    }
    return false;
  };

  const handleUpdateSalespersons = async (newSalespersons: string[]) => {
    try {
      await setDoc(doc(db, "config", "salespersons"), { list: newSalespersons });
      return true;
    } catch (err) {
      console.error("Failed to update salespersons", err);
    }
    return false;
  };

  const handleAddCampaign = async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed || campaigns.includes(trimmed)) return;
    const updated = [...campaigns, trimmed];
    setCampaigns(updated);
    try {
      await setDoc(doc(db, "config", "campaigns"), { list: updated });
    } catch (err) {
      console.error("Failed to add campaign", err);
    }
  };

  const handleDeleteCampaign = async (name: string) => {
    const updated = campaigns.filter(c => c !== name);
    setCampaigns(updated);
    try {
      await setDoc(doc(db, "config", "campaigns"), { list: updated });
    } catch (err) {
      console.error("Failed to delete campaign", err);
    }
  };

  const handleRenameSalesperson = async (oldName: string, newName: string) => {
    try {
      // 1. Rename in salespersons list
      const updatedSalespersons = salespersons.map(sp => sp === oldName ? newName : sp);
      await setDoc(doc(db, "config", "salespersons"), { list: updatedSalespersons });

      if (currentUser === oldName) {
        setCurrentUser(newName);
        localStorage.setItem("crm_current_user", newName);
      }

      // 2. Batch update leads in Firestore (using batch write for efficiency)
      const batch = writeBatch(db);
      let updatedCount = 0;

      leads.forEach(lead => {
        let needsUpdate = false;
        const updatedFields: any = {};

        if (lead.salesPerson === oldName) {
          updatedFields.salesPerson = newName;
          needsUpdate = true;
        }

        if (lead.notes && lead.notes.some(n => n.author === oldName)) {
          updatedFields.notes = lead.notes.map(note => {
            if (note.author === oldName) {
              return { ...note, author: newName };
            }
            return note;
          });
          needsUpdate = true;
        }

        if (needsUpdate) {
          updatedFields.updatedAt = new Date().toISOString();
          batch.update(doc(db, "leads", lead.id), updatedFields);
          updatedCount++;
        }
      });

      if (updatedCount > 0) {
        await batch.commit();
      }

      return true;
    } catch (err) {
      console.error("Failed to rename salesperson", err);
    }
    return false;
  };

  const handleRenameSelf = async (newName: string) => {
    if (!currentUser) return false;
    return handleRenameSalesperson(currentUser, newName);
  };

  const handleLogin = (name: string) => {
    setCurrentUser(name);
    localStorage.setItem("crm_current_user", name);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem("crm_current_user");
  };

  // Real-time Firebase listeners
  useEffect(() => {
    setLoading(true);
    setErrorMsg(null);

    // 1. Listen to leads collection
    const unsubscribeLeads = onSnapshot(
      collection(db, "leads"),
      (snapshot) => {
        const leadsList: Lead[] = [];
        snapshot.forEach((docSnap) => {
          leadsList.push({ id: docSnap.id, ...docSnap.data() } as Lead);
        });
        // Sort newest first by default in memory
        leadsList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setLeads(leadsList);
        setSelectedLead((prev) => {
          if (!prev) return null;
          const found = leadsList.find((l) => l.id === prev.id);
          return found || prev;
        });
        setLoading(false);
        setIsRefreshing(false);
      },
      (err) => {
        console.error("Leads subscriber error:", err);
        setErrorMsg("ไม่สามารถเชื่อมต่อแบบเรียลไทม์กับรายการลูกค้าได้");
        setLoading(false);
        setIsRefreshing(false);
      }
    );

    // 2. Listen to salespersons list document
    const unsubscribeSp = onSnapshot(
      doc(db, "config", "salespersons"),
      (snapshot) => {
        if (snapshot.exists()) {
          setSalespersons(snapshot.data().list || ["Phere", "Nalin", "Beer"]);
        } else {
          setDoc(doc(db, "config", "salespersons"), { list: ["Phere", "Nalin", "Beer"] });
        }
      },
      (err) => {
        console.error("Salespersons listener error:", err);
      }
    );

    // 3. Listen to sheetsConfig document
    const unsubscribeSheets = onSnapshot(
      doc(db, "config", "sheetsConfig"),
      (snapshot) => {
        if (snapshot.exists()) {
          setSheetsConfig(snapshot.data() as any);
        } else {
          const defaultSheetsConfig = {
            sheetUrl: "https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKv19An905yF926dfgN1_aWf62kbI/edit",
            sheetName: "Mylogiz_CRM_Sync",
            isEnabled: true,
            lastSyncedAt: null
          };
          setDoc(doc(db, "config", "sheetsConfig"), defaultSheetsConfig);
        }
      },
      (err) => {
        console.error("Sheets config listener error:", err);
      }
    );

    // 4. Listen to user_passwords document
    const unsubscribePasswords = onSnapshot(
      doc(db, "config", "user_passwords"),
      (snapshot) => {
        if (snapshot.exists()) {
          setUserPasswords(snapshot.data().passwords || {});
        } else {
          setDoc(doc(db, "config", "user_passwords"), { passwords: {} });
        }
      },
      (err) => {
        console.error("User passwords listener error:", err);
      }
    );

    // 5. Listen to campaigns list document
    const DEFAULT_CAMPAIGNS = [
      "แคมเปญ 8.8 Sales Shock",
      "แคมเปญ TikTok Live",
      "แคมเปญ Facebook Ads",
      "แคมเปญ Google Search",
      "แคมเปญลูกค้าเก่าแนะนำ",
      "แคมเปญออกบูธ/สัมมนา"
    ];
    const unsubscribeCampaigns = onSnapshot(
      doc(db, "config", "campaigns"),
      (snapshot) => {
        if (snapshot.exists()) {
          setCampaigns(snapshot.data().list || DEFAULT_CAMPAIGNS);
        } else {
          setDoc(doc(db, "config", "campaigns"), { list: DEFAULT_CAMPAIGNS });
        }
      },
      (err) => {
        console.error("Campaigns listener error:", err);
      }
    );

    return () => {
      unsubscribeLeads();
      unsubscribeSp();
      unsubscribeSheets();
      unsubscribePasswords();
      unsubscribeCampaigns();
    };
  }, []);

  // Log out user if they are deleted from settings
  useEffect(() => {
    if (currentUser && salespersons.length > 0 && !salespersons.includes(currentUser)) {
      setCurrentUser(null);
      localStorage.removeItem("crm_current_user");
    }
  }, [salespersons, currentUser]);

  // Sync state helper to update selectedLead context if leads array updates
  useEffect(() => {
    if (selectedLead) {
      const current = leads.find(l => l.id === selectedLead.id);
      if (current) {
        setSelectedLead(current);
      }
    }
  }, [leads]);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    // Real-time connections are already handling sync; we provide visual feedback
    setTimeout(() => {
      setIsRefreshing(false);
    }, 500);
  };

  // 1. ADD NEW LEAD
  const handleAddLead = async (leadData: Omit<Lead, "id" | "createdAt" | "updatedAt" | "timeline" | "calls" | "files">) => {
    setErrorMsg(null);
    try {
      const id = `id_${Math.random().toString(36).substring(2, 11)}`;
      const newLead: Lead = {
        ...leadData,
        id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        notes: [],
        timeline: [
          {
            id: `id_${Math.random().toString(36).substring(2, 11)}`,
            title: "เพิ่ม Lead เข้าระบบ",
            description: `สร้างลูกค้าเป้าหมายใหม่โดย ${leadData.salesPerson || "ระบบ"}`,
            date: new Date().toISOString(),
            type: "system"
          }
        ],
        calls: [],
        files: [],
        documents: leadData.documents || { idCard: false, bookBank: false, companyReg: false, taxDoc: false, storefrontPhoto: false }
      };

      const cleanedLead = cleanFirestorePayload(newLead);
      await setDoc(doc(db, "leads", id), cleanedLead);
    } catch (err: any) {
      console.error(err);
      setErrorMsg("เกิดข้อผิดพลาดในการบันทึก Lead ใหม่ไปยัง Cloud Firestore");
    }
  };

  // 2. UPDATE LEAD STATUS (Quick change)
  const handleUpdateLeadStatus = async (id: string, newStatus: LeadStatus) => {
    setErrorMsg(null);
    const lead = leads.find(l => l.id === id);
    if (!lead) return;

    try {
      const timeline: TimelineItem[] = [...(lead.timeline || [])];
      let registeredDate = lead.registeredDate || null;
      let activationDate = lead.activationDate || null;
      let customerCode = lead.customerCode || null;
      let firstShipmentDate = lead.firstShipmentDate || null;

      if (newStatus !== lead.status) {
        timeline.push({
          id: `id_${Math.random().toString(36).substring(2, 11)}`,
          title: "เปลี่ยนสถานะ Pipeline",
          description: `เปลี่ยนจาก "${lead.status}" เป็น "${newStatus}"`,
          date: new Date().toISOString(),
          type: "system"
        });

        if (newStatus === LeadStatus.REGISTERED && !lead.registeredDate) {
          registeredDate = new Date().toISOString().split("T")[0];
          timeline.push({
            id: `id_${Math.random().toString(36).substring(2, 11)}`,
            title: "ยื่นเอกสารอนุมัติสำเร็จ",
            description: "ระบบจดบันทึกวันสมัครอย่างเป็นทางการเรียบร้อย",
            date: new Date().toISOString(),
            type: "document"
          });
        }

        if (newStatus === LeadStatus.ACTIVATED && !lead.activationDate) {
          activationDate = new Date().toISOString().split("T")[0];
          if (!lead.customerCode) {
            customerCode = generateNextCustomerCode(leads);
          }
          timeline.push({
            id: `id_${Math.random().toString(36).substring(2, 11)}`,
            title: "เปิดใช้งานบัญชีสำเร็จ",
            description: `เปิดพอร์ตของลูกค้า รหัสลูกค้าที่เปิดใช้งาน: ${customerCode || lead.customerCode}`,
            date: new Date().toISOString(),
            type: "activation"
          });
        }

        if (newStatus === LeadStatus.REGULAR && !lead.firstShipmentDate) {
          firstShipmentDate = new Date().toISOString().split("T")[0];
          timeline.push({
            id: `id_${Math.random().toString(36).substring(2, 11)}`,
            title: "ส่งพัสดุแรกสำเร็จ (ใช้งานประจำ)",
            description: "เริ่มทำการจัดส่งพัสดุก้อนใหญ่ครั้งแรกกับเครือข่ายเรียบร้อย",
            date: new Date().toISOString(),
            type: "system"
          });
        }
      }

      const updatedLead: any = {
        ...lead,
        status: newStatus,
        timeline,
        updatedAt: new Date().toISOString()
      };
      if (registeredDate !== null) updatedLead.registeredDate = registeredDate;
      if (activationDate !== null) updatedLead.activationDate = activationDate;
      if (customerCode !== null) updatedLead.customerCode = customerCode;
      if (firstShipmentDate !== null) updatedLead.firstShipmentDate = firstShipmentDate;

      await setDoc(doc(db, "leads", id), updatedLead);
    } catch (err: any) {
      console.error(err);
      setErrorMsg("ไม่สามารถอัปเดตสถานะในเซิร์ฟเวอร์คลาวด์ได้");
    }
  };

  // 3. FULL UPDATE LEAD (Details change)
  const handleUpdateLead = async (updatedLead: Lead) => {
    setErrorMsg(null);
    try {
      const existingLead = leads.find(l => l.id === updatedLead.id);
      let timeline: TimelineItem[] = [...(updatedLead.timeline || [])];
      let registeredDate = updatedLead.registeredDate || null;
      let activationDate = updatedLead.activationDate || null;
      let customerCode = updatedLead.customerCode || null;
      let firstShipmentDate = updatedLead.firstShipmentDate || null;

      if (existingLead && updatedLead.status && updatedLead.status !== existingLead.status) {
        timeline.push({
          id: `id_${Math.random().toString(36).substring(2, 11)}`,
          title: "เปลี่ยนสถานะ Pipeline",
          description: `เปลี่ยนจาก "${existingLead.status}" เป็น "${updatedLead.status}"`,
          date: new Date().toISOString(),
          type: "system"
        });

        if (updatedLead.status === LeadStatus.REGISTERED && !existingLead.registeredDate) {
          registeredDate = new Date().toISOString().split("T")[0];
          timeline.push({
            id: `id_${Math.random().toString(36).substring(2, 11)}`,
            title: "ยื่นเอกสารอนุมัติสำเร็จ",
            description: "ระบบจดบันทึกวันสมัครอย่างเป็นทางการเรียบร้อย",
            date: new Date().toISOString(),
            type: "document"
          });
        }

        if (updatedLead.status === LeadStatus.ACTIVATED && !existingLead.activationDate) {
          activationDate = new Date().toISOString().split("T")[0];
          if (!updatedLead.customerCode) {
            customerCode = generateNextCustomerCode(leads);
          }
          timeline.push({
            id: `id_${Math.random().toString(36).substring(2, 11)}`,
            title: "เปิดใช้งานบัญชีสำเร็จ",
            description: `เปิดพอร์ตของลูกค้า รหัสลูกค้าที่เปิดใช้งาน: ${customerCode || updatedLead.customerCode}`,
            date: new Date().toISOString(),
            type: "activation"
          });
        }

        if (updatedLead.status === LeadStatus.REGULAR && !existingLead.firstShipmentDate) {
          firstShipmentDate = new Date().toISOString().split("T")[0];
          timeline.push({
            id: `id_${Math.random().toString(36).substring(2, 11)}`,
            title: "ส่งพัสดุแรกสำเร็จ (ใช้งานประจำ)",
            description: "เริ่มทำการจัดส่งพัสดุก้อนใหญ่ครั้งแรกกับเครือข่ายเรียบร้อย",
            date: new Date().toISOString(),
            type: "system"
          });
        }
      }

      const finalLead: any = {
        ...updatedLead,
        timeline,
        updatedAt: new Date().toISOString()
      };
      if (registeredDate !== null) finalLead.registeredDate = registeredDate;
      if (activationDate !== null) finalLead.activationDate = activationDate;
      if (customerCode !== null) finalLead.customerCode = customerCode;
      if (firstShipmentDate !== null) finalLead.firstShipmentDate = firstShipmentDate;

      const cleanedFinalLead = cleanFirestorePayload(finalLead);
      setSelectedLead(cleanedFinalLead);
      await setDoc(doc(db, "leads", updatedLead.id), cleanedFinalLead);
    } catch (err: any) {
      console.error(err);
      setErrorMsg("ไม่สามารถเซฟข้อมูลการอัปเดตลงคลาวด์ได้");
    }
  };

  // 3.5. DELETE LEAD
  const handleDeleteLead = async (leadId: string): Promise<boolean> => {
    setErrorMsg(null);
    try {
      await deleteDoc(doc(db, "leads", leadId));
      if (selectedLead && selectedLead.id === leadId) {
        setSelectedLead(null);
      }
      return true;
    } catch (err: any) {
      console.error(err);
      setErrorMsg("ไม่สามารถลบข้อมูล Lead ออกจากระบบคลาวด์ได้");
      return false;
    }
  };

  // 4. ADD TIMELINE/NOTE
  const handleAddNote = async (leadId: string, text: string, author: string) => {
    setErrorMsg(null);
    try {
      const lead = leads.find(l => l.id === leadId);
      if (!lead) return;

      const newNote = {
        id: `id_${Math.random().toString(36).substring(2, 11)}`,
        text,
        createdAt: new Date().toISOString(),
        author: author || "ระบบ"
      };

      const notes = [...(lead.notes || []), newNote];
      const timeline = [
        ...(lead.timeline || []),
        {
          id: `id_${Math.random().toString(36).substring(2, 11)}`,
          title: "เขียนบันทึกช่วยจำ (Note)",
          description: `โดย ${author || "ระบบ"}: "${text.substring(0, 30)}${text.length > 30 ? "..." : ""}"`,
          date: new Date().toISOString(),
          type: "note" as const
        }
      ];

      await updateDoc(doc(db, "leads", leadId), {
        notes,
        timeline,
        updatedAt: new Date().toISOString()
      });
    } catch (err: any) {
      console.error(err);
      setErrorMsg("ไม่สามารถเพิ่มโน้ตใหม่ในฐานข้อมูลคลาวด์ได้");
    }
  };

  // 5. LOG CALL OUTCOME
  const handleAddCall = async (
    leadId: string, 
    answered: boolean, 
    interestLevel: number, 
    notes: string, 
    nextFollowUpInDays?: number,
    customFollowUpDate?: string
  ) => {
    setErrorMsg(null);
    try {
      const lead = leads.find(l => l.id === leadId);
      if (!lead) return;

      const newCall = {
        id: `id_${Math.random().toString(36).substring(2, 11)}`,
        date: new Date().toISOString(),
        answered,
        interestLevel,
        notes,
        nextFollowUpInDays
      };

      const calls = [...(lead.calls || []), newCall];
      const timeline = [...(lead.timeline || [])];

      timeline.push({
        id: `id_${Math.random().toString(36).substring(2, 11)}`,
        title: answered ? "✓ โทรคุยแล้ว (รับสาย)" : "✗ ติดต่อไม่ได้ (ไม่รับสาย)",
        description: `ความสนใจ: ${"⭐".repeat(interestLevel)} | หมายเหตุ: ${notes}`,
        date: new Date().toISOString(),
        type: "call" as const
      });

      let followUp = { ...lead.followUp };
      if (customFollowUpDate) {
        followUp = {
          date: customFollowUpDate,
          time: "10:00",
          isCompleted: false
        };
        timeline.push({
          id: `id_${Math.random().toString(36).substring(2, 11)}`,
          title: "ตั้งเวลาติดตามครั้งใหม่ (กำหนดเอง)",
          description: `กำหนดโทรอีกครั้งวันที่ ${customFollowUpDate} เวลา ${followUp.time}`,
          date: new Date().toISOString(),
          type: "system" as const
        });
      } else if (nextFollowUpInDays) {
        const nextDate = new Date();
        nextDate.setDate(nextDate.getDate() + parseInt(nextFollowUpInDays.toString(), 10));
        followUp = {
          date: nextDate.toISOString().split("T")[0],
          time: "10:00",
          isCompleted: false
        };
        timeline.push({
          id: `id_${Math.random().toString(36).substring(2, 11)}`,
          title: "ตั้งเวลาติดตามครั้งใหม่",
          description: `กำหนดโทรอีกครั้งวันที่ ${followUp.date} เวลา ${followUp.time}`,
          date: new Date().toISOString(),
          type: "system" as const
        });
      }

      await updateDoc(doc(db, "leads", leadId), {
        calls,
        timeline,
        followUp,
        updatedAt: new Date().toISOString()
      });
    } catch (err: any) {
      console.error(err);
      setErrorMsg("ไม่สามารถจัดเก็บข้อมูลสายโทรศัพท์ลงคลาวด์ได้");
    }
  };

  // 6. LOG FILE UPLOAD
  const handleAddFile = async (
    leadId: string, 
    name: string, 
    size: string, 
    type: "image" | "pdf" | "other",
    url?: string
  ) => {
    setErrorMsg(null);
    try {
      const lead = leads.find(l => l.id === leadId);
      if (!lead) return;

      const newFile = {
        id: `id_${Math.random().toString(36).substring(2, 11)}`,
        name,
        url: url || "#",
        type: type || "image",
        size: size || "120 KB",
        uploadedAt: new Date().toISOString()
      };

      const files = [...(lead.files || []), newFile];
      const timeline = [
        ...(lead.timeline || []),
        {
          id: `id_${Math.random().toString(36).substring(2, 11)}`,
          title: "อัปโหลดไฟล์เอกสาร",
          description: `อัปโหลดไฟล์: ${name} (${size})`,
          date: new Date().toISOString(),
          type: "document" as const
        }
      ];

      await updateDoc(doc(db, "leads", leadId), {
        files,
        timeline,
        updatedAt: new Date().toISOString()
      });
    } catch (err: any) {
      console.error(err);
      setErrorMsg("ไม่สามารถบันทึกแนบไฟล์เอกสารลงคลาวด์ได้");
    }
  };

  // 7. GOOGLE SHEETS SYNC MANUAL
  const handleSyncGoogleSheets = async (spreadsheetUrl: string, sheetName: string) => {
    try {
      const now = new Date().toISOString();
      const updatedConfig = {
        ...sheetsConfig,
        sheetUrl: spreadsheetUrl,
        sheetName: sheetName || sheetsConfig.sheetName || "Mylogiz_CRM_Sync",
        lastSyncedAt: now
      };
      
      await setDoc(doc(db, "config", "sheetsConfig"), updatedConfig);
      
      return {
        success: true,
        message: "ซิงค์ข้อมูลกับ Google Sheet สำเร็จแบบเรียลไทม์ (ผ่านคลาวด์)!",
        timestamp: now
      };
    } catch (err: any) {
      console.error(err);
      return {
        success: false,
        message: "ไม่สามารถเชื่อมต่อระบบซิงค์ Google Sheets ได้: " + err.message,
        timestamp: null
      };
    }
  };

  const handleUpdateSheetsConfig = async (sheetUrl: string, sheetName: string, isEnabled: boolean, webAppUrl?: string) => {
    try {
      const updatedConfig = {
        sheetUrl,
        sheetName,
        webAppUrl: webAppUrl !== undefined ? webAppUrl : (sheetsConfig.webAppUrl || ""),
        isEnabled,
        lastSyncedAt: sheetsConfig.lastSyncedAt
      };
      await setDoc(doc(db, "config", "sheetsConfig"), updatedConfig);
      return true;
    } catch (err) {
      console.error("Failed to update sheets config", err);
    }
    return false;
  };

  // Sidebar link options
  const SIDEBAR_LINKS = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "leads", label: "Pipeline", icon: Users },
    { id: "followup", label: "Follow-up", icon: PhoneCall },
    { id: "documents", label: "คลังเอกสาร COD", icon: FileText },
    { id: "customers", label: "ฐานลูกค้าสมาชิก", icon: UserCheck },
    { id: "reports", label: "รายงานผลงานขาย", icon: BarChart3 },
    { id: "notes", label: "โน้ตช่วยจำแชร์", icon: MessageSquare },
    { id: "settings", label: "ตั้งค่าระบบ & Sheets", icon: Settings },
  ];

  const handleNavigate = (tab: string) => {
    setActiveTab(tab);
    setSidebarOpen(false);
  };

  // Render view controller with dynamic user permissions and filtering
  const managerName = salespersons[0] || "Phere";
  const isManager = currentUser === "Phere" || currentUser === managerName;

  const displayedLeads = (() => {
    if (!currentUser) return [];
    if (isManager) {
      if (pheresFilterMode === "own") {
        return leads.filter(l => l.salesPerson === currentUser);
      }
      return leads;
    } else {
      // Regular salespeople only see their own assigned leads
      return leads.filter(l => l.salesPerson === currentUser);
    }
  })();

  const renderActiveView = () => {
    switch (activeTab) {
      case "dashboard":
        return <DashboardView leads={displayedLeads} onNavigate={handleNavigate} onSelectLead={setSelectedLead} onUpdateLead={handleUpdateLead} />;
      case "leads":
        return (
          <LeadsView 
            leads={displayedLeads} 
            salespersons={salespersons}
            campaigns={campaigns}
            onAddCampaign={handleAddCampaign}
            onDeleteCampaign={handleDeleteCampaign}
            currentUser={currentUser}
            onAddLead={handleAddLead} 
            onUpdateLeadStatus={handleUpdateLeadStatus} 
            onSelectLead={setSelectedLead} 
            onUpdateLead={handleUpdateLead}
            onDeleteLead={handleDeleteLead}
          />
        );
      case "followup":
        return <FollowUpView leads={displayedLeads} onSelectLead={setSelectedLead} onUpdateLead={handleUpdateLead} />;
      case "documents":
        return <DocumentsView leads={displayedLeads} onSelectLead={setSelectedLead} onUpdateLead={handleUpdateLead} />;
      case "customers":
        return <CustomersView leads={displayedLeads} onSelectLead={setSelectedLead} onUpdateLead={handleUpdateLead} />;
      case "reports":
        return <ReportsView leads={displayedLeads} salespersons={salespersons} currentUser={currentUser} />;
      case "notes":
        return (
          <NotesView 
            leads={displayedLeads} 
            salespersons={salespersons}
            currentUser={currentUser}
            onAddNote={handleAddNote} 
            onSelectLead={setSelectedLead} 
          />
        );
       case "settings":
        return (
          <SettingsView 
            leads={displayedLeads}
            leadsCount={displayedLeads.length} 
            salespersons={salespersons}
            campaigns={campaigns}
            onAddCampaign={handleAddCampaign}
            onDeleteCampaign={handleDeleteCampaign}
            currentUser={currentUser}
            userPasswords={userPasswords}
            onUpdatePassword={handleUpdatePassword}
            sheetsConfig={sheetsConfig}
            onUpdateSalespersons={handleUpdateSalespersons}
            onRenameSelf={handleRenameSelf}
            onRenameSalesperson={handleRenameSalesperson}
            onSyncGoogleSheets={handleSyncGoogleSheets} 
            onUpdateSheetsConfig={handleUpdateSheetsConfig}
          />
        );
      default:
        return <DashboardView leads={displayedLeads} onNavigate={handleNavigate} onSelectLead={setSelectedLead} />;
    }
  };

  if (!currentUser) {
    return (
      <LoginView 
        salespersons={salespersons} 
        userPasswords={userPasswords} 
        onLogin={handleLogin} 
        onUpdatePassword={handleUpdatePassword}
        loading={loading} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex font-sans text-slate-800" id="app-root-workspace">
      
      {/* 1. DESKTOP SIDEBAR PANEL */}
      <aside className="hidden lg:flex w-60 bg-white border-r border-slate-200 shrink-0 flex-col justify-between">
        <div className="p-6 space-y-6">
          
          {/* Logo Brand Header */}
          <div className="mb-2">
            <h1 className="text-xl font-bold tracking-tight text-blue-600">Mylogiz CRM</h1>
            <p className="text-xs text-slate-400 font-medium uppercase mt-1 tracking-wider">Sales Logistics</p>
          </div>

          {/* Navigation Links list */}
          <nav className="space-y-1 text-xs" id="desktop-nav">
            {SIDEBAR_LINKS.map(link => {
              const isActive = activeTab === link.id;
              return (
                <button
                  key={link.id}
                  id={`nav-link-${link.id}`}
                  onClick={() => handleNavigate(link.id)}
                  className={`w-full flex items-center gap-3 py-2.5 px-3.5 rounded-lg font-medium transition-all text-left cursor-pointer ${isActive ? "bg-blue-50 text-blue-700" : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"}`}
                >
                  <link.icon className={`w-4 h-4 ${isActive ? "text-blue-600" : "text-slate-400"}`} />
                  <span>{link.label}</span>
                  {isActive && <ChevronRight className="w-3.5 h-3.5 ml-auto text-blue-600" />}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer info brand - Profile at bottom matches clean minimalism layout */}
        <div className="p-4 border-t border-slate-100 flex flex-col gap-3">
          <div className="bg-slate-50 rounded-xl p-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-600 text-xs shrink-0">
                {currentUser ? currentUser.substring(currentUser.length - 2) : "เซลส์"}
              </div>
              <div className="text-left min-w-0 flex-1">
                <span className="text-xs font-bold text-slate-700 block truncate" title={currentUser || ""}>{currentUser}</span>
                <span className="text-[10px] text-slate-400 block font-medium leading-none truncate">Sales Executive</span>
              </div>
            </div>
            <button
              id="logout-sidebar-btn"
              onClick={handleLogout}
              className="p-1 hover:bg-slate-100 hover:text-rose-600 text-slate-400 rounded-lg transition-colors cursor-pointer shrink-0"
              title="ออกจากระบบ"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
          <div className="px-2 text-[10px] text-slate-400 flex items-center gap-1">
            <CloudLightning className="w-3 h-3 text-emerald-500" />
            <span>เชื่อมฐานข้อมูล Cloud • © Mylogiz 2569</span>
          </div>
        </div>
      </aside>

      {/* 2. MOBILE RESPONSIVE DRAW DRAWER */}
      {sidebarOpen && (
        <div id="mobile-sidebar-overlay" className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 lg:hidden flex">
          <motion.div 
            initial={{ x: -260 }} 
            animate={{ x: 0 }} 
            className="w-60 bg-white border-r border-slate-200 p-5 flex flex-col justify-between"
          >
            <div className="space-y-5">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white text-sm">M</div>
                  <span className="font-bold text-slate-800 text-sm">Mylogiz CRM</span>
                </div>
                <button 
                  id="close-mobile-sidebar-btn"
                  onClick={() => setSidebarOpen(false)} 
                  className="p-1 hover:bg-slate-50 rounded-lg text-slate-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="space-y-1 text-xs">
                {SIDEBAR_LINKS.map(link => {
                  const isActive = activeTab === link.id;
                  return (
                    <button
                      key={link.id}
                      id={`mobile-nav-link-${link.id}`}
                      onClick={() => handleNavigate(link.id)}
                      className={`w-full flex items-center gap-3 py-2 px-3 rounded-lg font-medium transition-all text-left cursor-pointer ${isActive ? "bg-blue-50 text-blue-700" : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"}`}
                    >
                      <link.icon className={`w-4 h-4 ${isActive ? "text-blue-600" : "text-slate-400"}`} />
                      <span>{link.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="text-[10px] text-slate-400">
              © Mylogiz 2569
            </div>
          </motion.div>
          <div className="flex-1" onClick={() => setSidebarOpen(false)} />
        </div>
      )}

      {/* 3. MAIN APP AREA */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Global App Topbar Header */}
        <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-4 sm:px-6 shrink-0 shadow-sm z-10">
          <div className="flex items-center gap-3">
            <button 
              id="open-mobile-sidebar-btn"
              onClick={() => setSidebarOpen(true)} 
              className="lg:hidden p-1.5 hover:bg-slate-100 text-slate-500 rounded-lg transition-colors cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="text-xs text-slate-400 flex items-center gap-2">
              <span className="font-bold text-slate-700 hidden sm:inline">คีย์หลัก:</span>
              <span className="bg-blue-50 border border-blue-100 text-blue-700 px-2.5 py-1 rounded-md font-mono text-[10px] font-bold">
                Mylogiz Sales CRM
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Minimalist Theme Switcher 3-way Toggle */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[11px] font-bold shrink-0 shadow-3xs" id="theme-switcher-toggle">
              <button
                id="theme-light-btn"
                onClick={() => setTheme("light")}
                className={`px-2 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                  theme === "light" ? "bg-white text-amber-600 shadow-2xs font-extrabold" : "text-slate-400 hover:text-slate-700"
                }`}
                title="โหมดมินิมอลสว่าง (Soft Minimalist Light)"
              >
                <Sun className="w-3.5 h-3.5 text-amber-500" />
                <span className="hidden sm:inline">สว่าง</span>
              </button>
              <button
                id="theme-soft-btn"
                onClick={() => setTheme("soft")}
                className={`px-2 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                  theme === "soft" ? "bg-white text-indigo-700 shadow-2xs font-extrabold" : "text-slate-400 hover:text-slate-700"
                }`}
                title="โหมดซอฟต์สบายตา (Warm Cream Natural)"
              >
                <Palette className="w-3.5 h-3.5 text-indigo-500" />
                <span className="hidden sm:inline">ซอฟต์</span>
              </button>
              <button
                id="theme-dark-btn"
                onClick={() => setTheme("dark")}
                className={`px-2 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                  theme === "dark" ? "bg-slate-900 text-blue-400 shadow-2xs font-extrabold" : "text-slate-400 hover:text-slate-700"
                }`}
                title="โหมดมินิมอลเข้ม (Dark Luxury)"
              >
                <Moon className="w-3.5 h-3.5 text-blue-400" />
                <span className="hidden sm:inline">เข้ม</span>
              </button>
            </div>

            {/* Phere/Manager lead visibility filter toggle */}
            {isManager && (
              <div className="hidden sm:flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[11px] font-bold shrink-0 shadow-3xs">
                <button
                  id="filter-all-leads-btn"
                  onClick={() => setPheresFilterMode("all")}
                  className={`px-2 py-1 rounded-md transition-all cursor-pointer ${pheresFilterMode === "all" ? "bg-white text-blue-700 shadow-2xs font-extrabold" : "text-slate-500 hover:text-slate-800"}`}
                  title="ดูข้อมูลลูกค้าของทุกคน"
                >
                  👥 ทุกคน ({leads.length})
                </button>
                <button
                  id="filter-own-leads-btn"
                  onClick={() => setPheresFilterMode("own")}
                  className={`px-2 py-1 rounded-md transition-all cursor-pointer ${pheresFilterMode === "own" ? "bg-white text-blue-700 shadow-2xs font-extrabold" : "text-slate-500 hover:text-slate-800"}`}
                  title="ดูเฉพาะข้อมูลลูกค้าของตัวเอง"
                >
                  👤 ฉัน ({leads.filter(l => l.salesPerson === currentUser).length})
                </button>
              </div>
            )}

            {/* Sync Refresh Status indicator */}
            <button
              id="refresh-leads-btn"
              onClick={handleManualRefresh}
              className={`p-1.5 border border-slate-200 hover:border-blue-300 text-slate-500 hover:text-blue-600 bg-white rounded-lg transition-all flex items-center gap-1.5 text-xs font-semibold cursor-pointer ${isRefreshing ? "opacity-50" : ""}`}
              title="รีเฟรชอัปเดตข้อมูลล่าสด"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">ดึงข้อมูลล่าสุด</span>
            </button>

            {/* Profile widget */}
            <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-700 text-[11px] shadow-2xs">
                  {currentUser ? currentUser.substring(currentUser.length - 2) : "เซลส์"}
                </div>
                <div className="text-left hidden md:block">
                  <span className="text-[11px] font-bold text-slate-800 block leading-none">{currentUser}</span>
                </div>
              </div>
              <button
                id="logout-header-btn"
                onClick={handleLogout}
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-50 rounded-lg transition-all cursor-pointer flex items-center justify-center"
                title="ออกจากระบบ"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </header>

        {/* Global Error Banner if backend goes offline */}
        {errorMsg && (
          <div id="global-error-banner" className="bg-red-50 text-red-900 border-b border-red-200 p-3.5 px-6 text-xs flex items-center gap-2.5 justify-between animate-fade-in shrink-0">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
              <span className="font-semibold">{errorMsg}</span>
            </div>
            <button 
              onClick={() => setErrorMsg(null)} 
              className="text-red-700 hover:text-red-900 font-bold hover:underline"
            >
              ปิดคำเตือน
            </button>
          </div>
        )}

        {/* Dynamic Inner View stage */}
        <main className="p-4 sm:p-6 pb-24 lg:pb-6 flex-1 overflow-y-auto max-w-7xl w-full mx-auto space-y-6">
          {loading ? (
            <div className="h-96 flex flex-col items-center justify-center gap-3 text-xs text-gray-500">
              <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
              <p className="font-semibold">กำลังเชื่อมโยงเซิร์ฟเวอร์ระบบขนส่งและดึงฐานข้อมูลลูกค้า...</p>
            </div>
          ) : (
            renderActiveView()
          )}
        </main>
      </div>

      {/* 5. MOBILE BOTTOM NAVIGATION BAR (1-tap access on smartphones) */}
      <div id="mobile-bottom-nav" className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 z-40 px-1 py-1 flex items-center justify-around shadow-lg">
        {SIDEBAR_LINKS.slice(0, 5).map(link => {
          const isActive = activeTab === link.id;
          return (
            <button
              key={link.id}
              id={`mobile-bottom-${link.id}`}
              onClick={() => handleNavigate(link.id)}
              className={`flex flex-col items-center gap-0.5 py-1 px-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                isActive ? "text-blue-600 dark:text-blue-400 font-extrabold" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              }`}
            >
              <link.icon className={`w-4 h-4 ${isActive ? "scale-110 text-blue-600 dark:text-blue-400" : ""}`} />
              <span className="truncate max-w-[58px] text-[9px]">{link.label.split(" ")[0]}</span>
            </button>
          );
        })}
        <button
          id="mobile-bottom-more-btn"
          onClick={() => setSidebarOpen(true)}
          className="flex flex-col items-center gap-0.5 py-1 px-1 text-slate-400 hover:text-slate-600 rounded-lg text-[10px] font-bold cursor-pointer"
        >
          <Menu className="w-4 h-4" />
          <span className="text-[9px]">เมนูเพิ่ม</span>
        </button>
      </div>

      {/* 4. DETAILS POPUP MODAL (Rendered globally on top if a lead is selected) */}
      {selectedLead && (
        <LeadDetailsModal 
          lead={selectedLead} 
          salespersons={salespersons}
          campaigns={campaigns}
          onAddCampaign={handleAddCampaign}
          onDeleteCampaign={handleDeleteCampaign}
          currentUser={currentUser}
          onClose={() => setSelectedLead(null)} 
          onUpdateLead={handleUpdateLead}
          onDeleteLead={handleDeleteLead}
          onAddNote={handleAddNote}
          onAddCall={handleAddCall}
          onAddFile={handleAddFile}
        />
      )}

    </div>
  );
}
