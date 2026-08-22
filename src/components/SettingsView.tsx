import React, { useState, useEffect } from "react";
import { 
  Sliders, Database, FileSpreadsheet, Check, AlertTriangle, 
  RefreshCw, User, Plus, Trash2, X, Edit, Lock, KeyRound, 
  Download, Megaphone, Users, ShieldCheck, Filter, Calendar,
  Server, Link2, FileCode2, Globe, Clock, CheckCircle2, Eye, ShieldAlert,
  ChevronDown, ChevronUp, Layers, CheckSquare, Square, ArrowRight, Tag, HelpCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Lead, LeadStatus, StatusLabels, PRESET_TAG_CATEGORIES,
  CPLEXIntegrationConfig, CPLEXSyncResult, CPLEXFieldMappingItem,
  DEFAULT_CPLEX_DATA_MAPPINGS
} from "../types";
import { exportLeadsToExcel, getFollowUpStatus } from "../utils/crmHelpers";
import { cplexService } from "../integrations/cplex/cplexService";
import CPLEXConnectionModal from "./integrations/CPLEXConnectionModal";
import CPLEXLogsModal from "./integrations/CPLEXLogsModal";

interface SettingsViewProps {
  leads?: Lead[];
  leadsCount: number;
  salespersons?: string[];
  campaigns?: string[];
  onAddCampaign?: (name: string) => Promise<void>;
  onDeleteCampaign?: (name: string) => Promise<void>;
  currentUser?: string | null;
  userPasswords?: Record<string, string>;
  onUpdatePassword?: (salespersonName: string, newPass: string) => Promise<boolean>;
  onUpdateSalespersons?: (newSalespersons: string[]) => Promise<boolean>;
  onRenameSelf?: (newName: string) => Promise<boolean>;
  onRenameSalesperson?: (oldName: string, newName: string) => Promise<boolean>;
}

