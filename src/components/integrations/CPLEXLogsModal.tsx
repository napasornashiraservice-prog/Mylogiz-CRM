import React, { useState, useEffect } from "react";
import { 
  X, FileCode2, RefreshCw, Trash2, ShieldCheck, Search, Filter, 
  CheckCircle2, AlertCircle, Clock, Server, ArrowUpRight, ArrowDownLeft
} from "lucide-react";
import { CPLEXApiLog } from "../../types";
import { cplexService } from "../../integrations/cplex/cplexService";

interface CPLEXLogsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CPLEXLogsModal({ isOpen, onClose }: CPLEXLogsModalProps) {
  const [logs, setLogs] = useState<CPLEXApiLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"all" | "success" | "error">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadLogs();
    }
  }, [isOpen]);

  const loadLogs = async () => {
    setIsLoading(true);
    try {
      const data = await cplexService.getLogs();
      setLogs(data);
    } catch (err) {
      console.error("Failed to load logs:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearLogs = async () => {
    if (!window.confirm("คุณแน่ใจหรือไม่ว่าต้องการล้างประวัติ API Logs ทั้งหมด?")) return;
    setIsClearing(true);
    try {
      await cplexService.clearLogs();
      setLogs([]);
    } catch (err) {
      console.error("Failed to clear logs:", err);
    } finally {
      setIsClearing(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesStatus = 
      statusFilter === "all" || 
      (statusFilter === "success" && log.success) || 
      (statusFilter === "error" && !log.success);

    const matchesSearch = 
      log.endpoint.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.errorMessage && log.errorMessage.toLowerCase().includes(searchQuery.toLowerCase())) ||
      log.method.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.date.includes(searchQuery) ||
      log.time.includes(searchQuery);

    return matchesStatus && matchesSearch;
  });

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
      id="cplex-logs-modal"
    >
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4.5 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 border border-indigo-400/30 rounded-xl text-indigo-300">
              <FileCode2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white">บันทึกการเรียกใช้งาน API (API Logs)</h3>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                  {filteredLogs.length} รายการ
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                ประวัติการเชื่อมต่อและส่งข้อมูลระหว่าง Mylogiz CRM และ Mylogiz CPLEX
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

        {/* Filters & Actions Bar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          
          <div className="flex items-center gap-2.5 flex-1 min-w-[280px]">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหาตาม Endpoint, เวลา หรือข้อความผิดพลาด..."
                className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">ทุกสถานะ (All)</option>
              <option value="success">✓ สำเร็จ (Success)</option>
              <option value="error">✗ ล้มเหลว (Failed / Error)</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadLogs}
              disabled={isLoading}
              className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-indigo-600" : ""}`} />
              <span>รีเฟรช</span>
            </button>

            {logs.length > 0 && (
              <button
                onClick={handleClearLogs}
                disabled={isClearing}
                className="px-3 py-1.5 bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>ล้าง Log</span>
              </button>
            )}
          </div>

        </div>

        {/* Security Notice Banner */}
        <div className="px-4 py-2 bg-indigo-50/60 border-b border-indigo-100 flex items-center gap-2 text-[11px] text-indigo-900 font-medium shrink-0">
          <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
          <span>ระบบปลอดภัยสูงสุด: ข้อมูลลับเช่น API Key, Token และรหัสผ่าน จะไม่ถูกบันทึกลงในระบบ Log โดยเด็ดขาด</span>
        </div>

        {/* Logs Table / List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
              <span className="text-xs">กำลังโหลดรายการ API Logs...</span>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="py-16 text-center text-slate-400 space-y-2">
              <Server className="w-8 h-8 mx-auto text-slate-300" />
              <div className="text-xs font-bold text-slate-600">ไม่มีบันทึกการเรียกใช้งาน API</div>
              <div className="text-[11px] text-slate-400">
                เมื่อระบบเริ่มส่งคำขอหรือซิงค์ข้อมูลกับ CPLEX รายการ Log จะแสดงที่นี่
              </div>
            </div>
          ) : (
            <div className="space-y-2 font-mono">
              {filteredLogs.map((log) => (
                <div 
                  key={log.id}
                  className={`p-3 rounded-xl border text-xs transition-all ${
                    log.success
                      ? "bg-white border-slate-200 hover:border-slate-300"
                      : "bg-rose-50/40 border-rose-200 hover:border-rose-300"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    
                    {/* Method + Endpoint + Status */}
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        log.method === "GET" ? "bg-blue-100 text-blue-800" :
                        log.method === "POST" ? "bg-emerald-100 text-emerald-800" :
                        log.method === "DELETE" ? "bg-rose-100 text-rose-800" :
                        "bg-amber-100 text-amber-800"
                      }`}>
                        {log.method}
                      </span>

                      <span className="font-semibold text-slate-800 font-sans break-all">
                        {log.endpoint}
                      </span>

                      <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                        log.status >= 200 && log.status < 300 ? "bg-emerald-100 text-emerald-800" :
                        log.status >= 400 && log.status < 500 ? "bg-amber-100 text-amber-800" :
                        "bg-rose-100 text-rose-800"
                      }`}>
                        {log.status === 0 ? "ERR" : log.status}
                      </span>
                    </div>

                    {/* Meta: Response time + Timestamp */}
                    <div className="flex items-center gap-3 text-[11px] text-slate-400 font-sans shrink-0">
                      <span className="flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {log.responseTime} ms
                      </span>
                      <span>{log.date} {log.time}</span>
                    </div>

                  </div>

                  {/* Error Message if any */}
                  {log.errorMessage && (
                    <div className="mt-2 pt-2 border-t border-rose-100/80 text-[11px] text-rose-700 font-sans flex items-start gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                      <span>{log.errorMessage}</span>
                    </div>
                  )}

                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-400 font-mono">
            Mylogiz CPLEX Integration Engine v1.0
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>

      </div>
    </div>
  );
}
