import React, { useState, useEffect } from "react";
import { 
  X, Server, KeyRound, Globe, ShieldCheck, Check, AlertTriangle, 
  RefreshCw, Eye, EyeOff, Link2, Sliders, Database, Info, Lock,
  Layers, ChevronDown, ChevronUp, CheckSquare, Square
} from "lucide-react";
import { 
  CPLEXIntegrationConfig, 
  CPLEXAuthType, 
  CPLEXCustomerIdentifier, 
  CPLEXConnectionStatus,
  CPLEXFieldMappingItem,
  DEFAULT_CPLEX_DATA_MAPPINGS
} from "../../types";
import { cplexService } from "../../integrations/cplex/cplexService";

interface CPLEXConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigSaved?: (newConfig: CPLEXIntegrationConfig) => void;
}

export default function CPLEXConnectionModal({
  isOpen,
  onClose,
  onConfigSaved
}: CPLEXConnectionModalProps) {
  const [config, setConfig] = useState<CPLEXIntegrationConfig>({
    systemName: "Mylogiz CPLEX",
    baseUrl: "https://app.mylogiz.ai/th/mylogiz-cplex/admin/dashboard",
    authType: "bearer_token",
    customHeaderName: "X-API-Key",
    customerIdentifier: "customerCode",
    status: "disconnected",
    lastConnectedAt: null,
    lastSyncedAt: null,
    isEnabled: true
  });

  const [rawToken, setRawToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    responseTimeMs?: number;
  } | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadCurrentConfig();
    }
  }, [isOpen]);

  const loadCurrentConfig = async () => {
    setIsLoading(true);
    try {
      const current = await cplexService.getConfig();
      setConfig(current);
      setTestResult(null);
      setFeedbackMessage(null);
    } catch (err) {
      console.error("Failed to load config:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    setFeedbackMessage(null);
    try {
      // If user typed a new token or changed settings, save first before testing
      if (rawToken || config.baseUrl) {
        await cplexService.saveConfig(config, rawToken || undefined);
      }
      const res = await cplexService.testConnection();
      setTestResult(res);
      if (res.success) {
        setConfig(prev => ({ ...prev, status: "connected", lastConnectedAt: new Date().toISOString() }));
      } else {
        setConfig(prev => ({ ...prev, status: "error" }));
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || "ไม่สามารถเชื่อมต่อ Mylogiz CPLEX ได้ กรุณาตรวจสอบการตั้งค่า API"
      });
      setConfig(prev => ({ ...prev, status: "error" }));
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setFeedbackMessage(null);
    try {
      const res = await cplexService.saveConfig(config, rawToken || undefined);
      if (res.success) {
        setFeedbackMessage({ type: "success", text: "บันทึกการตั้งค่าเชื่อมต่อ Mylogiz CPLEX เรียบร้อยแล้ว" });
        setConfig(res.config);
        setRawToken("");
        if (onConfigSaved) onConfigSaved(res.config);
        setTimeout(() => {
          onClose();
        }, 1200);
      }
    } catch (err: any) {
      setFeedbackMessage({
        type: "error",
        text: err.message || "เกิดข้อผิดพลาดในการบันทึกการตั้งค่า"
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
      id="cplex-connection-modal"
    >
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8">
        
        {/* Header */}
        <div className="px-6 py-4.5 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/20 border border-indigo-400/30 rounded-xl text-indigo-300">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white">ตั้งค่าเชื่อมต่อ Mylogiz CPLEX</h3>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 font-medium">
                  API & Integration
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                เชื่อมโยงข้อมูลยอดขาย ออเดอร์ พัสดุ และสถานะการจัดส่งจากระบบหลังบ้าน CPLEX
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        {isLoading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3 text-slate-500">
            <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
            <span className="text-sm">กำลังโหลดการตั้งค่า...</span>
          </div>
        ) : (
          <form onSubmit={handleSave} className="p-6 space-y-5">
            
            {/* Status & Notification */}
            {feedbackMessage && (
              <div className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2.5 ${
                feedbackMessage.type === "success" 
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                  : "bg-rose-50 border-rose-200 text-rose-800"
              }`}>
                {feedbackMessage.type === "success" ? (
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{feedbackMessage.text}</span>
              </div>
            )}

            {/* Test result feedback banner */}
            {testResult && (
              <div className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center justify-between gap-2.5 ${
                testResult.success 
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                  : "bg-rose-50 border-rose-200 text-rose-800"
              }`}>
                <div className="flex items-center gap-2">
                  {testResult.success ? (
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span>{testResult.message}</span>
                </div>
                {testResult.responseTimeMs !== undefined && (
                  <span className="text-[11px] opacity-80 font-mono">
                    {testResult.responseTimeMs} ms
                  </span>
                )}
              </div>
            )}

            {/* API Credential Waiting Note */}
            {!config.hasToken && (
              <div className="p-3.5 bg-amber-50/80 border border-amber-200 text-amber-900 rounded-xl text-xs flex items-start gap-2.5">
                <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-bold text-amber-900">สถานะ: รอการตั้งค่า API Credential</span>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    ขณะนี้ Integration Layer และ UI พร้อมทำงานแล้ว หากยังไม่มี Secret Token จริง สามารถเว้นว่างไว้ก่อนได้ เมื่อได้รับ API Key/Secret Token จริงจาก Mylogiz CPLEX สามารถนำมากรอกที่ช่องด้านล่าง หรือตั้งค่าใน Environment Variables (<code className="font-mono font-bold">CPLEX_API_KEY</code> / <code className="font-mono font-bold">CPLEX_SECRET_TOKEN</code>)
                  </p>
                </div>
              </div>
            )}

            {/* Form Fields Grid */}
            <div className="space-y-4">
              
              {/* 1. System Name & Enable Switch */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    ชื่อระบบเชื่อมต่อ (System Name)
                  </label>
                  <input
                    type="text"
                    value={config.systemName}
                    onChange={(e) => setConfig({ ...config, systemName: e.target.value })}
                    required
                    placeholder="Mylogiz CPLEX"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    สถานะการใช้งาน (Status)
                  </label>
                  <label className="flex items-center gap-2.5 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={config.isEnabled}
                      onChange={(e) => setConfig({ ...config, isEnabled: e.target.checked })}
                      className="w-4 h-4 text-indigo-600 rounded-md border-slate-300 focus:ring-indigo-500"
                    />
                    <span className="text-xs font-bold text-slate-700">
                      {config.isEnabled ? "เปิดใช้งาน (Active)" : "ปิดชั่วคราว"}
                    </span>
                  </label>
                </div>
              </div>

              {/* 2. API Base URL */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  API Base URL <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Globe className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="url"
                    value={config.baseUrl}
                    onChange={(e) => setConfig({ ...config, baseUrl: e.target.value })}
                    required
                    placeholder="https://app.mylogiz.ai/th/mylogiz-cplex/admin/dashboard"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  URL ของระบบ Mylogiz CPLEX ที่ใช้เชื่อมต่อเรียก API
                </p>
              </div>

              {/* 3. Auth Type & Custom Header */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    รูปแบบการยืนยันตัวตน (Authentication Type)
                  </label>
                  <select
                    value={config.authType}
                    onChange={(e) => setConfig({ ...config, authType: e.target.value as CPLEXAuthType })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  >
                    <option value="bearer_token">Bearer Token (Authorization: Bearer ...)</option>
                    <option value="api_key">API Key (X-API-Key: ...)</option>
                    <option value="custom_header">Custom Header Name</option>
                  </select>
                </div>

                {config.authType === "custom_header" && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      ชื่อ Header (Custom Header Name)
                    </label>
                    <input
                      type="text"
                      value={config.customHeaderName || ""}
                      onChange={(e) => setConfig({ ...config, customHeaderName: e.target.value })}
                      placeholder="X-Mylogiz-Secret"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                  </div>
                )}
              </div>

              {/* 4. API Key / Secret Token (Masked for Security) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    API Key / Secret Token
                  </label>
                  {config.hasToken && (
                    <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                      <Lock className="w-3 h-3" /> มี Token บันทึกในระบบแล้ว
                    </span>
                  )}
                </div>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showToken ? "text" : "password"}
                    value={rawToken}
                    onChange={(e) => setRawToken(e.target.value)}
                    placeholder={config.hasToken ? "•••••••••••••••• (พิมพ์ใหม่หากต้องการเปลี่ยน Token)" : "วาง API Key หรือ Secret Token จาก CPLEX..."}
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  Token จะถูกเข้ารหัสและเก็บรักษาบน Server อย่างปลอดภัย ไม่มีการเปิดเผยใน Frontend
                </p>
              </div>

              {/* 5. Customer Identifier Mapping */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center gap-2 text-slate-800 font-bold text-xs">
                  <Link2 className="w-4 h-4 text-indigo-600" />
                  <span>การจับคู่ข้อมูลลูกค้า (Customer Identifier Matching)</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  เลือกว่าจะใช้ค่าใดใน CRM ในการจับคู่ค้นหาข้อมูลการใช้งานบนระบบ Mylogiz CPLEX
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {[
                    { id: "customerCode", label: "รหัสลูกค้า (Customer Code)", desc: "เช่น MLZ-1001" },
                    { id: "externalCustomerId", label: "External Customer ID", desc: "รหัสเฉพาะบนระบบ CPLEX" },
                    { id: "phone", label: "เบอร์โทรศัพท์ (Phone)", desc: "เช่น 0812345678" },
                    { id: "email", label: "อีเมล (Email)", desc: "เช่น customer@mail.com" },
                    { id: "customerId", label: "Customer ID (CRM ID)", desc: "รหัสอ้างอิงภายในของ CRM" },
                  ].map((item) => (
                    <label 
                      key={item.id}
                      className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all ${
                        config.customerIdentifier === item.id
                          ? "bg-indigo-50/80 border-indigo-300 text-indigo-900"
                          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="customerIdentifier"
                        value={item.id}
                        checked={config.customerIdentifier === item.id}
                        onChange={() => setConfig({ ...config, customerIdentifier: item.id as CPLEXCustomerIdentifier })}
                        className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                      />
                      <div>
                        <div className="text-xs font-bold">{item.label}</div>
                        <div className="text-[10px] text-slate-400">{item.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* 6. Data Mapping (ข้อมูลที่ต้องการเชื่อมต่อ) */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-800 font-bold text-xs">
                    <Layers className="w-4 h-4 text-indigo-600" />
                    <span>📊 ข้อมูลที่ต้องการเชื่อมต่อ (Data Mapping)</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100/70 text-indigo-700">
                    {((config.dataMapping || DEFAULT_CPLEX_DATA_MAPPINGS).filter(m => m.isEnabled)).length} / {(config.dataMapping || DEFAULT_CPLEX_DATA_MAPPINGS).length} ฟิลด์
                  </span>
                </div>
                
                <p className="text-[11px] text-slate-500">
                  เลือกฟิลด์ข้อมูลที่ต้องการเชื่อมโยง พร้อมสถานะรอกำหนด API Field เพื่อรองรับการเชื่อมต่อในอนาคต
                </p>

                <div className="space-y-2.5 max-h-52 overflow-y-auto pr-1">
                  {[
                    { cat: "customer", label: "ข้อมูลลูกค้า (Customer Info)" },
                    { cat: "sales", label: "ข้อมูลยอดขาย (Sales Info)" },
                    { cat: "shipping", label: "ข้อมูลการจัดส่ง (Shipping Info)" },
                  ].map(group => {
                    const items = (config.dataMapping || DEFAULT_CPLEX_DATA_MAPPINGS).filter(i => i.category === group.cat);
                    return (
                      <div key={group.cat} className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-1.5">
                        <div className="text-[11px] font-bold text-slate-700 pb-1 border-b border-slate-100 flex items-center justify-between">
                          <span>{group.label}</span>
                          <span className="text-[10px] text-slate-400 font-normal">
                            {items.filter(i => i.isEnabled).length}/{items.length} ฟิลด์
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-0.5">
                          {items.map(item => (
                            <label
                              key={item.id}
                              className="flex items-center justify-between gap-1.5 p-1.5 rounded hover:bg-slate-50 cursor-pointer text-xs"
                            >
                              <div className="flex items-center gap-2 truncate">
                                <input
                                  type="checkbox"
                                  checked={item.isEnabled}
                                  onChange={() => {
                                    const current = config.dataMapping || DEFAULT_CPLEX_DATA_MAPPINGS;
                                    const updated = current.map(m => m.id === item.id ? { ...m, isEnabled: !m.isEnabled } : m);
                                    setConfig({ ...config, dataMapping: updated });
                                  }}
                                  className="w-3.5 h-3.5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                                />
                                <span className={`text-[11px] truncate ${item.isEnabled ? "font-semibold text-slate-800" : "text-slate-400"}`}>
                                  {item.crmFieldLabel}
                                </span>
                              </div>
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200/60 shrink-0 font-medium">
                                รอกำหนด API Field
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting || isSaving}
                className="px-4 py-2.5 rounded-xl border border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 text-xs font-bold flex items-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isTesting ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-indigo-700" />
                ) : (
                  <Check className="w-4 h-4 text-indigo-600" />
                )}
                <span>{isTesting ? "กำลังทดสอบ..." : "ทดสอบการเชื่อมต่อ"}</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSaving || isTesting}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white text-xs font-bold shadow-md shadow-indigo-500/20 flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isSaving ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  <span>{isSaving ? "กำลังบันทึก..." : "บันทึกการตั้งค่า"}</span>
                </button>
              </div>
            </div>

          </form>
        )}

      </div>
    </div>
  );
}