export default function SettingsView({ 
  leads = [],
  leadsCount, 
  salespersons = [], 
  campaigns = [],
  onAddCampaign,
  onDeleteCampaign,
  currentUser = null, 
  userPasswords = {},
  onUpdatePassword,
  onUpdateSalespersons, 
  onRenameSelf, 
  onRenameSalesperson
}: SettingsViewProps) {
  const managerName = salespersons[0] || "Phere";
  const isJackSuperAdmin = currentUser?.toLowerCase() === "jack";
  const isPhereManager = currentUser?.toLowerCase() === "phere" || currentUser === managerName;
  const isSuperAdmin = isJackSuperAdmin || isPhereManager;

  // Excel Export Filters State
  const [exportStatus, setExportStatus] = useState<string>("all");
  const [exportSalesperson, setExportSalesperson] = useState<string>("all");
  const [exportTag, setExportTag] = useState<string>("all");
  const [exportSuccessMsg, setExportSuccessMsg] = useState<string | null>(null);

  // Campaign management state
  const [newCampaignInput, setNewCampaignInput] = useState("");
  const [campaignMessage, setCampaignMessage] = useState("");

  const handleAddNewCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCampaignInput.trim();
    if (!trimmed) return;
    if (campaigns.includes(trimmed)) {
      setCampaignMessage("❌ มีชื่อแคมเปญนี้อยู่แล้วในระบบ");
      setTimeout(() => setCampaignMessage(""), 3000);
      return;
    }
    if (onAddCampaign) {
      await onAddCampaign(trimmed);
      setNewCampaignInput("");
      setCampaignMessage(`✅ เพิ่มแคมเปญ "${trimmed}" สำเร็จ`);
      setTimeout(() => setCampaignMessage(""), 3000);
    }
  };

  const handleDeleteCampaignItem = async (name: string) => {
    if (onDeleteCampaign) {
      await onDeleteCampaign(name);
      setCampaignMessage(`🗑️ ลบแคมเปญ "${name}" เรียบร้อยแล้ว`);
      setTimeout(() => setCampaignMessage(""), 3000);
    }
  };

  // Self Profile Rename
  const [selfNameInput, setSelfNameInput] = useState(currentUser || "");
  const [selfRenameMessage, setSelfRenameMessage] = useState("");

  const handleSelfRenameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = selfNameInput.trim();
    if (!trimmed || trimmed === currentUser) return;

    if (onRenameSelf) {
      const ok = await onRenameSelf(trimmed);
      if (ok) {
        setSelfRenameMessage(`✅ บันทึกชื่อโปรไฟล์ของคุณเป็น "${trimmed}" เรียบร้อยแล้ว`);
      } else {
        setSelfRenameMessage("❌ ไม่สามารถบันทึกชื่อได้ หรือชื่อนี้มีอยู่ในระบบแล้ว");
      }
      setTimeout(() => setSelfRenameMessage(""), 4000);
    }
  };

  // Password Management
  const [currentPassInput, setCurrentPassInput] = useState("");
  const [newPassInput, setNewPassInput] = useState("");
  const [confirmPassInput, setConfirmPassInput] = useState("");
  const [passMsg, setPassMsg] = useState<{ text: string; isError: boolean } | null>(null);
  const [isUpdatingPass, setIsUpdatingPass] = useState(false);

  // Mylogiz CPLEX Integration State
  const [cplexConfig, setCplexConfig] = useState<CPLEXIntegrationConfig>({
    systemName: "Mylogiz CPLEX",
    baseUrl: "https://app.mylogiz.ai/th/mylogiz-cplex/admin/dashboard",
    authType: "bearer_token",
    customHeaderName: "X-API-Key",
    customerIdentifier: "customerCode",
    dataMapping: DEFAULT_CPLEX_DATA_MAPPINGS,
    status: "disconnected",
    lastConnectedAt: null,
    lastSyncedAt: null,
    isEnabled: true
  });
  const [showCplexModal, setShowCplexModal] = useState(false);
  const [showCplexLogsModal, setShowCplexLogsModal] = useState(false);
  const [isTestingCplex, setIsTestingCplex] = useState(false);
  const [isSyncingCplex, setIsSyncingCplex] = useState(false);
  const [cplexSyncResult, setCplexSyncResult] = useState<CPLEXSyncResult | null>(null);
  const [cplexFeedbackMsg, setCplexFeedbackMsg] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  // Data Mapping Collapsible & State
  const [isDataMappingExpanded, setIsDataMappingExpanded] = useState(true);
  const [isSavingMapping, setIsSavingMapping] = useState(false);

  useEffect(() => {
    loadCplexConfig();
  }, []);

  const loadCplexConfig = async () => {
    try {
      const cfg = await cplexService.getConfig();
      // If dataMapping is missing or empty, fallback to defaults
      if (!cfg.dataMapping || cfg.dataMapping.length === 0) {
        cfg.dataMapping = DEFAULT_CPLEX_DATA_MAPPINGS;
      }
      setCplexConfig(cfg);
    } catch (err) {
      console.error("Failed to load CPLEX config:", err);
    }
  };

  const handleToggleMappingItem = async (itemId: string) => {
    const currentMappings = cplexConfig.dataMapping || DEFAULT_CPLEX_DATA_MAPPINGS;
    const updatedMappings = currentMappings.map(item => {
      if (item.id === itemId) {
        return { ...item, isEnabled: !item.isEnabled };
      }
      return item;
    });

    const updatedConfig = {
      ...cplexConfig,
      dataMapping: updatedMappings
    };

    setCplexConfig(updatedConfig);
    setIsSavingMapping(true);

    try {
      await cplexService.saveConfig(updatedConfig);
      setCplexFeedbackMsg({
        type: "success",
        text: "✅ บันทึกการตั้งค่าฟิลด์เชื่อมต่อเรียบร้อยแล้ว"
      });
    } catch (err: any) {
      setCplexFeedbackMsg({
        type: "error",
        text: `❌ ไม่สามารถบันทึกการตั้งค่าฟิลด์ได้: ${err.message || ""}`
      });
    } finally {
      setIsSavingMapping(false);
      setTimeout(() => setCplexFeedbackMsg(null), 3000);
    }
  };

  const handleToggleAllCategory = async (category: "customer" | "sales" | "shipping", enable: boolean) => {
    const currentMappings = cplexConfig.dataMapping || DEFAULT_CPLEX_DATA_MAPPINGS;
    const updatedMappings = currentMappings.map(item => {
      if (item.category === category) {
        return { ...item, isEnabled: enable };
      }
      return item;
    });

    const updatedConfig = {
      ...cplexConfig,
      dataMapping: updatedMappings
    };

    setCplexConfig(updatedConfig);
    setIsSavingMapping(true);

    try {
      await cplexService.saveConfig(updatedConfig);
      setCplexFeedbackMsg({
        type: "success",
        text: `✅ ${enable ? "เปิดใช้งาน" : "ปิดใช้งาน"}ฟิลด์ทั้งหมดในหมวดหมู่นี้แล้ว`
      });
    } catch (err: any) {
      setCplexFeedbackMsg({
        type: "error",
        text: `❌ ไม่สามารถบันทึกการตั้งค่าได้: ${err.message || ""}`
      });
    } finally {
      setIsSavingMapping(false);
      setTimeout(() => setCplexFeedbackMsg(null), 3000);
    }
  };

  const handleTestCplexConnection = async () => {
    setIsTestingCplex(true);
    setCplexFeedbackMsg(null);
    try {
      const res = await cplexService.testConnection();
      if (res.success) {
        setCplexConfig(prev => ({
          ...prev,
          status: "connected",
          lastConnectedAt: new Date().toISOString()
        }));
        setCplexFeedbackMsg({
          type: "success",
          text: `✅ ${res.message} (${res.responseTimeMs} ms)`
        });
      } else {
        setCplexConfig(prev => ({ ...prev, status: "error" }));
        setCplexFeedbackMsg({
          type: "error",
          text: `❌ ${res.message}`
        });
      }
    } catch (err: any) {
      setCplexConfig(prev => ({ ...prev, status: "error" }));
      setCplexFeedbackMsg({
        type: "error",
        text: `❌ ${err.message || "ไม่สามารถเชื่อมต่อ Mylogiz CPLEX ได้ กรุณาตรวจสอบการตั้งค่า API"}`
      });
    } finally {
      setIsTestingCplex(false);
      setTimeout(() => setCplexFeedbackMsg(null), 6000);
    }
  };

  const handleSyncCplexData = async () => {
    setIsSyncingCplex(true);
    setCplexFeedbackMsg(null);
    try {
      const res = await cplexService.syncNow();
      if (res.success && res.syncResult) {
        setCplexSyncResult(res.syncResult);
        setCplexConfig(prev => ({
          ...prev,
          status: "connected",
          lastSyncedAt: res.syncResult.lastSync
        }));
        setCplexFeedbackMsg({
          type: "success",
          text: `✅ ${res.message} (นำเข้า: ${res.syncResult.recordsImported}, อัปเดต: ${res.syncResult.recordsUpdated})`
        });
      } else {
        setCplexFeedbackMsg({
          type: "error",
          text: `❌ ${res.message || "การซิงค์ข้อมูลล้มเหลว"}`
        });
      }
    } catch (err: any) {
      setCplexFeedbackMsg({
        type: "error",
        text: `❌ ${err.message || "เกิดข้อผิดพลาดในการซิงค์ข้อมูลกับ CPLEX"}`
      });
    } finally {
      setIsSyncingCplex(false);
      setTimeout(() => setCplexFeedbackMsg(null), 6000);
    }
  };

  const handleUpdatePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (newPassInput.length < 4) {
      setPassMsg({ text: "⚠️ รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 4 ตัวอักษร", isError: true });
      return;
    }
    if (newPassInput !== confirmPassInput) {
      setPassMsg({ text: "⚠️ รหัสผ่านใหม่และยืนยันรหัสผ่านไม่ตรงกัน", isError: true });
      return;
    }

    const correctCurrent = userPasswords[currentUser] || "1234";
    if (currentPassInput !== correctCurrent) {
      setPassMsg({ text: "❌ รหัสผ่านปัจจุบันไม่ถูกต้อง", isError: true });
      return;
    }

    setIsUpdatingPass(true);
    if (onUpdatePassword) {
      const ok = await onUpdatePassword(currentUser, newPassInput);
      if (ok) {
        setPassMsg({ text: "✅ เปลี่ยนรหัสผ่านของคุณเรียบร้อยแล้ว", isError: false });
        setCurrentPassInput("");
        setNewPassInput("");
        setConfirmPassInput("");
      } else {
        setPassMsg({ text: "❌ เกิดข้อผิดพลาดในการบันทึกรหัสผ่าน", isError: true });
      }
    }
    setIsUpdatingPass(false);
    setTimeout(() => setPassMsg(null), 4000);
  };

  // Salesperson Management
  const [newSalespersonName, setNewSalespersonName] = useState("");
  const [salespersonMessage, setSalespersonMessage] = useState("");
  const [editingSp, setEditingSp] = useState<string | null>(null);
  const [editingNameInput, setEditingNameInput] = useState<string>("");

  const handleAddSalesperson = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newSalespersonName.trim();
    if (!trimmed) return;
    if (salespersons.includes(trimmed)) {
      setSalespersonMessage("❌ มีชื่อพนักงานขายคนนี้อยู่แล้วในระบบ");
      setTimeout(() => setSalespersonMessage(""), 3000);
      return;
    }
    if (onUpdateSalespersons) {
      const updated = [...salespersons, trimmed];
      const ok = await onUpdateSalespersons(updated);
      if (ok) {
        setNewSalespersonName("");
        setSalespersonMessage(`✅ เพิ่มเซลส์ "${trimmed}" สำเร็จ`);
      } else {
        setSalespersonMessage("❌ เกิดข้อผิดพลาดในการเพิ่มรายชื่อ");
      }
      setTimeout(() => setSalespersonMessage(""), 3000);
    }
  };

  const handleSaveRename = async (oldName: string) => {
    const trimmed = editingNameInput.trim();
    if (!trimmed || trimmed === oldName) {
      setEditingSp(null);
      return;
    }
    if (onRenameSalesperson) {
      const ok = await onRenameSalesperson(oldName, trimmed);
      if (ok) {
        setSalespersonMessage(`✅ เปลี่ยนชื่อเซลส์จาก "${oldName}" เป็น "${trimmed}" สำเร็จ`);
      } else {
        setSalespersonMessage("❌ ไม่สามารถเปลี่ยนชื่อได้");
      }
      setTimeout(() => setSalespersonMessage(""), 3000);
    }
    setEditingSp(null);
  };

  const handleDeleteSalesperson = async (name: string) => {
    if (salespersons.length <= 1) {
      setSalespersonMessage("⚠️ ต้องมีพนักงานขายอย่างน้อย 1 คนในระบบ");
      setTimeout(() => setSalespersonMessage(""), 3000);
      return;
    }
    if (name === managerName) {
      setSalespersonMessage("⚠️ ไม่สามารถลบผู้จัดการหลักของระบบได้");
      setTimeout(() => setSalespersonMessage(""), 3000);
      return;
    }
    if (confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบเซลส์ "${name}" ออกจากระบบ?`)) {
      if (onUpdateSalespersons) {
        const updated = salespersons.filter(s => s !== name);
        const ok = await onUpdateSalespersons(updated);
        if (ok) {
          setSalespersonMessage(`🗑️ ลบเซลส์ "${name}" ออกจากระบบเรียบร้อย`);
        }
        setTimeout(() => setSalespersonMessage(""), 3000);
      }
    }
  };

  // Filtered Leads for Export
  const exportTargetLeads = leads.filter(l => {
    if (exportStatus !== "all" && l.status !== exportStatus) return false;
    if (exportSalesperson !== "all" && l.salesPerson !== exportSalesperson) return false;
    if (exportTag !== "all" && !(l.tags || []).includes(exportTag)) return false;
    return true;
  });

  const allExistingTags = Array.from(new Set(leads.flatMap(l => l.tags || []))).filter(Boolean);

  const handlePerformExcelExport = () => {
    const dateStr = new Date().toISOString().split("T")[0];
    const filename = `Mylogiz_CRM_Leads_${dateStr}.xlsx`;
    const success = exportLeadsToExcel(exportTargetLeads, filename);
    if (success) {
      setExportSuccessMsg(`✅ ส่งออกไฟล์ Excel สำเร็จ (${exportTargetLeads.length} รายการ)`);
      setTimeout(() => setExportSuccessMsg(null), 4000);
    }
  };

  return (
    <div className="space-y-6" id="settings-view-container">
      {/* View Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-800">การตั้งค่าระบบ CRM (CRM System Settings)</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          จัดการข้อมูลพนักงานขาย แคมเปญการตลาด เปลี่ยนรหัสผ่าน และส่งออกฐานข้อมูลลูกค้าเป็นไฟล์ Excel (.xlsx)
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* CPLEX API & Integration Center (Full 3 cols) */}
        <div id="settings-cplex-integration-card" className="bg-white p-5 rounded-2xl border border-indigo-100 shadow-xs lg:col-span-3 space-y-5">
          
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-indigo-600 to-indigo-800 text-white rounded-xl shadow-xs shadow-indigo-500/20">
                <Server className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-slate-800 font-bold text-sm">เชื่อมต่อ Mylogiz CPLEX (API & Integration)</h3>
                  
                  {/* Connection Status Badge */}
                  {cplexConfig.status === "connected" ? (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5 font-mono">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      เชื่อมต่อแล้ว (Connected)
                    </span>
                  ) : cplexConfig.status === "error" ? (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1.5 font-mono">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                      เชื่อมต่อไม่ได้ (Error)
                    </span>
                  ) : cplexConfig.status === "syncing" || isSyncingCplex ? (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1.5 font-mono">
                      <RefreshCw className="w-3 h-3 animate-spin text-amber-600" />
                      กำลัง Sync (Syncing...)
                    </span>
                  ) : cplexConfig.status === "waiting_for_api" || !cplexConfig.hasToken ? (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300 flex items-center gap-1.5 font-mono">
                      <Clock className="w-3 h-3 text-amber-600" />
                      รอการตั้งค่า API
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200 flex items-center gap-1.5 font-mono">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                      ยังไม่ได้เชื่อมต่อ (Disconnected)
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  เชื่อมต่อ Mylogiz CRM กับระบบ Mylogiz CPLEX เพื่อดึงข้อมูลการใช้งานของลูกค้า เช่น ยอดขาย จำนวนออเดอร์ จำนวนพัสดุ และข้อมูลอื่น ๆ
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShowCplexModal(true)}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>เชื่อมต่อระบบ</span>
              </button>

              <button
                type="button"
                onClick={handleTestCplexConnection}
                disabled={isTestingCplex || isSyncingCplex}
                className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTestingCplex ? "animate-spin text-indigo-600" : ""}`} />
                <span>{isTestingCplex ? "กำลังทดสอบ..." : "ทดสอบการเชื่อมต่อ"}</span>
              </button>

              <button
                type="button"
                onClick={handleSyncCplexData}
                disabled={isSyncingCplex || isTestingCplex}
                className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <CheckCircle2 className={`w-3.5 h-3.5 ${isSyncingCplex ? "animate-spin text-emerald-600" : ""}`} />
                <span>{isSyncingCplex ? "กำลัง Sync..." : "Sync ข้อมูล"}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowCplexLogsModal(true)}
                className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <FileCode2 className="w-3.5 h-3.5" />
                <span>ดู Log</span>
              </button>
            </div>
          </div>

          {/* Feedback Message */}
          {cplexFeedbackMsg && (
            <div className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
              cplexFeedbackMsg.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-rose-50 border-rose-200 text-rose-800"
            }`}>
              <span>{cplexFeedbackMsg.text}</span>
            </div>
          )}

          {/* Config Details & Sync Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* 1. Endpoint & Auth Details */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 text-xs">
              <span className="text-slate-400 font-bold text-[10px] uppercase tracking-wider block">
                API Base URL
              </span>
              <div className="font-semibold text-slate-800 truncate" title={cplexConfig.baseUrl}>
                {cplexConfig.baseUrl || "ยังไม่ได้ระบุ"}
              </div>
              <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-500">
                <span>รูปแบบยืนยัน:</span>
                <span className="font-mono font-bold text-slate-700 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                  {cplexConfig.authType === "bearer_token" ? "Bearer Token" : cplexConfig.authType === "api_key" ? "API Key" : "Custom Header"}
                </span>
              </div>
            </div>

            {/* 2. Customer Identifier Matching */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 text-xs">
              <span className="text-slate-400 font-bold text-[10px] uppercase tracking-wider block">
                การจับคู่ข้อมูลลูกค้า (Identifier)
              </span>
              <div className="font-semibold text-slate-800">
                {cplexConfig.customerIdentifier === "customerCode" ? "รหัสลูกค้า (Customer Code เช่น MLZ-1001)" :
                 cplexConfig.customerIdentifier === "externalCustomerId" ? "External Customer ID (รหัส CPLEX)" :
                 cplexConfig.customerIdentifier === "phone" ? "เบอร์โทรศัพท์ (Phone)" :
                 cplexConfig.customerIdentifier === "email" ? "อีเมล (Email)" :
                 "Customer ID (CRM ID)"}
              </div>
              <div className="text-[11px] text-slate-500 pt-1">
                จับคู่ข้อมูลพอร์ตลูกค้ากับระบบหลังบ้าน CPLEX
              </div>
            </div>

            {/* 3. Sync Status & Last Activity */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 text-xs">
              <span className="text-slate-400 font-bold text-[10px] uppercase tracking-wider block">
                สถานะการ Sync ล่าสุด
              </span>
              <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>{cplexConfig.lastSyncedAt || "ยังไม่มีประวัติการ Sync"}</span>
              </div>
              {cplexSyncResult && (
                <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-600">
                  <span className="text-emerald-700 font-bold">นำเข้า {cplexSyncResult.recordsImported}</span>
                  <span>•</span>
                  <span className="text-blue-700 font-bold">อัปเดต {cplexSyncResult.recordsUpdated}</span>
                  {cplexSyncResult.recordsFailed > 0 && (
                    <>
                      <span>•</span>
                      <span className="text-rose-700 font-bold">ไม่สำเร็จ {cplexSyncResult.recordsFailed}</span>
                    </>
                  )}
                </div>
              )}
            </div>

          </div>

          {/* ========================================================= */}
          {/* Data Mapping Section (📊 ข้อมูลที่ต้องการเชื่อมต่อ) */}
          {/* ========================================================= */}
          <div className="border border-slate-200/80 rounded-xl bg-slate-50/50 overflow-hidden" id="cplex-data-mapping-section">
            
            {/* Collapsible Header */}
            <button
              type="button"
              onClick={() => setIsDataMappingExpanded(!isDataMappingExpanded)}
              className="w-full px-4 py-3 bg-slate-100/80 hover:bg-slate-100 flex items-center justify-between transition-colors text-left cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-indigo-100 text-indigo-700 rounded-lg">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800">
                      📊 ข้อมูลที่ต้องการเชื่อมต่อ (Data Mapping & Integration Fields)
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {((cplexConfig.dataMapping || DEFAULT_CPLEX_DATA_MAPPINGS).filter(m => m.isEnabled)).length} / {(cplexConfig.dataMapping || DEFAULT_CPLEX_DATA_MAPPINGS).length} ฟิลด์เปิดใช้งาน
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    เลือกและตรวจสอบฟิลด์ข้อมูลที่ต้องการเชื่อมโยงระหว่าง CRM และระบบภายนอก (CPLEX) จัดกลุ่มเป็น 3 หมวดหมู่หลัก
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-slate-400">
                <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">
                  {isDataMappingExpanded ? "ย่อส่วนนี้" : "ขยายดูรายละเอียด"}
                </span>
                {isDataMappingExpanded ? (
                  <ChevronUp className="w-4 h-4 text-slate-600" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-600" />
                )}
              </div>
            </button>

            {/* Collapsible Content */}
            <AnimatePresence>
              {isDataMappingExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="p-4 space-y-5 border-t border-slate-200/80 bg-white"
                >
                  
                  {/* Info Notice */}
                  <div className="p-3 bg-indigo-50/60 border border-indigo-100 rounded-xl text-xs text-indigo-900 flex items-start gap-2.5">
                    <HelpCircle className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                    <div className="space-y-0.5 leading-relaxed">
                      <span className="font-bold text-indigo-950">โครงสร้างเตรียมพร้อมสำหรับเชื่อมต่อ API ภายนอก:</span>
                      <p className="text-[11px] text-indigo-800">
                        ท่านสามารถเลือกเปิด-ปิดฟิลด์ข้อมูลที่ต้องการดึงหรือส่งต่อระหว่างระบบ CRM และระบบภายนอกได้ทันที โดยสถานะเริ่มต้นของฟิลด์ API จะแสดงเป็น <span className="font-mono font-bold text-indigo-950 bg-indigo-100/80 px-1.5 py-0.5 rounded border border-indigo-200">"รอกำหนด API Field"</span> เพื่อความพร้อมเมื่อเชื่อมต่อ API ในอนาคต
                      </p>
                    </div>
                  </div>

                  {/* 3 Categories Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    
                    {/* Category 1: Customer Info (ข้อมูลลูกค้า) */}
                    {(() => {
                      const items = (cplexConfig.dataMapping || DEFAULT_CPLEX_DATA_MAPPINGS).filter(i => i.category === "customer");
                      const allEnabled = items.every(i => i.isEnabled);
                      return (
                        <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-3.5 space-y-3 flex flex-col justify-between">
                          <div className="space-y-2.5">
                            {/* Group Header */}
                            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                              <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                <h4 className="text-xs font-bold text-slate-800">
                                  1. ข้อมูลลูกค้า (Customer Info)
                                </h4>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleToggleAllCategory("customer", !allEnabled)}
                                className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                              >
                                {allEnabled ? "ปิดทั้งหมด" : "เปิดทั้งหมด"}
                              </button>
                            </div>

                            {/* Mapping Items List */}
                            <div className="space-y-2">
                              {items.map((item) => (
                                <div
                                  key={item.id}
                                  className={`p-2.5 rounded-lg border transition-all ${
                                    item.isEnabled
                                      ? "bg-white border-slate-200 shadow-2xs"
                                      : "bg-slate-100/60 border-slate-200/60 opacity-60"
                                  }`}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <label className="flex items-start gap-2 cursor-pointer select-none">
                                      <input
                                        type="checkbox"
                                        checked={item.isEnabled}
                                        onChange={() => handleToggleMappingItem(item.id)}
                                        className="mt-0.5 w-3.5 h-3.5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                                      />
                                      <div>
                                        <div className="text-xs font-bold text-slate-800 leading-tight">
                                          {item.crmFieldLabel}
                                        </div>
                                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                          CRM: <span className="text-slate-600 font-medium">{item.crmFieldKey}</span>
                                        </div>
                                      </div>
                                    </label>

                                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200/80 font-medium whitespace-nowrap">
                                      {item.externalApiField || item.statusLabel || "รอกำหนด API Field"}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="pt-2 text-[10px] text-slate-400 text-right">
                            {items.filter(i => i.isEnabled).length} จาก {items.length} รายการเปิดใช้
                          </div>
                        </div>
                      );
                    })()}

                    {/* Category 2: Sales Info (ข้อมูลยอดขาย) */}
                    {(() => {
                      const items = (cplexConfig.dataMapping || DEFAULT_CPLEX_DATA_MAPPINGS).filter(i => i.category === "sales");
                      const allEnabled = items.every(i => i.isEnabled);
                      return (
                        <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-3.5 space-y-3 flex flex-col justify-between">
                          <div className="space-y-2.5">
                            {/* Group Header */}
                            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                              <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                <h4 className="text-xs font-bold text-slate-800">
                                  2. ข้อมูลยอดขาย (Sales Info)
                                </h4>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleToggleAllCategory("sales", !allEnabled)}
                                className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                              >
                                {allEnabled ? "ปิดทั้งหมด" : "เปิดทั้งหมด"}
                              </button>
                            </div>

                            {/* Mapping Items List */}
                            <div className="space-y-2">
                              {items.map((item) => (
                                <div
                                  key={item.id}
                                  className={`p-2.5 rounded-lg border transition-all ${
                                    item.isEnabled
                                      ? "bg-white border-slate-200 shadow-2xs"
                                      : "bg-slate-100/60 border-slate-200/60 opacity-60"
                                  }`}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <label className="flex items-start gap-2 cursor-pointer select-none">
                                      <input
                                        type="checkbox"
                                        checked={item.isEnabled}
                                        onChange={() => handleToggleMappingItem(item.id)}
                                        className="mt-0.5 w-3.5 h-3.5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                                      />
                                      <div>
                                        <div className="text-xs font-bold text-slate-800 leading-tight">
                                          {item.crmFieldLabel}
                                        </div>
                                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                          CRM: <span className="text-slate-600 font-medium">{item.crmFieldKey}</span>
                                        </div>
                                      </div>
                                    </label>

                                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200/80 font-medium whitespace-nowrap">
                                      {item.externalApiField || item.statusLabel || "รอกำหนด API Field"}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="pt-2 text-[10px] text-slate-400 text-right">
                            {items.filter(i => i.isEnabled).length} จาก {items.length} รายการเปิดใช้
                          </div>
                        </div>
                      );
                    })()}

                    {/* Category 3: Shipping Info (ข้อมูลการจัดส่ง) */}
                    {(() => {
                      const items = (cplexConfig.dataMapping || DEFAULT_CPLEX_DATA_MAPPINGS).filter(i => i.category === "shipping");
                      const allEnabled = items.every(i => i.isEnabled);
                      return (
                        <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-3.5 space-y-3 flex flex-col justify-between">
                          <div className="space-y-2.5">
                            {/* Group Header */}
                            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                              <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                                <h4 className="text-xs font-bold text-slate-800">
                                  3. ข้อมูลการจัดส่ง (Shipping Info)
                                </h4>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleToggleAllCategory("shipping", !allEnabled)}
                                className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                              >
                                {allEnabled ? "ปิดทั้งหมด" : "เปิดทั้งหมด"}
                              </button>
                            </div>

                            {/* Mapping Items List */}
                            <div className="space-y-2">
                              {items.map((item) => (
                                <div
                                  key={item.id}
                                  className={`p-2.5 rounded-lg border transition-all ${
                                    item.isEnabled
                                      ? "bg-white border-slate-200 shadow-2xs"
                                      : "bg-slate-100/60 border-slate-200/60 opacity-60"
                                  }`}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <label className="flex items-start gap-2 cursor-pointer select-none">
                                      <input
                                        type="checkbox"
                                        checked={item.isEnabled}
                                        onChange={() => handleToggleMappingItem(item.id)}
                                        className="mt-0.5 w-3.5 h-3.5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                                      />
                                      <div>
                                        <div className="text-xs font-bold text-slate-800 leading-tight">
                                          {item.crmFieldLabel}
                                        </div>
                                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                          CRM: <span className="text-slate-600 font-medium">{item.crmFieldKey}</span>
                                        </div>
                                      </div>
                                    </label>

                                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200/80 font-medium whitespace-nowrap">
                                      {item.externalApiField || item.statusLabel || "รอกำหนด API Field"}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="pt-2 text-[10px] text-slate-400 text-right">
                            {items.filter(i => i.isEnabled).length} จาก {items.length} รายการเปิดใช้
                          </div>
                        </div>
                      );
                    })()}

                  </div>

                </motion.div>
              )}
            </AnimatePresence>

          </div>

        </div>

        {/* 1. Excel Export Center (2/3 cols) */}
        <div id="settings-excel-export-card" className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs lg:col-span-2 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-slate-800 font-bold text-sm">ส่งออกข้อมูลเป็น Excel (Export Leads to Excel .xlsx)</h3>
                <p className="text-[10px] text-slate-400">
                  ดาวน์โหลดข้อมูลลูกค้าทั้งหมด พร้อม Tags, การ Follow-up, ประวัติการโทร, ข้อมูลเอกสาร และรหัสลูกค้า
                </p>
              </div>
            </div>

            <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-bold font-mono">
              พร้อมส่งออก {exportTargetLeads.length} / {leadsCount} ราย
            </span>
          </div>

          {exportSuccessMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-bold flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{exportSuccessMsg}</span>
            </div>
          )}

          {/* Export Filter Controls */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 text-xs">
            <span className="text-slate-500 font-bold block uppercase tracking-wider text-[10px]">
              ตัวกรองข้อมูลสำหรับส่งออก (Export Filters):
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-slate-600 font-semibold block text-[11px] mb-1">สถานะ Pipeline</label>
                <select
                  value={exportStatus}
                  onChange={(e) => setExportStatus(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="all">ทุกสถานะ ({leads.length} ราย)</option>
                  {Object.entries(StatusLabels).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-600 font-semibold block text-[11px] mb-1">เซลส์ผู้รับผิดชอบ</label>
                <select
                  value={exportSalesperson}
                  onChange={(e) => setExportSalesperson(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="all">ทุกคนในทีม</option>
                  {salespersons.map(sp => (
                    <option key={sp} value={sp}>{sp}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-600 font-semibold block text-[11px] mb-1">กรองตาม Tag</label>
                <select
                  value={exportTag}
                  onChange={(e) => setExportTag(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="all">ทุก Tag</option>
                  {allExistingTags.map(tag => (
                    <option key={tag} value={tag}>{tag}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Export Action Strip */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
            <div className="text-xs text-slate-500">
              ไฟล์ Excel (.xlsx) รองรับภาษาไทยสมบูรณ์ สามารถเปิดด้วย Microsoft Excel, Numbers หรือ Google Sheets ได้ทันที
            </div>

            <button
              id="export-excel-leads-btn"
              type="button"
              onClick={handlePerformExcelExport}
              disabled={exportTargetLeads.length === 0}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition-all shadow-xs cursor-pointer shrink-0"
            >
              <Download className="w-4 h-4" />
              <span>ดาวน์โหลดไฟล์ Excel ({exportTargetLeads.length} รายการ)</span>
            </button>
          </div>
        </div>

        {/* 2. System Status (1/3 col) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
            <h3 className="text-slate-800 font-bold text-sm">สถานะระบบ (System Info)</h3>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center p-2.5 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-500">ฐานข้อมูล (Database)</span>
              <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Cloud Firestore (Online)
              </span>
            </div>

            <div className="flex justify-between items-center p-2.5 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-500">จำนวน Lead ในระบบ</span>
              <span className="font-mono font-bold text-slate-800">{leadsCount} ราย</span>
            </div>

            <div className="flex justify-between items-center p-2.5 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-500">พนักงานขาย</span>
              <span className="font-bold text-slate-800">{salespersons.length} คน</span>
            </div>

            <div className="flex justify-between items-center p-2.5 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-500">โซนเวลา (Timezone)</span>
              <span className="font-bold text-slate-800">Asia/Bangkok (GMT+7)</span>
            </div>
          </div>
        </div>

        {/* 3. Account Profile Card (2/3 cols) */}
        <div id="settings-profile-card" className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs lg:col-span-2 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                <Sliders className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-slate-800 font-bold text-sm">แก้ไขข้อมูลโปรไฟล์พนักงานขาย (Edit Your Profile)</h3>
                <p className="text-[10px] text-slate-400">แก้ไขหรืออัปเดตชื่อผู้ใช้งานของคุณ ระบบจะเชื่อมโยงรายชื่อผู้รับผิดชอบดีลและโน้ตให้อัตโนมัติ</p>
              </div>
            </div>
            <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${isJackSuperAdmin ? "bg-amber-100 text-amber-800 border border-amber-200" : isPhereManager ? "bg-blue-100 text-blue-800 border border-blue-200" : "bg-slate-100 text-slate-700 border border-slate-200"}`}>
              {isJackSuperAdmin
                ? "👑 Super Admin (ผู้ดูแลระบบสูงสุด)"
                : isPhereManager
                ? "👑 ผู้จัดการ (Manager)"
                : "เซลส์พนักงานขาย (Sales)"}
            </div>
          </div>

          {selfRenameMessage && (
            <div id="self-rename-msg-banner" className="p-2.5 px-4 bg-slate-100 border border-slate-200 text-slate-800 rounded-lg text-xs font-semibold">
              {selfRenameMessage}
            </div>
          )}

          <form onSubmit={handleSelfRenameSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="sm:col-span-2 space-y-1">
                <label className="text-slate-500 font-bold block">ชื่อพนักงานขายปัจจุบันของคุณ</label>
                <input
                  id="settings-profile-name-input"
                  type="text"
                  required
                  value={selfNameInput}
                  onChange={(e) => setSelfNameInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-700 font-bold"
                  placeholder="ชื่อจริงของคุณ หรือ ชื่อเล่นพนักงานขาย"
                />
              </div>
              <div className="flex items-end">
                <button
                  id="settings-profile-save-btn"
                  type="submit"
                  disabled={selfNameInput.trim() === currentUser}
                  className={`w-full py-2.5 rounded-xl text-white font-bold text-xs transition-colors cursor-pointer ${selfNameInput.trim() === currentUser ? "bg-slate-300 cursor-not-allowed text-slate-500" : "bg-blue-600 hover:bg-blue-500"}`}
                >
                  บันทึกการเปลี่ยนแปลง
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* 4. Change Password Card (2/3 cols) */}
        <div id="settings-password-card" className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs lg:col-span-2 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                <KeyRound className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-slate-800 font-bold text-sm">เปลี่ยนรหัสผ่านส่วนตัว (Change Your Password)</h3>
                <p className="text-[10px] text-slate-400">กำหนดรหัสผ่านเข้าใช้งานของคุณ ({currentUser || "เซลส์"}) เพื่อความปลอดภัยของข้อมูลลูกค้า</p>
              </div>
            </div>
            <div className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
              🔐 รหัสผ่านส่วนตัว
            </div>
          </div>

          {passMsg && (
            <div className={`p-3 rounded-xl text-xs font-bold border ${passMsg.isError ? "bg-rose-50 text-rose-800 border-rose-200" : "bg-emerald-50 text-emerald-800 border-emerald-200"}`}>
              {passMsg.text}
            </div>
          )}

          <form onSubmit={handleUpdatePasswordSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="space-y-1">
                <label className="text-slate-500 font-bold block">รหัสผ่านปัจจุบัน</label>
                <input
                  type="password"
                  required
                  value={currentPassInput}
                  onChange={(e) => setCurrentPassInput(e.target.value)}
                  placeholder="รหัสเดิม (ค่าเริ่มต้น 1234)"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-slate-700 font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-500 font-bold block">รหัสผ่านใหม่</label>
                <input
                  type="password"
                  required
                  value={newPassInput}
                  onChange={(e) => setNewPassInput(e.target.value)}
                  placeholder="รหัสผ่านใหม่ (อย่างน้อย 4 ตัว)"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-slate-700 font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-500 font-bold block">ยืนยันรหัสผ่านใหม่</label>
                <input
                  type="password"
                  required
                  value={confirmPassInput}
                  onChange={(e) => setConfirmPassInput(e.target.value)}
                  placeholder="พิมพ์รหัสใหม่อีกครั้ง"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-slate-700 font-bold"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isUpdatingPass || !currentPassInput || !newPassInput || !confirmPassInput}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                {isUpdatingPass ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>กำลังบันทึก...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    <span>อัปเดตรหัสผ่าน</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* 5. Salesperson Management Card (2/3 cols) */}
        <div id="settings-salespersons-card" className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs lg:col-span-2 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-blue-600" />
              <div>
                <h3 className="text-slate-800 font-bold text-sm">จัดการพนักงานขาย / เซลส์ (Salesperson Management)</h3>
                <p className="text-[10px] text-slate-400">เพิ่ม ลบ รายชื่อพนักงานขายในระบบเพื่อใช้กำหนดสิทธิ์ดูแลใน Pipeline</p>
              </div>
            </div>
            {!isSuperAdmin && (
              <span className="px-2.5 py-1 bg-red-50 text-red-700 border border-red-100 rounded-full text-[10px] font-bold">
                🔒 สิทธิ์จำกัดเฉพาะ Manager & SuperAdmin
              </span>
            )}
          </div>

          {salespersonMessage && (
            <div id="salesperson-msg-banner" className="p-2.5 px-4 bg-blue-50 border border-blue-100 text-blue-800 rounded-xl text-xs font-semibold flex items-center gap-2">
              <span className="block">{salespersonMessage}</span>
            </div>
          )}

          {isSuperAdmin ? (
            <form onSubmit={handleAddSalesperson} className="flex gap-2.5">
              <input 
                id="settings-salesperson-add-input"
                type="text"
                required
                placeholder="กรอกชื่อเซลส์คนใหม่ เช่น Nalin, Beer..."
                value={newSalespersonName}
                onChange={(e) => setNewSalespersonName(e.target.value)}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-700"
              />
              <button 
                id="settings-salesperson-add-submit"
                type="submit"
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>เพิ่มรายชื่อ</span>
              </button>
            </form>
          ) : (
            <div className="p-3 bg-amber-50/50 border border-amber-100 text-amber-800 rounded-xl text-xs leading-relaxed">
              ⚠️ เฉพาะผู้จัดการและ SuperAdmin (<strong>Phere</strong>, <strong>Jack</strong>) เท่านั้นที่มีสิทธิ์เพิ่มรายชื่อพนักงานขายในระบบได้
            </div>
          )}

          <div className="space-y-2">
            <label className="text-slate-500 font-bold text-xs block">รายชื่อเซลส์ปัจจุบัน ({salespersons.length} คน)</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" id="settings-salesperson-list">
              {salespersons.map((sp) => {
                const isEditing = editingSp === sp;
                return (
                  <div 
                    key={sp} 
                    className={`flex items-center justify-between p-3 rounded-xl text-xs transition-all ${isEditing ? "bg-blue-50/70 border border-blue-200" : "bg-slate-50 border border-slate-100"}`}
                  >
                    {isEditing ? (
                      <div className="flex items-center gap-1.5 flex-1 mr-2">
                        <input
                          type="text"
                          value={editingNameInput}
                          onChange={(e) => setEditingNameInput(e.target.value)}
                          className="flex-1 bg-white border border-blue-300 rounded px-2 py-1 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveRename(sp);
                            if (e.key === "Escape") setEditingSp(null);
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveRename(sp)}
                          className="p-1 bg-blue-600 text-white rounded hover:bg-blue-500 transition-colors cursor-pointer"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingSp(null)}
                          className="p-1 bg-slate-200 text-slate-600 rounded hover:bg-slate-300 transition-colors cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-500" />
                        <span className="font-bold text-slate-800">{sp}</span>
                        {sp === managerName && (
                          <span className="text-[9px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold">
                            Manager
                          </span>
                        )}
                        {sp === currentUser && (
                          <span className="text-[9px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-bold">
                            (คุณ)
                          </span>
                        )}
                      </div>
                    )}

                    {!isEditing && isSuperAdmin && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingSp(sp);
                            setEditingNameInput(sp);
                          }}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title={`แก้ไขชื่อ ${sp}`}
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        {sp !== managerName && (
                          <button
                            type="button"
                            onClick={() => handleDeleteSalesperson(sp)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title={`ลบ ${sp}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 6. Campaign Management Card (2/3 cols) */}
        <div id="settings-campaigns-card" className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs lg:col-span-2 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                <Megaphone className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-slate-800 font-bold text-sm">จัดการแคมเปญการตลาด (Marketing Campaigns)</h3>
                <p className="text-[10px] text-slate-400">เพิ่มหรือลบชื่อแคมเปญที่ทีมใช้ระบุที่มาของลูกค้า</p>
              </div>
            </div>
          </div>

          {campaignMessage && (
            <div className="p-2.5 px-4 bg-purple-50 border border-purple-100 text-purple-800 rounded-xl text-xs font-semibold">
              {campaignMessage}
            </div>
          )}

          <form onSubmit={handleAddNewCampaign} className="flex gap-2.5">
            <input 
              type="text"
              placeholder="กรอกชื่อแคมเปญใหม่ เช่น แคมเปญ 9.9 Super Sale..."
              value={newCampaignInput}
              onChange={(e) => setNewCampaignInput(e.target.value)}
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white text-slate-700"
            />
            <button 
              type="submit"
              disabled={!newCampaignInput.trim()}
              className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>เพิ่มแคมเปญ</span>
            </button>
          </form>

          <div className="space-y-2">
            <label className="text-slate-500 font-bold text-xs block">รายการแคมเปญในระบบ ({campaigns.length} แคมเปญ)</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {campaigns.map((camp) => (
                <div 
                  key={camp} 
                  className="flex items-center justify-between p-3 rounded-xl text-xs bg-slate-50 border border-slate-100"
                >
                  <span className="font-semibold text-slate-800">{camp}</span>
                  <button
                    type="button"
                    onClick={() => handleDeleteCampaignItem(camp)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    title={`ลบแคมเปญ ${camp}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 7. System Version & Updates Card */}
        <div id="settings-system-version-card" className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs lg:col-span-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center font-bold">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-slate-800 font-bold text-sm">การอัปเดตระบบ (System Version & Updates)</h3>
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[10px] font-bold">
                  Online Live
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                ระบบเชื่อมต่อแบบเรียลไทม์ และจะแจ้งเตือนป๊อปอัปด้านล่างทันทีเมื่อมีเวอร์ชันใหม่พร้อมให้กด "อัปเดตเลย"
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              id="check-system-update-btn"
              onClick={() => {
                window.dispatchEvent(new CustomEvent("crm:system-update-available", {
                  detail: { reason: "ตรวจสอบพบแพตช์ระบบล่าสุด พร้อมใช้งานทันที" }
                }));
              }}
              className="px-4 py-2 bg-slate-900 hover:bg-blue-600 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>ตรวจสอบและจำลองการอัปเดต</span>
            </button>
          </div>
        </div>

      </div>

      {/* CPLEX Connection & Configuration Modal */}
      <CPLEXConnectionModal
        isOpen={showCplexModal}
        onClose={() => setShowCplexModal(false)}
        onConfigSaved={(cfg) => setCplexConfig(cfg)}
      />

      {/* CPLEX API Logs & Debugging Modal */}
      <CPLEXLogsModal
        isOpen={showCplexLogsModal}
        onClose={() => setShowCplexLogsModal(false)}
      />

    </div>
  );
}
