import React, { useState, useEffect } from "react";
import { 
  X, Target, Award, Users, CheckCircle, Save, 
  TrendingUp, Sparkles, DollarSign, Package, UserCheck, ShieldCheck 
} from "lucide-react";
import { SalespersonKpiTarget, SalesKpiStore, DEFAULT_KPI_TARGETS } from "../types";

interface SetKpiModalProps {
  isOpen: boolean;
  onClose: () => void;
  salespersons: string[];
  currentUser?: string | null;
  kpiTargets: SalesKpiStore;
  onSaveKpiTargets: (updated: SalesKpiStore) => Promise<boolean> | void;
}

export default function SetKpiModal({
  isOpen,
  onClose,
  salespersons,
  currentUser,
  kpiTargets,
  onSaveKpiTargets
}: SetKpiModalProps) {
  const [selectedSp, setSelectedSp] = useState<string>(salespersons[0] || "Phere");
  const [formData, setFormData] = useState<Record<string, SalespersonKpiTarget>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Initialize form state
  useEffect(() => {
    if (isOpen) {
      const initial: Record<string, SalespersonKpiTarget> = {};
      salespersons.forEach(sp => {
        const existing = kpiTargets[sp] || DEFAULT_KPI_TARGETS[sp] || {
          salesperson: sp,
          targetWonDeals: 10,
          targetRegistered: 20,
          targetActivePieces: 5000,
          targetRevenue: 200000
        };
        initial[sp] = { ...existing };
      });
      setFormData(initial);
      if (!selectedSp || !salespersons.includes(selectedSp)) {
        setSelectedSp(salespersons[0] || "Phere");
      }
      setSavedSuccess(false);
    }
  }, [isOpen, salespersons, kpiTargets]);

  if (!isOpen) return null;

  const currentTarget = formData[selectedSp] || {
    salesperson: selectedSp,
    targetWonDeals: 10,
    targetRegistered: 20,
    targetActivePieces: 5000,
    targetRevenue: 200000
  };

  const handleFieldChange = (field: keyof SalespersonKpiTarget, value: number) => {
    setFormData(prev => ({
      ...prev,
      [selectedSp]: {
        ...prev[selectedSp],
        salesperson: selectedSp,
        [field]: isNaN(value) ? 0 : Math.max(0, value)
      }
    }));
  };

  const applyPreset = (tier: "starter" | "growth" | "enterprise") => {
    let targetWon = 8;
    let targetReg = 15;
    let targetPieces = 3000;
    let targetRev = 120000;

    if (tier === "growth") {
      targetWon = 15;
      targetReg = 25;
      targetPieces = 8000;
      targetRev = 300000;
    } else if (tier === "enterprise") {
      targetWon = 25;
      targetReg = 40;
      targetPieces = 20000;
      targetRev = 750000;
    }

    setFormData(prev => ({
      ...prev,
      [selectedSp]: {
        ...prev[selectedSp],
        salesperson: selectedSp,
        targetWonDeals: targetWon,
        targetRegistered: targetReg,
        targetActivePieces: targetPieces,
        targetRevenue: targetRev
      }
    }));
  };

  const applyToAll = () => {
    const current = formData[selectedSp];
    if (!current) return;
    const updated: Record<string, SalespersonKpiTarget> = {};
    salespersons.forEach(sp => {
      updated[sp] = {
        ...current,
        salesperson: sp
      };
    });
    setFormData(updated);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload: SalesKpiStore = {};
      Object.keys(formData).forEach(sp => {
        payload[sp] = {
          ...formData[sp],
          updatedAt: new Date().toISOString(),
          updatedBy: currentUser || "ระบบ"
        };
      });
      await onSaveKpiTargets(payload);
      setSavedSuccess(true);
      setTimeout(() => {
        setIsSaving(false);
        onClose();
      }, 600);
    } catch (err) {
      console.error("Error saving KPI targets:", err);
      setIsSaving(false);
    }
  };

  return (
    <div 
      id="set-kpi-modal-backdrop" 
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        id="set-kpi-modal-container" 
        className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col my-8 max-h-[90vh]"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-5 px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600/30 border border-blue-400/30 rounded-xl text-blue-300">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">กำหนดเป้าหมาย KPI เซลล์รายบุคคล</h3>
              <p className="text-xs text-slate-300 mt-0.5">ตั้งค่า Target ยอดปิดการขาย, จำนวนสมัคร, ชิ้นพัสดุใช้งาน และยอดขาย</p>
            </div>
          </div>
          <button 
            id="close-set-kpi-modal-btn"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-700">
          
          {/* Salesperson Selector Tabs */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
              เลือกเซลส์ที่ต้องการตั้งเป้าหมาย (Select Salesperson)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {salespersons.map(sp => {
                const isSelected = selectedSp === sp;
                const spTarget = formData[sp];
                return (
                  <button
                    type="button"
                    key={sp}
                    id={`select-sp-kpi-${sp}`}
                    onClick={() => setSelectedSp(sp)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                      isSelected 
                        ? "bg-blue-50 border-blue-500 shadow-xs ring-2 ring-blue-500/20" 
                        : "bg-slate-50 hover:bg-slate-100 border-slate-200"
                    }`}
                  >
                    <div>
                      <span className={`text-xs font-bold block ${isSelected ? "text-blue-700" : "text-slate-700"}`}>
                        👤 {sp}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        เป้าปิด: {spTarget?.targetWonDeals || 0} เจ้า
                      </span>
                    </div>
                    {isSelected && <CheckCircle className="w-4 h-4 text-blue-600" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Presets for Target Settings */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                แม่แบบเป้าหมายด่วน (Quick Presets สำหรับ {selectedSp})
              </span>
              <button
                type="button"
                id="apply-kpi-to-all-btn"
                onClick={applyToAll}
                className="text-[11px] text-blue-600 hover:text-blue-800 font-bold hover:underline cursor-pointer"
              >
                คัดลอกค่านี้ไปใช้กับทุกคนในทีม
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => applyPreset("starter")}
                className="py-1.5 px-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 text-center transition-colors cursor-pointer"
              >
                🌱 เริ่มต้น (8 เจ้า/เดือน)
              </button>
              <button
                type="button"
                onClick={() => applyPreset("growth")}
                className="py-1.5 px-2 bg-white hover:bg-blue-50 border border-blue-200 rounded-lg text-xs font-bold text-blue-700 text-center transition-colors cursor-pointer shadow-3xs"
              >
                🚀 มาตรฐาน (15 เจ้า/เดือน)
              </button>
              <button
                type="button"
                onClick={() => applyPreset("enterprise")}
                className="py-1.5 px-2 bg-white hover:bg-amber-50 border border-amber-200 rounded-lg text-xs font-bold text-amber-800 text-center transition-colors cursor-pointer shadow-3xs"
              >
                👑 High Target (25 เจ้า/เดือน)
              </button>
            </div>
          </div>

          {/* Target Input Grid */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Award className="w-4 h-4 text-blue-600" />
              กำหนดตัวเลขเป้าหมายประจำเดือนของ: <span className="text-blue-600">{selectedSp}</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* 1. Target Won Deals */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-1.5 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-100 transition-all">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-bold text-slate-700 flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    เป้าปิดการขาย (Won Deals)
                  </label>
                  <span className="text-[10px] text-emerald-700 bg-emerald-50 font-bold px-1.5 py-0.5 rounded">
                    เจ้า/เดือน
                  </span>
                </div>
                <input
                  type="number"
                  id="input-target-won-deals"
                  min="0"
                  value={currentTarget.targetWonDeals || 0}
                  onChange={(e) => handleFieldChange("targetWonDeals", parseInt(e.target.value))}
                  className="w-full text-lg font-bold font-mono text-slate-800 focus:outline-none bg-transparent"
                  placeholder="เช่น 15"
                  required
                />
                <p className="text-[10px] text-slate-400">จำนวนร้านค้าที่ปิดดีลและเปิดใช้งานพอร์ตสำเร็จ</p>
              </div>

              {/* 2. Target Registered */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-1.5 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-bold text-slate-700 flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-blue-600" />
                    เป้าสมัครสมาชิก (Signups)
                  </label>
                  <span className="text-[10px] text-blue-700 bg-blue-50 font-bold px-1.5 py-0.5 rounded">
                    เจ้า/เดือน
                  </span>
                </div>
                <input
                  type="number"
                  id="input-target-registered"
                  min="0"
                  value={currentTarget.targetRegistered || 0}
                  onChange={(e) => handleFieldChange("targetRegistered", parseInt(e.target.value))}
                  className="w-full text-lg font-bold font-mono text-slate-800 focus:outline-none bg-transparent"
                  placeholder="เช่น 25"
                  required
                />
                <p className="text-[10px] text-slate-400">จำนวนร้านค้าที่กรอกข้อมูลและสมัครบัญชีผู้ใช้</p>
              </div>

              {/* 3. Target Active Pieces */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-1.5 focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-100 transition-all">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-bold text-slate-700 flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-amber-600" />
                    เป้าชิ้นพัสดุใช้งาน (Active Pieces)
                  </label>
                  <span className="text-[10px] text-amber-700 bg-amber-50 font-bold px-1.5 py-0.5 rounded">
                    ชิ้น/เดือน
                  </span>
                </div>
                <input
                  type="number"
                  id="input-target-active-pieces"
                  min="0"
                  step="100"
                  value={currentTarget.targetActivePieces || 0}
                  onChange={(e) => handleFieldChange("targetActivePieces", parseInt(e.target.value))}
                  className="w-full text-lg font-bold font-mono text-slate-800 focus:outline-none bg-transparent"
                  placeholder="เช่น 10000"
                  required
                />
                <p className="text-[10px] text-slate-400">ปริมาณพัสดุหรือชิ้นสินค้าที่ลูกค้าส่งจริง</p>
              </div>

              {/* 4. Target Revenue */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-1.5 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-bold text-slate-700 flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-indigo-600" />
                    เป้ายอดขายรวม (Revenue Target)
                  </label>
                  <span className="text-[10px] text-indigo-700 bg-indigo-50 font-bold px-1.5 py-0.5 rounded">
                    บาท/เดือน
                  </span>
                </div>
                <input
                  type="number"
                  id="input-target-revenue"
                  min="0"
                  step="1000"
                  value={currentTarget.targetRevenue || 0}
                  onChange={(e) => handleFieldChange("targetRevenue", parseInt(e.target.value))}
                  className="w-full text-lg font-bold font-mono text-slate-800 focus:outline-none bg-transparent"
                  placeholder="เช่น 300000"
                  required
                />
                <p className="text-[10px] text-slate-400">เป้ายอดขายหรือมูลค่าค่าขนส่งรวม</p>
              </div>

            </div>
          </div>

          {/* Footer Action Buttons */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              id="save-kpi-targets-submit-btn"
              disabled={isSaving}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md hover:shadow-blue-500/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>กำลังบันทึกเป้าหมาย...</span>
                </>
              ) : savedSuccess ? (
                <>
                  <CheckCircle className="w-4 h-4 text-white" />
                  <span>บันทึกสำเร็จแล้ว!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>บันทึกเป้าหมาย KPI ทั้งหมด</span>
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
