import React, { useState, useRef } from "react";
import { 
  FileSpreadsheet, Upload, Download, CheckCircle2, AlertTriangle, 
  X, HelpCircle, ArrowRight, Check, RefreshCw, FileText, Users, Tag
} from "lucide-react";
import { Lead, LeadStatus, StatusLabels } from "../types";
import { parseExcelLeadsFile, downloadLeadImportTemplate, ParsedLeadRow, ExcelImportResult } from "../utils/excelImporter";

interface ImportLeadsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: string | null;
  salespersons?: string[];
  campaigns?: string[];
  onBatchAddLeads: (leadsData: Omit<Lead, "id" | "createdAt" | "updatedAt" | "timeline" | "calls" | "files">[]) => Promise<{ success: boolean; count: number }>;
}

export default function ImportLeadsModal({
  isOpen,
  onClose,
  currentUser,
  salespersons = [],
  campaigns = [],
  onBatchAddLeads
}: ImportLeadsModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parseResult, setParseResult] = useState<ExcelImportResult | null>(null);
  const [overrideSalesperson, setOverrideSalesperson] = useState<string>("");
  const [overrideCampaign, setOverrideCampaign] = useState<string>("");
  const [importing, setImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = async (selectedFile: File) => {
    if (!selectedFile) return;
    setFile(selectedFile);
    setParsing(true);
    setErrorMessage(null);
    setImportSuccess(null);

    const defaultSp = overrideSalesperson || currentUser || (salespersons.length > 0 ? salespersons[0] : "Phere");
    const result = await parseExcelLeadsFile(selectedFile, defaultSp);
    
    setParsing(false);
    setParseResult(result);
    if (!result.success) {
      setErrorMessage(result.errorMessage || "ไม่สามารถประมวลผลไฟล์ได้");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.name.endsWith(".xlsx") || droppedFile.name.endsWith(".xls") || droppedFile.name.endsWith(".csv")) {
        handleFileChange(droppedFile);
      } else {
        setErrorMessage("กรุณาเลือกไฟล์ Excel (.xlsx, .xls) หรือ CSV เท่านั้น");
      }
    }
  };

  const handleConfirmImport = async () => {
    if (!parseResult || parseResult.validRows.length === 0) return;

    setImporting(true);
    setErrorMessage(null);

    try {
      const leadsToCreate = parseResult.validRows.map(row => {
        const targetSalesperson = overrideSalesperson 
          ? overrideSalesperson 
          : (row.salesPerson || currentUser || (salespersons.length > 0 ? salespersons[0] : "Phere"));

        const targetCampaign = overrideCampaign 
          ? overrideCampaign 
          : (row.campaign || "");

        const initialNote = row.initialNote?.trim();

        return {
          shopName: row.shopName,
          contactName: row.contactName || "",
          phone: row.phone || "",
          lineId: row.lineId || "",
          facebook: row.facebook || "",
          province: row.province || "กรุงเทพมหานคร",
          channel: row.channel || "Facebook",
          campaign: targetCampaign,
          status: row.status || LeadStatus.NEW_LEAD,
          salesPerson: targetSalesperson,
          tags: row.tags || [],
          score: row.score || 3,
          shipmentsPerDay: row.shipmentsPerDay || 0,
          preferredTransport: row.preferredTransport || ["Flash"],
          competitor: row.competitor || "",
          address: row.address || "",
          customerType: row.customerType || "individual",
          documents: {
            idCard: false,
            bookBank: false,
            companyReg: false,
            taxDoc: false,
            storefrontPhoto: false
          },
          followUp: {
            date: row.followUpDate || "",
            time: row.followUpTime || "10:00",
            isCompleted: false,
            note: row.followUpNote || "",
            detail: row.followUpNote || ""
          },
          notes: initialNote ? [
            {
              id: `note_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
              text: initialNote,
              createdAt: new Date().toISOString(),
              author: targetSalesperson
            }
          ] : []
        };
      });

      const res = await onBatchAddLeads(leadsToCreate);
      if (res.success) {
        setImportSuccess(res.count);
      } else {
        setErrorMessage("เกิดข้อผิดพลาดในการบันทึกข้อมูลไปยังฐานข้อมูล");
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err?.message || "เกิดข้อผิดพลาดในการนำเข้าข้อมูล");
    } finally {
      setImporting(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setParseResult(null);
    setImportSuccess(null);
    setErrorMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div 
        id="import-leads-modal-card"
        className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] shadow-2xl border border-slate-200 flex flex-col overflow-hidden"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-200 shadow-2xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <span>นำเข้าข้อมูล Leads จากไฟล์ Excel</span>
                <span className="text-[11px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
                  Bulk Import (.xlsx)
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                อัปโหลดไฟล์ Excel เพื่อเพิ่มลูกค้าเป้าหมายหลายรายพร้อมกันในครั้งเดียว
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
          {/* Success Notification State */}
          {importSuccess !== null ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center space-y-3 animate-in zoom-in-95">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-base font-bold text-emerald-900">
                  นำเข้าข้อมูลลูกค้าเป้าหมายสำเร็จ!
                </h3>
                <p className="text-xs text-emerald-700 mt-1">
                  เพิ่มข้อมูล Lead ใหม่จำนวน <span className="font-bold text-emerald-950 font-mono text-sm">{importSuccess} ราย</span> เข้าสู่ระบบและฐานข้อมูลเรียบร้อยแล้ว
                </p>
              </div>
              <div className="pt-3 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-4 py-2 bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 font-bold rounded-xl transition-all cursor-pointer shadow-2xs"
                >
                  นำเข้าไฟล์อื่นเพิ่ม
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all cursor-pointer shadow-xs"
                >
                  ดูรายการใน CRM ทันที
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Step 1: Template Download Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-blue-50/60 border border-blue-100 rounded-xl">
                <div className="flex items-start gap-2.5">
                  <HelpCircle className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-bold text-blue-900 block">ยังไม่มีไฟล์รูปแบบมาตรฐาน?</span>
                    <span className="text-[11px] text-blue-700 block mt-0.5">
                      ดาวน์โหลดแบบฟอร์มตัวอย่าง (.xlsx) ที่มีหัวตารางครบถ้วน ทั้งชื่อร้าน, เบอร์โทร, แท็ก, และเซลส์
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  id="download-template-excel-btn"
                  onClick={downloadLeadImportTemplate}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 rounded-lg font-bold shadow-2xs transition-all cursor-pointer shrink-0 self-start sm:self-center"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>ดาวน์โหลด Template</span>
                </button>
              </div>

              {/* Step 2: Upload Zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                  isDragOver 
                    ? "border-emerald-500 bg-emerald-50/40" 
                    : file 
                      ? "border-emerald-300 bg-emerald-50/20" 
                      : "border-slate-300 hover:border-slate-400 bg-slate-50/50 hover:bg-slate-50"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleFileChange(e.target.files[0]);
                    }
                  }}
                />
                <div className="w-10 h-10 bg-white text-emerald-600 rounded-xl border border-slate-200 flex items-center justify-center mx-auto shadow-2xs mb-2">
                  <Upload className="w-5 h-5" />
                </div>
                <p className="font-bold text-slate-700">
                  {file ? file.name : "ลากไฟล์ Excel มาวางที่นี่ หรือคลิกเพื่อเลือกไฟล์"}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  รองรับไฟล์ .xlsx, .xls, .csv (สูงสุด 5,000 รายการต่อครั้ง)
                </p>
              </div>

              {/* Error Alert */}
              {errorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span className="font-medium">{errorMessage}</span>
                </div>
              )}

              {/* Parsing Indicator */}
              {parsing && (
                <div className="p-4 text-center text-slate-500 space-y-2">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto text-emerald-600" />
                  <p className="font-medium">กำลังอ่านและตรวจสอบโครงสร้างข้อมูลในไฟล์ Excel...</p>
                </div>
              )}

              {/* Step 3: Parse Result & Column Override Controls */}
              {parseResult && parseResult.success && (
                <div className="space-y-4 pt-1">
                  {/* Summary Badges */}
                  <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>พร้อมนำเข้า {parseResult.validRows.length} รายการ</span>
                      </div>
                      {parseResult.invalidRows.length > 0 && (
                        <div className="flex items-center gap-1.5 text-rose-700 font-bold bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>ไม่ผ่าน {parseResult.invalidRows.length} รายการ</span>
                        </div>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400 font-medium">
                      รวมทั้งหมด {parseResult.totalRows} แถว
                    </span>
                  </div>

                  {/* Batch Options: Assign Salesperson & Campaign to all imported leads if needed */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50/70 p-3.5 rounded-xl border border-slate-200">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                        <Users className="w-3 h-3 text-blue-600" /> มอบหมายเซลส์ผู้ดูแล (ทั้งหมด):
                      </label>
                      <select
                        value={overrideSalesperson}
                        onChange={(e) => setOverrideSalesperson(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                      >
                        <option value="">-- ใช้เซลส์ตามที่ระบุในไฟล์ Excel --</option>
                        {salespersons.map(sp => (
                          <option key={sp} value={sp}>{sp}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                        <Tag className="w-3 h-3 text-indigo-600" /> แคมเปญการตลาด (ทั้งหมด):
                      </label>
                      <select
                        value={overrideCampaign}
                        onChange={(e) => setOverrideCampaign(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                      >
                        <option value="">-- ใช้แคมเปญตามที่ระบุในไฟล์ Excel --</option>
                        {campaigns.map(camp => (
                          <option key={camp} value={camp}>{camp}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Preview Table (First 5 Rows) */}
                  <div className="space-y-2">
                    <span className="font-bold text-slate-700 block">
                      ตัวอย่างข้อมูลที่พร้อมนำเข้า ({Math.min(5, parseResult.validRows.length)} รายการแรก):
                    </span>
                    <div className="border border-slate-200 rounded-xl overflow-x-auto max-h-48">
                      <table className="w-full text-left border-collapse text-[11px]">
                        <thead>
                          <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200 sticky top-0">
                            <th className="py-2 px-3">#</th>
                            <th className="py-2 px-3">ชื่อร้านค้า / แบรนด์</th>
                            <th className="py-2 px-3">ผู้ติดต่อ / เบอร์</th>
                            <th className="py-2 px-3">จังหวัด</th>
                            <th className="py-2 px-3">ช่องทาง</th>
                            <th className="py-2 px-3">สถานะ</th>
                            <th className="py-2 px-3">เซลส์</th>
                            <th className="py-2 px-3">Tags</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {parseResult.validRows.slice(0, 5).map((row, idx) => (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="py-2 px-3 font-mono text-slate-400">{idx + 1}</td>
                              <td className="py-2 px-3 font-bold text-slate-800">{row.shopName}</td>
                              <td className="py-2 px-3">
                                <div>{row.contactName || "-"}</div>
                                <div className="font-mono text-slate-500">{row.phone || "-"}</div>
                              </td>
                              <td className="py-2 px-3 text-slate-600">{row.province}</td>
                              <td className="py-2 px-3 text-slate-600">{row.channel}</td>
                              <td className="py-2 px-3">
                                <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px] font-semibold text-slate-700">
                                  {StatusLabels[row.status || LeadStatus.NEW_LEAD]}
                                </span>
                              </td>
                              <td className="py-2 px-3 font-semibold text-blue-700">
                                {overrideSalesperson || row.salesPerson || currentUser || "Phere"}
                              </td>
                              <td className="py-2 px-3">
                                {row.tags && row.tags.length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
                                    {row.tags.slice(0, 2).map((t, i) => (
                                      <span key={i} className="bg-blue-50 text-blue-700 text-[9px] px-1 rounded border border-blue-200">
                                        {t}
                                      </span>
                                    ))}
                                    {row.tags.length > 2 && (
                                      <span className="text-[9px] text-slate-400">+{row.tags.length - 2}</span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-slate-400">-</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        {importSuccess === null && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/70">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:text-slate-800 font-bold hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              ยกเลิก
            </button>

            <div className="flex items-center gap-2">
              {parseResult && parseResult.validRows.length > 0 && (
                <button
                  type="button"
                  id="confirm-import-leads-btn"
                  onClick={handleConfirmImport}
                  disabled={importing || parseResult.validRows.length === 0}
                  className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-300 text-white font-bold rounded-xl transition-all shadow-xs cursor-pointer"
                >
                  {importing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>กำลังนำเข้า {parseResult.validRows.length} รายการ...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>ยืนยันนำเข้า {parseResult.validRows.length} Leads</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
