import React, { useState, useMemo } from "react";
import { Lead, LeadStatus, StatusLabels, StatusColors, TimelineItem } from "../types";
import { 
  X, Package, Plus, CheckCircle, Save, Users, Search, 
  TrendingUp, Sparkles, DollarSign, Calendar, Clock, ArrowRight 
} from "lucide-react";

interface RecordPiecesModalProps {
  isOpen: boolean;
  onClose: () => void;
  leads: Lead[];
  salespersons: string[];
  initialSalesperson?: string | null;
  onUpdateLead?: (lead: Lead) => void;
}

export default function RecordPiecesModal({
  isOpen,
  onClose,
  leads,
  salespersons,
  initialSalesperson = null,
  onUpdateLead = () => {}
}: RecordPiecesModalProps) {
  const [selectedSp, setSelectedSp] = useState<string>(initialSalesperson || salespersons[0] || "Phere");
  const [selectedLeadId, setSelectedLeadId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [pieceInput, setPieceInput] = useState<string>("");
  const [isIncrementMode, setIsIncrementMode] = useState<boolean>(true); // true = add to existing, false = replace
  const [shipmentDate, setShipmentDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [autoActivate, setAutoActivate] = useState<boolean>(true);
  const [notes, setNotes] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  // Sync initial salesperson
  React.useEffect(() => {
    if (initialSalesperson) {
      setSelectedSp(initialSalesperson);
    }
  }, [initialSalesperson]);

  // Reset or initialize lead selection when salesperson or open state changes
  React.useEffect(() => {
    if (isOpen) {
      setSuccessMessage("");
      const spLeads = leads.filter(l => l.salesPerson === selectedSp);
      if (spLeads.length > 0 && !selectedLeadId) {
        setSelectedLeadId(spLeads[0].id);
        setPieceInput(spLeads[0].shipmentsPerDay ? String(spLeads[0].shipmentsPerDay) : "500");
      }
    }
  }, [isOpen, selectedSp, leads]);

  const spLeads = useMemo(() => {
    return leads.filter(l => {
      const matchSp = selectedSp === "all" || l.salesPerson === selectedSp;
      const matchSearch = !searchQuery || 
        l.shopName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.contactName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.phone?.includes(searchQuery) ||
        l.customerCode?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchSp && matchSearch;
    });
  }, [leads, selectedSp, searchQuery]);

  const selectedLead = useMemo(() => {
    return leads.find(l => l.id === selectedLeadId) || null;
  }, [leads, selectedLeadId]);

  // Handle lead item click
  const handleSelectLead = (l: Lead) => {
    setSelectedLeadId(l.id);
    if (isIncrementMode) {
      setPieceInput("500");
    } else {
      setPieceInput(String(l.shipmentsPerDay || 0));
    }
  };

  const handleAddPreset = (amount: number) => {
    const currentVal = parseInt(pieceInput, 10) || 0;
    setPieceInput(String(currentVal + amount));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead) return;

    const piecesToAdd = parseInt(pieceInput, 10);
    if (isNaN(piecesToAdd) || piecesToAdd <= 0) {
      alert("กรุณากรอกจำนวนชิ้นที่มากกว่า 0");
      return;
    }

    setIsSaving(true);

    try {
      const currentPieces = Number(selectedLead.shipmentsPerDay) || 0;
      const newTotalPieces = isIncrementMode ? currentPieces + piecesToAdd : piecesToAdd;
      
      let nextStatus = selectedLead.status;
      if (autoActivate && (selectedLead.status === LeadStatus.REGISTERED || selectedLead.status === LeadStatus.WAITING_DOCS || selectedLead.status === LeadStatus.NEW_LEAD)) {
        nextStatus = LeadStatus.ACTIVATED;
      }

      const timelineItem: TimelineItem = {
        id: `tl_${Date.now()}`,
        title: isIncrementMode ? `📦 เพิ่มยอดส่งพัสดุ +${piecesToAdd.toLocaleString()} ชิ้น` : `📦 ปรับปรุงยอดชิ้นใช้งานเป็น ${newTotalPieces.toLocaleString()} ชิ้น`,
        description: `บันทึกยอดพัสดุใช้งานจริง (วันที่ส่ง: ${shipmentDate}) ${notes ? `| โน้ต: ${notes}` : ""}`,
        date: new Date().toISOString(),
        type: "activation",
        author: selectedSp || "System"
      };

      const updatedLead: Lead = {
        ...selectedLead,
        shipmentsPerDay: newTotalPieces,
        status: nextStatus,
        firstShipmentDate: selectedLead.firstShipmentDate || shipmentDate,
        activationDate: nextStatus === LeadStatus.ACTIVATED && !selectedLead.activationDate ? shipmentDate : selectedLead.activationDate,
        timeline: [timelineItem, ...(selectedLead.timeline || [])],
        updatedAt: new Date().toISOString()
      };

      await onUpdateLead(updatedLead);
      
      setSuccessMessage(`บันทึกจำนวนชิ้นให้ร้าน "${selectedLead.shopName}" สำเร็จ (+${piecesToAdd.toLocaleString()} ชิ้น รวมเป็น ${newTotalPieces.toLocaleString()} ชิ้น)`);
      setTimeout(() => {
        setSuccessMessage("");
      }, 3000);

      // Reset input
      if (isIncrementMode) {
        setPieceInput("500");
      }
      setNotes("");
    } catch (err) {
      console.error("Failed to save pieces:", err);
      alert("เกิดข้อผิดพลาดในการบันทึกจำนวนชิ้น");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-amber-600 to-amber-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold">บันทึก & เพิ่มจำนวนชิ้นพัสดุใช้งานจริง (Active Pieces)</h3>
              <p className="text-xs text-amber-100 mt-0.5">
                บันทึกยอดพัสดุที่ลูกค้าส่งจริงเพื่อคำนวณ KPI และความสำเร็จของทีมเซลส์
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Alert */}
        {successMessage && (
          <div className="p-3 bg-emerald-50 border-b border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Content Layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-slate-100 overflow-y-auto flex-1">
          
          {/* Left Column: Select Salesperson & Customer Lead */}
          <div className="p-4 md:col-span-5 space-y-3 bg-slate-50/50 flex flex-col">
            <label className="text-xs font-bold text-slate-700 block">
              1. เลือกเซลส์ผู้ดูแล
            </label>
            <select
              value={selectedSp}
              onChange={(e) => {
                setSelectedSp(e.target.value);
                setSelectedLeadId("");
              }}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none"
            >
              {salespersons.map(sp => (
                <option key={sp} value={sp}>👤 เซลล์ {sp}</option>
              ))}
            </select>

            <div className="pt-2">
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-bold text-slate-700">
                  2. เลือกร้านค้า / ลูกค้า ({spLeads.length})
                </label>
              </div>
              <div className="relative mb-2">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input 
                  type="text"
                  placeholder="ค้นหาชื่อร้าน / เบอร์โทร..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              {/* Lead list */}
              <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
                {spLeads.map(l => {
                  const isSelected = selectedLeadId === l.id;
                  const pieces = Number(l.shipmentsPerDay) || 0;

                  return (
                    <div
                      key={l.id}
                      onClick={() => handleSelectLead(l)}
                      className={`p-2.5 rounded-xl border transition-all cursor-pointer text-xs ${
                        isSelected 
                          ? "bg-amber-50 border-amber-300 ring-2 ring-amber-400/20 shadow-xs" 
                          : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="font-bold text-slate-800 truncate max-w-[150px]">
                          {l.shopName}
                        </div>
                        <span className="font-mono font-bold text-amber-700 text-[11px] bg-amber-100/70 px-1.5 py-0.2 rounded">
                          {pieces.toLocaleString()} ชิ้น
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                        <span>{l.phone || "-"}</span>
                        <span className={`px-1 py-0.2 rounded border ${StatusColors[l.status] || "bg-slate-100 text-slate-600"}`}>
                          {StatusLabels[l.status] || l.status}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {spLeads.length === 0 && (
                  <div className="p-6 text-center text-slate-400 text-xs bg-white rounded-xl border border-dashed border-slate-200">
                    ไม่พบรายการร้านค้าของเซลส์คนนี้
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Record Shipment Pieces Form */}
          <div className="p-5 md:col-span-7 flex flex-col justify-between">
            {selectedLead ? (
              <form onSubmit={handleSave} className="space-y-4">
                
                {/* Active Lead Summary Card */}
                <div className="bg-gradient-to-br from-amber-50/60 to-orange-50/40 p-3.5 rounded-xl border border-amber-200 text-xs space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">กำลังบันทึกยอดพัสดุให้:</span>
                    <span className="font-mono text-[11px] font-bold text-slate-700">รหัส: {selectedLead.customerCode || "รอเปิดพอร์ต"}</span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">{selectedLead.shopName}</h4>
                  <div className="flex items-center gap-3 text-slate-600 text-[11px]">
                    <span>ยอดปัจจุบัน: <strong className="font-mono text-amber-700 font-bold">{Number(selectedLead.shipmentsPerDay || 0).toLocaleString()} ชิ้น</strong></span>
                    <span>•</span>
                    <span>เซลส์: <strong>{selectedLead.salesPerson}</strong></span>
                  </div>
                </div>

                {/* Mode toggle: Add vs Replace */}
                <div className="flex items-center justify-between bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setIsIncrementMode(true)}
                    className={`flex-1 py-1.5 rounded-lg text-center transition-all cursor-pointer ${
                      isIncrementMode 
                        ? "bg-white text-amber-700 shadow-2xs font-bold" 
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    ➕ บวกเพิ่มจากยอดเดิม (+ Add)
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsIncrementMode(false)}
                    className={`flex-1 py-1.5 rounded-lg text-center transition-all cursor-pointer ${
                      !isIncrementMode 
                        ? "bg-white text-amber-700 shadow-2xs font-bold" 
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    ✏️ ระบุยอดรวมใหม่ทั้งหมด (Set Total)
                  </button>
                </div>

                {/* Number of Pieces Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex justify-between items-center">
                    <span>{isIncrementMode ? "จำนวนชิ้นที่จะบวกเพิ่ม (ชิ้น)" : "ยอดชิ้นรวมใหม่ทั้งหมด (ชิ้น)"}</span>
                    <span className="text-[11px] text-amber-600 font-bold">
                      ประมาณการยอดเงิน: ฿{((parseInt(pieceInput, 10) || 0) * 35).toLocaleString()}
                    </span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      step="1"
                      required
                      value={pieceInput}
                      onChange={(e) => setPieceInput(e.target.value)}
                      placeholder="ระบุจำนวนชิ้น เช่น 500"
                      className="w-full px-3.5 py-2.5 bg-white border-2 border-amber-300 rounded-xl text-base font-bold font-mono text-slate-900 focus:outline-none focus:ring-3 focus:ring-amber-500/20"
                    />
                    <span className="absolute right-3.5 top-3 text-xs font-bold text-slate-400">ชิ้น</span>
                  </div>

                  {/* Quick Preset Buttons */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <span className="text-[10px] text-slate-400 self-center mr-1">ปุ่มด่วน:</span>
                    {[100, 300, 500, 1000, 2000, 5000].map(amt => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => {
                          if (isIncrementMode) {
                            handleAddPreset(amt);
                          } else {
                            setPieceInput(String(amt));
                          }
                        }}
                        className="px-2 py-1 bg-slate-100 hover:bg-amber-100 hover:text-amber-800 border border-slate-200 hover:border-amber-300 rounded-lg text-[11px] font-bold font-mono text-slate-600 transition-colors cursor-pointer"
                      >
                        +{amt.toLocaleString()}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Shipment Date & Note */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" /> วันที่ส่งพัสดุ
                    </label>
                    <input
                      type="date"
                      value={shipmentDate}
                      onChange={(e) => setShipmentDate(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700">
                      หมายเหตุการส่ง / แคมเปญ
                    </label>
                    <input
                      type="text"
                      placeholder="เช่น ยอดแคมเปญ 8.8, Flash Dropoff"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                {/* Auto status update checkbox */}
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={autoActivate}
                    onChange={(e) => setAutoActivate(e.target.checked)}
                    className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500"
                  />
                  <span>ปรับสถานะเป็น <strong>"เปิดใช้งานแล้ว (Activated)"</strong> อัตโนมัติเมื่อมียอดส่ง</span>
                </label>

                {/* Submit button */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                  >
                    ปิดหน้าต่าง
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-5 py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{isSaving ? "กำลังบันทึก..." : "บันทึกจำนวนชิ้นพัสดุ"}</span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="py-20 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
                <Package className="w-8 h-8 text-slate-300" />
                <span>กรุณาเลือกร้านค้าในคอลัมน์ด้านซ้ายเพื่อเริ่มบันทึกจำนวนชิ้น</span>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
