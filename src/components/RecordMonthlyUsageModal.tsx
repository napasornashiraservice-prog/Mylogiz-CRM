import React, { useState, useEffect } from "react";
import { 
  Lead, LeadStatus, MonthlyUsageRecord, CustomerBehaviorStatus, 
  LOST_REASON_PRESETS 
} from "../types";
import { 
  X, Calendar, Package, DollarSign, AlertTriangle, CheckCircle2, 
  Save, ArrowRight, UserCheck, Flame, RefreshCw, HelpCircle, PhoneCall
} from "lucide-react";
import { formatMonthThai, estimatePricePerPiece, getPastMonthsList } from "../utils/customerBehaviorAnalytics";

interface RecordMonthlyUsageModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
  initialMonth?: string;
  onUpdateLead: (updatedLead: Lead) => Promise<void> | void;
}

export default function RecordMonthlyUsageModal({
  isOpen,
  onClose,
  lead,
  initialMonth,
  onUpdateLead
}: RecordMonthlyUsageModalProps) {
  const currentMonthStr = new Date().toISOString().substring(0, 7);
  const [selectedMonth, setSelectedMonth] = useState<string>(initialMonth || currentMonthStr);
  const [piecesInput, setPiecesInput] = useState<string>("");
  const [revenueInput, setRevenueInput] = useState<string>("");
  const [noteInput, setNoteInput] = useState<string>("");
  const [isLostCheck, setIsLostCheck] = useState<boolean>(false);
  const [lostReason, setLostReason] = useState<string>(LOST_REASON_PRESETS[0]);
  const [customReason, setCustomReason] = useState<string>("");
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string>("");

  const monthsOptions = getPastMonthsList(currentMonthStr, 12);

  // Sync state when lead or initialMonth changes
  useEffect(() => {
    if (lead && isOpen) {
      setSuccessMsg("");
      const monthToLoad = initialMonth || currentMonthStr;
      setSelectedMonth(monthToLoad);

      const existingRecord = lead.monthlyUsage?.find(r => r.month === monthToLoad);
      if (existingRecord) {
        setPiecesInput(String(existingRecord.pieces));
        setRevenueInput(String(existingRecord.revenue));
        setNoteInput(existingRecord.note || "");
        setIsLostCheck(existingRecord.pieces === 0 || lead.status === LeadStatus.LOST);
      } else {
        const basePieces = Number(lead.shipmentsPerDay) || 0;
        const estPrice = estimatePricePerPiece(lead);
        setPiecesInput(basePieces > 0 ? String(basePieces) : "0");
        setRevenueInput(String(basePieces * estPrice));
        setNoteInput("");
        setIsLostCheck(lead.status === LeadStatus.LOST || basePieces === 0);
      }

      if (lead.lostReason) {
        if (LOST_REASON_PRESETS.includes(lead.lostReason)) {
          setLostReason(lead.lostReason);
        } else {
          setLostReason("อื่นๆ (ระบุเอง)");
          setCustomReason(lead.lostReason);
        }
      }
    }
  }, [lead, isOpen, initialMonth, currentMonthStr]);

  // When pieces input changes, automatically suggest revenue if empty or standard
  const handlePiecesChange = (val: string) => {
    setPiecesInput(val);
    const num = parseInt(val, 10);
    if (!isNaN(num)) {
      if (num === 0) {
        setIsLostCheck(true);
        setRevenueInput("0");
      } else {
        setIsLostCheck(false);
        const estPrice = lead ? estimatePricePerPiece(lead) : 35;
        setRevenueInput(String(num * estPrice));
      }
    }
  };

  if (!isOpen || !lead) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMsg("");

    try {
      const pieces = parseInt(piecesInput, 10) || 0;
      const revenue = parseFloat(revenueInput) || 0;
      const finalLostReason = lostReason === "อื่นๆ (ระบุเอง)" ? customReason.trim() : lostReason;

      const newRecord: MonthlyUsageRecord = {
        month: selectedMonth,
        pieces,
        revenue,
        note: noteInput.trim() || undefined,
        updatedAt: new Date().toISOString(),
        updatedBy: lead.salesPerson || "System"
      };

      // Merge into lead's monthlyUsage
      const currentList = Array.isArray(lead.monthlyUsage) ? [...lead.monthlyUsage] : [];
      const existingIdx = currentList.findIndex(r => r.month === selectedMonth);

      if (existingIdx >= 0) {
        currentList[existingIdx] = newRecord;
      } else {
        currentList.push(newRecord);
      }

      // Sort by month ascending
      currentList.sort((a, b) => a.month.localeCompare(b.month));

      // Determine updated LeadStatus and behaviorStatus
      let updatedStatus = lead.status;
      let updatedBehaviorStatus: CustomerBehaviorStatus = "active";
      let updatedLostReason = lead.lostReason;
      let updatedLostDate = lead.lostDate;

      if (pieces === 0 || isLostCheck) {
        updatedStatus = LeadStatus.LOST;
        updatedBehaviorStatus = "lost";
        updatedLostReason = finalLostReason || "ไม่ระบุสาเหตุ / หยุดส่งพัสดุ";
        updatedLostDate = updatedLostDate || new Date().toISOString().split("T")[0];
      } else {
        // Customer is actively shipping
        if (lead.status === LeadStatus.LOST) {
          // Customer recovered!
          updatedStatus = LeadStatus.REGULAR;
        }
        updatedBehaviorStatus = "active";
        updatedLostReason = undefined;
        updatedLostDate = undefined;
      }

      // Append Timeline Event
      const timelineEvent = {
        id: `tl_${Date.now()}`,
        title: pieces === 0 
          ? `🔴 บันทึกสถานะหยุดส่งพัสดุ (Lost - 0 ชิ้น) เดือน ${formatMonthThai(selectedMonth)}`
          : `📦 บันทึกยอดใช้งาน ${formatMonthThai(selectedMonth)}: ${pieces.toLocaleString()} ชิ้น (฿${revenue.toLocaleString()})`,
        description: pieces === 0 
          ? `สาเหตุ: ${finalLostReason || "ยอดส่ง 0 ชิ้น"} | บันทึกโดย ${lead.salesPerson || "ระบบ"}`
          : `ปรับปรุงยอดการใช้งานจริงประจำเดือนสำเร็จ ${noteInput ? `| โน้ต: ${noteInput}` : ""}`,
        date: new Date().toISOString(),
        type: "system" as const
      };

      const updatedLead: Lead = {
        ...lead,
        monthlyUsage: currentList,
        shipmentsPerDay: selectedMonth === currentMonthStr ? pieces : (lead.shipmentsPerDay || pieces),
        status: updatedStatus,
        behaviorStatus: updatedBehaviorStatus,
        lostReason: updatedLostReason,
        lostDate: updatedLostDate,
        timeline: [timelineEvent, ...(lead.timeline || [])],
        updatedAt: new Date().toISOString()
      };

      await onUpdateLead(updatedLead);

      setSuccessMsg(`บันทึกยอดเดือน ${formatMonthThai(selectedMonth)} ให้ "${lead.shopName}" เรียบร้อยแล้ว`);
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      console.error("Save monthly usage error:", err);
      alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div 
        id="record-monthly-usage-modal-card"
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-blue-300">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold flex items-center gap-2">
                <span>บันทึกยอดส่ง & ยอดขายรายเดือน</span>
              </h3>
              <p className="text-xs text-slate-300">
                ร้าน: <span className="font-bold text-white">{lead.shopName}</span> ({lead.customerCode || lead.salesPerson})
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
          
          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-2 font-bold animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Month Selector */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              <span>เลือกเดือนที่ต้องการบันทึก/แก้ไขข้อมูล:</span>
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => {
                const newM = e.target.value;
                setSelectedMonth(newM);
                const rec = lead.monthlyUsage?.find(r => r.month === newM);
                if (rec) {
                  setPiecesInput(String(rec.pieces));
                  setRevenueInput(String(rec.revenue));
                  setNoteInput(rec.note || "");
                  setIsLostCheck(rec.pieces === 0);
                } else {
                  setPiecesInput("0");
                  setRevenueInput("0");
                  setIsLostCheck(false);
                }
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {monthsOptions.map(m => (
                <option key={m} value={m}>
                  {formatMonthThai(m, false)} {m === currentMonthStr ? " (เดือนปัจจุบัน)" : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Pieces & Revenue Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-amber-600" />
                <span>จำนวนชิ้นพัสดุ (ชิ้น): *</span>
              </label>
              <input
                type="number"
                min="0"
                required
                value={piecesInput}
                onChange={(e) => handlePiecesChange(e.target.value)}
                placeholder="เช่น 1500"
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                * กรอก 0 ชิ้น หากลูกค้าหยุดส่งในเดือนนี้
              </span>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                <span>ยอดขายรวม (บาท):</span>
              </label>
              <input
                type="number"
                min="0"
                value={revenueInput}
                onChange={(e) => setRevenueInput(e.target.value)}
                placeholder="เช่น 45000"
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                คำนวณอัตโนมัติจากเรท หรือแก้ไขได้
              </span>
            </div>
          </div>

          {/* Quick Preset Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[10px] text-slate-400 font-bold">ปุ่มลัด:</span>
            {[
              { label: "0 ชิ้น (หยุดส่ง)", val: 0 },
              { label: "100 ชิ้น", val: 100 },
              { label: "500 ชิ้น", val: 500 },
              { label: "1,000 ชิ้น", val: 1000 },
              { label: "3,000 ชิ้น", val: 3000 }
            ].map(p => (
              <button
                key={p.val}
                type="button"
                onClick={() => handlePiecesChange(String(p.val))}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${
                  p.val === 0 
                    ? "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100" 
                    : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Lost / Churn Indicator Section */}
          {(piecesInput === "0" || isLostCheck) && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-3 animate-in fade-in">
              <div className="flex items-start gap-2 text-rose-800">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">ลูกค้ารายนี้หยุดส่งพัสดุ (ยอด 0 ชิ้น / Lost)</span>
                  <span className="text-[11px] text-rose-600 block mt-0.5">
                    ระบบจะบันทึกสถานะเป็น Lost เพื่อส่งเข้ากระบวนการวิเคราะห์สาเหตุและแจ้งเตือนเซลส์ผู้ดูแลให้โทรติดตามดึงลูกค้ากลับมา
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-rose-900 mb-1">
                  สาเหตุหลักที่ลูกค้าหยุดส่ง (Lost Reason):
                </label>
                <select
                  value={lostReason}
                  onChange={(e) => setLostReason(e.target.value)}
                  className="w-full bg-white border border-rose-300 rounded-lg px-2.5 py-1.5 text-xs text-rose-900 font-medium focus:outline-none focus:ring-1 focus:ring-rose-500"
                >
                  {LOST_REASON_PRESETS.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                  <option value="อื่นๆ (ระบุเอง)">อื่นๆ (ระบุเอง)</option>
                </select>
              </div>

              {lostReason === "อื่นๆ (ระบุเอง)" && (
                <div>
                  <input
                    type="text"
                    placeholder="กรุณาระบุสาเหตุที่ลูกค้าแจ้ง..."
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    className="w-full bg-white border border-rose-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              หมายเหตุ / บันทึกเพิ่มเติม:
            </label>
            <textarea
              rows={2}
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              placeholder="เช่น ลูกค้ามีแคมเปญ Flash Sale วันที่ 15 / รอขยายสาขา..."
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:text-slate-800 font-bold hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              ยกเลิก
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-xs transition-all cursor-pointer disabled:bg-slate-300"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>กำลังบันทึก...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>บันทึกยอดเดือน {formatMonthThai(selectedMonth)}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
