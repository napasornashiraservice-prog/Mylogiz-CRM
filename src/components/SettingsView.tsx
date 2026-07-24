import React, { useState } from "react";
import { Sliders, Database, Table, CloudLightning, Check, AlertTriangle, RefreshCw, Eye, User, Plus, Trash2, X, Edit } from "lucide-react";
import { motion } from "motion/react";

interface SettingsViewProps {
  leadsCount: number;
  salespersons?: string[];
  currentUser?: string | null;
  sheetsConfig?: {
    sheetUrl: string;
    sheetName?: string;
    isEnabled: boolean;
    lastSyncedAt: string | null;
  };
  onUpdateSalespersons?: (newSalespersons: string[]) => Promise<boolean>;
  onRenameSelf?: (newName: string) => Promise<boolean>;
  onRenameSalesperson?: (oldName: string, newName: string) => Promise<boolean>;
  onSyncGoogleSheets: (spreadsheetUrl: string, sheetName: string) => Promise<{ success: boolean; message: string; timestamp?: string }>;
  onUpdateSheetsConfig?: (sheetUrl: string, sheetName: string, isEnabled: boolean) => Promise<boolean>;
}

export default function SettingsView({ 
  leadsCount, 
  salespersons = [], 
  currentUser = null, 
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
  const [autoSync, setAutoSync] = useState(true);

  React.useEffect(() => {
    if (sheetsConfig) {
      if (sheetsConfig.sheetUrl) {
        setSpreadsheetUrl(sheetsConfig.sheetUrl);
      }
      if (sheetsConfig.sheetName) {
        setSheetName(sheetsConfig.sheetName);
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

  React.useEffect(() => {
    if (currentUser) {
      setSelfNameInput(currentUser);
    }
  }, [currentUser]);

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
    // Add temporary log
    const startLog = {
      id: Date.now().toString(),
      msg: `เริ่มดำเนินการเขียนไฟล์ JSON และจัดระเบียบโครงสร้างแถวเพื่อเตรียมส่งขึ้นชีท...`,
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
              <label className="text-slate-500 font-bold block">Spreadsheet URL</label>
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
                      await onUpdateSheetsConfig(spreadsheetUrl, sheetName, nextVal);
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
                      const ok = await onUpdateSheetsConfig(spreadsheetUrl, sheetName, autoSync);
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
    </div>
  );
}
