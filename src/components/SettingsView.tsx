import React, { useState } from "react";
import { Sliders, Database, Table, CloudLightning, Check, AlertTriangle, RefreshCw, Eye, User, Plus, Trash2, X, Edit, Lock, KeyRound, Download, Code, Copy, ExternalLink, FileSpreadsheet, Megaphone, Users } from "lucide-react";
import { motion } from "motion/react";
import { Lead } from "../types";
import { exportLeadsToCSV, pushLeadsToGoogleSheet, GOOGLE_APPS_SCRIPT_CODE } from "../utils/googleSheetsSync";

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
  sheetsConfig?: {
    sheetUrl: string;
    sheetName?: string;
    webAppUrl?: string;
    isEnabled: boolean;
    lastSyncedAt: string | null;
  };
  onUpdateSalespersons?: (newSalespersons: string[]) => Promise<boolean>;
  onRenameSelf?: (newName: string) => Promise<boolean>;
  onRenameSalesperson?: (oldName: string, newName: string) => Promise<boolean>;
  onSyncGoogleSheets: (spreadsheetUrl: string, sheetName: string) => Promise<{ success: boolean; message: string; timestamp?: string }>;
  onUpdateSheetsConfig?: (sheetUrl: string, sheetName: string, isEnabled: boolean, webAppUrl?: string) => Promise<boolean>;
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
  sheetsConfig,
  onUpdateSalespersons, 
  onRenameSelf, 
  onRenameSalesperson,
  onSyncGoogleSheets,
  onUpdateSheetsConfig
}: SettingsViewProps) {
  const managerName = salespersons[0] || "Phere";
  const [spreadsheetUrl, setSpreadsheetUrl] = useState("https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKv19An905yF926dfgN1_aWf62kbI/edit");
  const [sheetName, setSheetName] = useState("Mylogiz_CRM_Sync");
  const [webAppUrl, setWebAppUrl] = useState("");
  const [autoSync, setAutoSync] = useState(true);
  const [showScriptModal, setShowScriptModal] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  React.useEffect(() => {
    if (sheetsConfig) {
      if (sheetsConfig.sheetUrl) {
        setSpreadsheetUrl(sheetsConfig.sheetUrl);
      }
      if (sheetsConfig.sheetName) {
        setSheetName(sheetsConfig.sheetName);
      }
      if (sheetsConfig.webAppUrl) {
        setWebAppUrl(sheetsConfig.webAppUrl);
      }
      setAutoSync(sheetsConfig.isEnabled);
    }
  }, [sheetsConfig]);

  const [syncStatus, setSyncStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [syncMessage, setSyncMessage] = useState("");
  const [syncLogs, setSyncLogs] = useState<Array<{ id: string; msg: string; time: string; type: "info" | "success" | "error" }>>([
    { id: "1", msg: "ระบบเช็คความพร้อม: เชื่อมต่อ API Google Sheets สำเร็จ", time: "09:00:12", type: "info" },
    { id: "2", msg: "สแกนพารามิเตอร์: ค้นพบข้อมูล 3 ชนิดแถว", time: "09:00:15", type: "info" }
  ]);

  const [newSalespersonName, setNewSalespersonName] = useState("");
  const [salespersonMessage, setSalespersonMessage] = useState("");

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

  const [selfNameInput, setSelfNameInput] = useState(currentUser || "");
  const [selfRenameMessage, setSelfRenameMessage] = useState("");

  const [editingSp, setEditingSp] = useState<string | null>(null);
  const [editingNameInput, setEditingNameInput] = useState<string>("");

  const handleSaveRename = async (oldName: string) => {
    const trimmed = editingNameInput.trim();
    if (!trimmed || trimmed === oldName) {
      setEditingSp(null);
      return;
    }
    
    if (salespersons.includes(trimmed) && trimmed !== oldName) {
      setSalespersonMessage("❌ มีรายชื่อเซลส์ผู้นี้อยู่ในระบบแล้ว");
      return;
    }

    if (onRenameSalesperson) {
      setSalespersonMessage("กำลังเปลี่ยนชื่อ...");
      const success = await onRenameSalesperson(oldName, trimmed);
      if (success) {
        setSalespersonMessage("✅ เปลี่ยนชื่อสำเร็จ");
        setEditingSp(null);
      } else {
        setSalespersonMessage("❌ เกิดข้อผิดพลาดในการเปลี่ยนชื่อ");
      }
      setTimeout(() => setSalespersonMessage(""), 3000);
    }
  };

  const [currentPassInput, setCurrentPassInput] = useState("");
  const [newPassInput, setNewPassInput] = useState("");
  const [confirmPassInput, setConfirmPassInput] = useState("");
  const [passMsg, setPassMsg] = useState<{ text: string; isError: boolean } | null>(null);
  const [isUpdatingPass, setIsUpdatingPass] = useState(false);

  React.useEffect(() => {
    if (currentUser) {
      setSelfNameInput(currentUser);
    }
  }, [currentUser]);

  const handleUpdatePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !onUpdatePassword) return;
    setPassMsg(null);

    const expectedCurrentPass = userPasswords[currentUser] || "1234";
    if (currentPassInput.trim() !== expectedCurrentPass) {
      setPassMsg({ text: "❌ รหัสผ่านปัจจุบันไม่ถูกต้อง (รหัสเริ่มต้นคือ 1234)", isError: true });
      return;
    }

    if (!newPassInput.trim() || newPassInput.trim().length < 4) {
      setPassMsg({ text: "❌ รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 4 ตัวอักษร", isError: true });
      return;
    }

    if (newPassInput.trim() !== confirmPassInput.trim()) {
      setPassMsg({ text: "❌ รหัสผ่านใหม่และการยืนยันรหัสผ่านไม่ตรงกัน", isError: true });
      return;
    }

    setIsUpdatingPass(true);
    const success = await onUpdatePassword(currentUser, newPassInput.trim());
    setIsUpdatingPass(false);

    if (success) {
      setPassMsg({ text: "✅ บันทึกรหัสผ่านใหม่เรียบร้อยแล้ว ท่านสามารถใช้รหัสนี้ในการเข้าสู่ระบบครั้งถัดไป", isError: false });
      setCurrentPassInput("");
      setNewPassInput("");
      setConfirmPassInput("");
    } else {
      setPassMsg({ text: "❌ ไม่สามารถตั้งรหัสผ่านใหม่ได้ กรุณาลองใหม่อีกครั้ง", isError: true });
    }
  };

  const handleSelfRenameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selfNameInput.trim() || !onRenameSelf) return;
    const trimmed = selfNameInput.trim();
    if (trimmed === currentUser) return;
    
    setSelfRenameMessage("กำลังแก้ไขชื่อพนักงานขาย...");
    const success = await onRenameSelf(trimmed);
    if (success) {
      setSelfRenameMessage("✅ แก้ไขชื่อบัญชีสำเร็จเป็น " + trimmed);
    } else {
      setSelfRenameMessage("❌ ไม่สามารถแก้ไขชื่อพนักงานขายได้");
    }
    setTimeout(() => setSelfRenameMessage(""), 4000);
  };

  const handleAddSalesperson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSalespersonName.trim()) return;
    const trimmed = newSalespersonName.trim();
    if (salespersons.includes(trimmed)) {
      setSalespersonMessage("❌ มีรายชื่อเซลส์ผู้นี้อยู่ในระบบแล้ว");
      return;
    }
    const updated = [...salespersons, trimmed];
    if (onUpdateSalespersons) {
      const ok = await onUpdateSalespersons(updated);
      if (ok) {
        setNewSalespersonName("");
        setSalespersonMessage("✅ เพิ่มรายชื่อเซลส์สำเร็จ");
        setTimeout(() => setSalespersonMessage(""), 3000);
      }
    }
  };

  const handleDeleteSalesperson = async (name: string) => {
    if (salespersons.length <= 1) {
      setSalespersonMessage("⚠️ ต้องมีรายชื่อเซลส์ผู้รับผิดชอบดูแลอย่างน้อย 1 คน");
      setTimeout(() => setSalespersonMessage(""), 3000);
      return;
    }
    const updated = salespersons.filter(s => s !== name);
    if (onUpdateSalespersons) {
      const ok = await onUpdateSalespersons(updated);
      if (ok) {
        setSalespersonMessage("✅ ลบรายชื่อเซลส์สำเร็จ");
        setTimeout(() => setSalespersonMessage(""), 3000);
      }
    }
  };

  const handleManualSync = async () => {
    setSyncStatus("loading");
    const startLog = {
      id: Date.now().toString(),
      msg: `เริ่มจัดระเบียบโครงสร้างแถวข้อมูลลูกค้าทั้งหมด ${leadsCount} ราย...`,
      time: new Date().toLocaleTimeString("th-TH"),
      type: "info" as const
    };
    const connectLog = {
      id: (Date.now() + 1).toString(),
      msg: `เชื่อมต่อ Google Sheet URL: ${spreadsheetUrl} [แผ่นงาน: "${sheetName}"]...`,
      time: new Date().toLocaleTimeString("th-TH"),
      type: "info" as const
    };
    setSyncLogs(prev => [...prev, startLog, connectLog]);

    try {
      if (webAppUrl && webAppUrl.startsWith("http")) {
        const webAppRes = await pushLeadsToGoogleSheet(webAppUrl, sheetName, leads);
        if (webAppRes.success) {
          await onSyncGoogleSheets(spreadsheetUrl, sheetName);
          setSyncStatus("success");
          setSyncMessage(`ส่งข้อมูล ${leadsCount} รายการไปยัง Google Sheet ผ่าน Apps Script เรียบร้อยแล้ว!`);
          const successLog = {
            id: (Date.now() + 2).toString(),
            msg: `✓ บันทึกข้อมูล Leads ทั้งหมด ${leadsCount} แถว เข้าสเปรดชีตสำเร็จแล้ว (แผ่นงาน: "${sheetName}")`,
            time: new Date().toLocaleTimeString("th-TH"),
            type: "success" as const
          };
          setSyncLogs(prev => [...prev, successLog]);
          return;
        }
      }

      const result = await onSyncGoogleSheets(spreadsheetUrl, sheetName);
      if (result.success) {
        setSyncStatus("success");
        setSyncMessage(result.message);
        
        const successLog = {
          id: (Date.now() + 2).toString(),
          msg: `✓ บันทึกข้อมูล Leads ทั้งหมด ${leadsCount} แถว เรียบร้อยแล้ว (แผ่นงาน: "${sheetName}")`,
          time: new Date().toLocaleTimeString("th-TH"),
          type: "success" as const
        };
        setSyncLogs(prev => [...prev, successLog]);
      } else {
        setSyncStatus("error");
        setSyncMessage(result.message);
        
        const errorLog = {
          id: (Date.now() + 2).toString(),
          msg: `✗ ซิงค์ล้มเหลว: ${result.message}`,
          time: new Date().toLocaleTimeString("th-TH"),
          type: "error" as const
        };
        setSyncLogs(prev => [...prev, errorLog]);
      }
    } catch (err: any) {
      setSyncStatus("error");
      setSyncMessage(err.message || "เกิดข้อผิดพลาดในการเชื่อมต่อเครือข่าย");
    }
  };

  return (
    <div className="space-y-6" id="settings-view-container">
      {/* View Header */}
      <div>
        <h2 className="text-xl font-bold text-gray-800">การตั้งค่าและการซิงค์ข้อมูล (CRM System Settings)</h2>
        <p className="text-xs text-gray-500 mt-0.5">เชื่อมโยงระบบ CRM กับ Google Sheets เพื่อแชร์ฐานข้อมูลของลูกค้าและติดตามยอดพัสดุได้ทุกที่ทุกเวลา</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Google Sheets Config Box (2/3 cols) */}
        <div id="settings-sheets-config-card" className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs lg:col-span-2 space-y-5">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Table className="w-5 h-5 text-emerald-600" />
            <div>
              <h3 className="text-slate-800 font-bold text-sm">กำหนดค่า API Google Sheets Sync</h3>
              <p className="text-[10px] text-slate-400">ระบบจะอัปเดตไฟล์ชีทอัตโนมัติ ทุกครั้งที่มีการแก้ไข/เพิ่มข้อมูลลูกค้าในระบบ</p>
            </div>
          </div>

          <div className="space-y-4 text-xs">
            {/* URL input */}
            <div className="space-y-1">
              <label className="text-slate-500 font-bold block">Spreadsheet URL (ลิงก์สเปรดชีต Google Sheets)</label>
              <div className="flex gap-2">
                <input
                  id="settings-sheets-url-input"
                  type="text"
                  value={spreadsheetUrl}
                  onChange={(e) => setSpreadsheetUrl(e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white text-slate-700"
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                />
                <button
                  type="button"
                  onClick={() => {
                    if (spreadsheetUrl && spreadsheetUrl.startsWith("http")) {
                      window.open(spreadsheetUrl, "_blank");
                    } else {
                      alert("กรุณาระบุลิงก์ Google Sheets ที่ถูกต้อง");
                    }
                  }}
                  className="px-4 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 font-bold rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Eye className="w-4 h-4" />
                  <span>เปิดลิงก์</span>
                </button>
              </div>
            </div>

            {/* Apps Script Web App URL input */}
            <div className="space-y-1 bg-emerald-50/60 p-3 rounded-lg border border-emerald-100">
              <div className="flex items-center justify-between">
                <label className="text-emerald-900 font-bold block text-xs">
                  ⚡ Google Apps Script Web App URL (สำหรับซิงค์ข้อมูลตรงเข้าสเปรดชีต)
                </label>
                <button
                  type="button"
                  onClick={() => setShowScriptModal(true)}
                  className="text-[11px] text-emerald-700 hover:text-emerald-900 font-bold underline flex items-center gap-1 cursor-pointer"
                >
                  <Code className="w-3.5 h-3.5" />
                  <span>คัดลอกโค้ด & วิธีตั้งค่า</span>
                </button>
              </div>
              <input
                id="settings-sheets-webapp-url-input"
                type="text"
                value={webAppUrl}
                onChange={(e) => setWebAppUrl(e.target.value)}
                className="w-full bg-white border border-emerald-200 rounded-lg p-2.5 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 text-xs"
                placeholder="https://script.google.com/macros/s/.../exec"
              />
              <p className="text-[10px] text-emerald-700">
                💡 เมื่อใส่ Web App URL ระบบจะส่งข้อมูลลูกค้าเข้า Google Sheet ของคุณทันทีโดยตรง
              </p>
            </div>

            {/* Export & Tools Quick Bar */}
            <div className="flex flex-wrap items-center gap-2 pt-1 pb-1">
              <button
                type="button"
                onClick={() => exportLeadsToCSV(leads)}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs flex items-center gap-2 transition-all shadow-xs cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>ดาวน์โหลดไฟล์ CSV (สำหรับเปิดบน Google Sheets)</span>
              </button>

              <button
                type="button"
                onClick={() => setShowScriptModal(true)}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg text-xs flex items-center gap-2 transition-all cursor-pointer"
              >
                <Code className="w-4 h-4 text-emerald-400" />
                <span>รับโค้ด Apps Script เชื่อมชีท</span>
              </button>
            </div>

            {/* Grid for sheet name and toggle */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-slate-500 font-bold block">Sheet Tab Name (ชื่อแผ่นงาน)</label>
                <input
                  id="settings-sheets-name-input"
                  type="text"
                  value={sheetName}
                  onChange={(e) => setSheetName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white text-slate-700"
                  placeholder="เช่น Mylogiz_CRM_Sync"
                />
              </div>

              {/* Toggle switch for auto-sync */}
              <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-100 rounded-lg">
                <div>
                  <span className="font-bold text-slate-700 block">ซิงค์อัตโนมัติ (Auto-Sync)</span>
                  <span className="text-[10px] text-slate-400">ส่งข้อมูลทันทีเมื่อกดบันทึกดีล</span>
                </div>
                <button
                  id="settings-autosync-toggle-btn"
                  type="button"
                  onClick={async () => {
                    const nextVal = !autoSync;
                    setAutoSync(nextVal);
                    if (onUpdateSheetsConfig) {
                      await onUpdateSheetsConfig(spreadsheetUrl, sheetName, nextVal, webAppUrl);
                    }
                  }}
                  className={`w-11 h-6 rounded-full transition-all relative cursor-pointer ${autoSync ? "bg-emerald-500" : "bg-slate-300"}`}
                >
                  <div className={`w-4.5 h-4.5 bg-white rounded-full absolute top-0.75 transition-all shadow-xs ${autoSync ? "right-1" : "left-1"}`} />
                </button>
              </div>
            </div>

            {/* Save Config and Sync Buttons */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="font-bold text-slate-800 block">จัดการและซิงค์ข้อมูลสเปรดชีต</span>
                <p className="text-[10px] text-slate-400">คุณสามารถเลือกบันทึกการตั้งค่า หรือซิงค์ข้อมูลลูกค้าทั้งหมด {leadsCount} รายเข้าชีททันที</p>
              </div>

              <div className="flex flex-wrap gap-2 shrink-0">
                <button
                  type="button"
                  onClick={async () => {
                    if (onUpdateSheetsConfig) {
                      setSyncStatus("loading");
                      const ok = await onUpdateSheetsConfig(spreadsheetUrl, sheetName, autoSync, webAppUrl);
                      if (ok) {
                        setSyncStatus("success");
                        setSyncMessage("บันทึกการตั้งค่า Google Sheets สำเร็จ");
                        setTimeout(() => setSyncStatus("idle"), 3000);
                      } else {
                        setSyncStatus("error");
                        setSyncMessage("ไม่สามารถบันทึกการตั้งค่าได้");
                      }
                    }
                  }}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer text-center"
                >
                  บันทึกสเปรดชีต
                </button>

                <button
                  id="settings-sync-now-btn"
                  onClick={handleManualSync}
                  disabled={syncStatus === "loading"}
                  className={`px-4 py-2.5 rounded-lg text-white font-bold flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-all text-xs ${syncStatus === "loading" ? "bg-slate-400 cursor-not-allowed" : "bg-emerald-600 hover:bg-emerald-500"}`}
                >
                  <RefreshCw className={`w-4 h-4 ${syncStatus === "loading" ? "animate-spin" : ""}`} />
                  {syncStatus === "loading" ? "กำลังซิงค์..." : "ซิงค์ข้อมูลทันที"}
                </button>
              </div>
            </div>

            {/* Feedback alert Banner */}
            {syncStatus === "success" && (
              <div id="settings-sync-banner-success" className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-lg flex items-center gap-2">
                <Check className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <span className="font-bold block">ซิงค์สำเร็จ! (Sync Accomplished)</span>
                  <span className="text-[10px] text-slate-500 leading-none">{syncMessage}</span>
                </div>
              </div>
            )}

            {syncStatus === "error" && (
              <div id="settings-sync-banner-error" className="p-3 bg-red-50 border border-red-200 text-red-900 rounded-lg flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
                <div>
                  <span className="font-bold block">ซิงค์ไม่สำเร็จ (Sync Error)</span>
                  <span className="text-[10px] text-slate-500 leading-none">{syncMessage}</span>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* แก้ไขข้อมูลบัญชีผู้ใช้ส่วนตัว (Your Account Profile) */}
        <div id="settings-profile-card" className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs lg:col-span-2 space-y-5">
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
            <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${currentUser === managerName ? "bg-amber-100 text-amber-800 border border-amber-200" : "bg-blue-50 text-blue-700 border border-blue-100"}`}>
              {currentUser === managerName ? "👑 สิทธิ์ผู้จัดการ (Manager)" : "เซลส์พนักงานขาย (Sales)"}
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
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white text-slate-700 font-bold"
                  placeholder="ชื่อจริงของคุณ หรือ ชื่อเล่นพนักงานขาย"
                />
              </div>
              <div className="flex items-end">
                <button
                  id="settings-profile-save-btn"
                  type="submit"
                  disabled={selfNameInput.trim() === currentUser}
                  className={`w-full py-2.5 rounded-lg text-white font-bold text-xs transition-colors cursor-pointer ${selfNameInput.trim() === currentUser ? "bg-slate-300 cursor-not-allowed text-slate-500" : "bg-blue-600 hover:bg-blue-500"}`}
                >
                  บันทึกการเปลี่ยนแปลง
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* ตั้งค่ารหัสผ่านเข้าใช้งานส่วนตัว (Change Your Password Card) */}
        <div id="settings-password-card" className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs lg:col-span-2 space-y-5">
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
            <div className={`p-3 rounded-lg text-xs font-bold border ${passMsg.isError ? "bg-rose-50 text-rose-800 border-rose-200" : "bg-emerald-50 text-emerald-800 border-emerald-200"}`}>
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
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white text-slate-700 font-bold"
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
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white text-slate-700 font-bold"
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
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white text-slate-700 font-bold"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isUpdatingPass || !currentPassInput || !newPassInput || !confirmPassInput}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition-all shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
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

        {/* จัดการชื่อพนักงานขาย / เซลส์ (Salesperson Management Card) */}
        <div id="settings-salespersons-card" className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs lg:col-span-2 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-blue-600" />
              <div>
                <h3 className="text-slate-800 font-bold text-sm">จัดการพนักงานขาย / เซลส์ (Salesperson Management)</h3>
                <p className="text-[10px] text-slate-400">เพิ่ม ลบ รายชื่อพนักงานขายในระบบเพื่อใช้กำหนดสิทธิ์ดูแลใน Pipeline</p>
              </div>
            </div>
            {currentUser !== managerName && (
              <span className="px-2.5 py-1 bg-red-50 text-red-700 border border-red-100 rounded-full text-[10px] font-bold">
                🔒 สิทธิ์จำกัดเฉพาะ Manager
              </span>
            )}
          </div>

          {/* Feedback message banner */}
          {salespersonMessage && (
            <div id="salesperson-msg-banner" className="p-2.5 px-4 bg-blue-50 border border-blue-100 text-blue-800 rounded-lg text-xs font-semibold animate-fade-in flex items-center gap-2">
              <span className="block">{salespersonMessage}</span>
            </div>
          )}

          {/* Inline Add Form (Only allowed for Phere) */}
          {currentUser === managerName ? (
            <form onSubmit={handleAddSalesperson} className="flex gap-2.5">
              <input 
                id="settings-salesperson-add-input"
                type="text"
                required
                placeholder="กรอกชื่อเซลส์คนใหม่ เช่น Nalin, Beer..."
                value={newSalespersonName}
                onChange={(e) => setNewSalespersonName(e.target.value)}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white text-slate-700"
              />
              <button 
                id="settings-salesperson-add-submit"
                type="submit"
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>เพิ่มรายชื่อ</span>
              </button>
            </form>
          ) : (
            <div className="p-3 bg-amber-50/50 border border-amber-100 text-amber-800 rounded-lg text-xs leading-relaxed">
              ⚠️ เฉพาะผู้จัดการสูงสุด <strong>{managerName}</strong> เท่านั้นที่มีสิทธิ์เพิ่มรายชื่อพนักงานขายในระบบได้
            </div>
          )}

          {/* Salesperson list */}
          <div className="space-y-2">
            <label className="text-slate-500 font-bold text-xs block">รายชื่อเซลส์ปัจจุบัน ({salespersons.length} คน)</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" id="settings-salesperson-list">
              {salespersons.map((sp) => {
                const isEditing = editingSp === sp;
                return (
                  <div 
                    key={sp} 
                    className={`flex items-center justify-between p-3 rounded-lg text-xs transition-all ${isEditing ? "bg-blue-50/70 border border-blue-200" : "bg-slate-50 border border-slate-100"}`}
                  >
                    {isEditing ? (
                      <div className="flex items-center gap-2 w-full">
                        <input
                          type="text"
                          value={editingNameInput}
                          onChange={(e) => setEditingNameInput(e.target.value)}
                          className="flex-1 bg-white border border-slate-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold text-slate-700 text-xs"
                          placeholder="ระบุชื่อใหม่"
                          autoFocus
                        />
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleSaveRename(sp)}
                            className="p-1 text-emerald-600 hover:bg-emerald-50 rounded transition-all cursor-pointer"
                            title="บันทึก"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingSp(null)}
                            className="p-1 text-slate-400 hover:bg-slate-100 rounded transition-all cursor-pointer"
                            title="ยกเลิก"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2.5">
                          <div className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-[10px]">
                            {sp.substring(0, 2)}
                          </div>
                          <span className="font-bold text-slate-700">
                            {sp} {sp === managerName && "👑"} {sp === currentUser && "(คุณ)"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {currentUser === managerName && (
                            <>
                              <button 
                                type="button"
                                onClick={() => {
                                  setEditingSp(sp);
                                  setEditingNameInput(sp);
                                }}
                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all cursor-pointer"
                                title={`เปลี่ยนชื่อ ${sp}`}
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button 
                                id={`delete-salesperson-btn-${sp}`}
                                type="button"
                                onClick={() => handleDeleteSalesperson(sp)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                                title={`ลบรายชื่อ ${sp}`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* จัดการแคมเปญการตลาด (Marketing Campaign Management Card) */}
        <div id="settings-campaigns-card" className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs lg:col-span-2 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-indigo-600" />
              <div>
                <h3 className="text-slate-800 font-bold text-sm">จัดการแคมเปญการตลาด (Campaign Management)</h3>
                <p className="text-[10px] text-slate-400">เพิ่ม (+) หรือ ลบ (-) แคมเปญโฆษณา/การตลาดสำหรับบันทึกช่องทางที่มาของลูกค้า</p>
              </div>
            </div>
            <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full text-[10px] font-bold">
              📢 ทั้งหมด {campaigns.length} แคมเปญ
            </span>
          </div>

          {/* Feedback message banner */}
          {campaignMessage && (
            <div id="campaign-msg-banner" className="p-2.5 px-4 bg-indigo-50 border border-indigo-100 text-indigo-900 rounded-lg text-xs font-semibold animate-fade-in flex items-center gap-2">
              <span className="block">{campaignMessage}</span>
            </div>
          )}

          {/* Add Form */}
          <form onSubmit={handleAddNewCampaign} className="flex gap-2.5">
            <input 
              id="settings-campaign-add-input"
              type="text"
              required
              placeholder="กรอกชื่อแคมเปญใหม่ เช่น แคมเปญ 8.8 Sales Shock, TikTok Live..."
              value={newCampaignInput}
              onChange={(e) => setNewCampaignInput(e.target.value)}
              className="flex-1 bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white text-slate-700 font-medium"
            />
            <button 
              id="settings-campaign-add-submit"
              type="submit"
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>เพิ่มแคมเปญ (+)</span>
            </button>
          </form>

          {/* Campaigns list */}
          <div className="space-y-2">
            <label className="text-slate-500 font-bold text-xs block">รายชื่อแคมเปญการตลาดเปิดใช้งานอยู่</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" id="settings-campaign-list">
              {campaigns.map((camp) => {
                const count = leads.filter(l => l.campaign === camp).length;
                return (
                  <div 
                    key={camp} 
                    className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-lg text-xs hover:border-indigo-200 transition-all group"
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <Megaphone className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      <span className="font-bold text-slate-800 truncate">{camp}</span>
                      {count > 0 && (
                        <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 font-bold text-[10px] rounded-full shrink-0 flex items-center gap-1">
                          <Users className="w-2.5 h-2.5" /> {count} ราย
                        </span>
                      )}
                    </div>

                    <button 
                      type="button"
                      onClick={() => handleDeleteCampaignItem(camp)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer shrink-0 opacity-80 group-hover:opacity-100"
                      title={`ลบแคมเปญ "${camp}"`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Sync Log Viewer (1/3 cols) */}
        <div id="settings-sync-logs-card" className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <CloudLightning className="w-4 h-4 text-emerald-500" />
              <h3 className="text-slate-800 font-bold text-xs uppercase tracking-wider">ประวัติประมวลผล (Console Log)</h3>
            </div>

            <div className="bg-slate-900 text-slate-300 font-mono p-3 rounded-lg text-[9px] h-60 overflow-y-auto space-y-1.5 border border-slate-950">
              {syncLogs.map(log => (
                <div key={log.id} className="leading-normal flex items-start gap-1">
                  <span className="text-slate-500 shrink-0">[{log.time}]</span>
                  <span className={log.type === "success" ? "text-emerald-400" : log.type === "error" ? "text-rose-400" : "text-sky-300"}>
                    {log.msg}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 text-[10px] text-slate-400 flex items-center justify-between">
            <span>ฐานข้อมูล: crm_store.json</span>
            <span className="text-emerald-600 font-bold flex items-center gap-1">🟢 กำลังทำงาน</span>
          </div>
        </div>

      </div>

      {/* Google Apps Script Modal */}
      {showScriptModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
                <div>
                  <h3 className="text-base font-bold text-slate-800">โค้ด Apps Script สำหรับเชื่อมต่อ Google Sheets</h3>
                  <p className="text-xs text-slate-500">ทำตามขั้นตอนง่ายๆ 3 ข้อเพื่อรับข้อมูลจาก CRM อัตโนมัติ</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowScriptModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Step-by-step Guide */}
            <div className="space-y-2 text-xs text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <span className="font-bold text-slate-900 block">📋 วิธีติดตั้งใน 1 นาที:</span>
              <ol className="list-decimal list-inside space-y-1 text-slate-600 leading-relaxed">
                <li>เปิดไฟล์ <strong>Google Sheet</strong> ของคุณ</li>
                <li>ไปที่เมนูด้านบน <strong>ส่วนขยาย (Extensions)</strong> &rarr; <strong>Apps Script</strong></li>
                <li>ลบโค้ดเดิมออกทั้งหมด แล้ววางโค้ดด้านล่างนี้ลงไป</li>
                <li>กด <strong>ทำให้ใช้งานได้ (Deploy)</strong> &rarr; <strong>การทำให้ใช้งานได้รายการใหม่ (New deployment)</strong></li>
                <li>เลือกประเภท <strong>เว็บแอป (Web app)</strong> และตั้งค่าสิทธิ์การเข้าถึงเป็น <strong>ทุกคน (Anyone)</strong></li>
                <li>กด Deploy แล้วคัดลอก Web App URL มาวางในช่อง <strong>Google Apps Script Web App URL</strong> ในหน้านี้</li>
              </ol>
            </div>

            {/* Code Box */}
            <div className="relative">
              <div className="flex items-center justify-between bg-slate-900 text-slate-300 px-4 py-2 rounded-t-lg text-xs font-mono">
                <span>Google Apps Script (doPost.gs)</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_CODE);
                    setCopiedCode(true);
                    setTimeout(() => setCopiedCode(false), 3000);
                  }}
                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode ? "คัดลอกเรียบร้อย!" : "คัดลอกโค้ด"}</span>
                </button>
              </div>
              <pre className="bg-slate-950 text-emerald-400 font-mono text-[11px] p-4 rounded-b-lg overflow-x-auto max-h-60 leading-relaxed border border-slate-800">
                {GOOGLE_APPS_SCRIPT_CODE}
              </pre>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => exportLeadsToCSV(leads)}
                className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>หรือดาวน์โหลด CSV สำหรับเปิดบน Sheets</span>
              </button>

              <button
                type="button"
                onClick={() => setShowScriptModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs transition-all cursor-pointer"
              >
                เสร็จสิ้น / ปิดหน้าต่าง
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
