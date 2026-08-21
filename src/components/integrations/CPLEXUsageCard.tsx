import React, { useState, useEffect } from "react";
import { 
  Server, DollarSign, ShoppingBag, Package, Hash, 
  Calendar, RefreshCw, AlertTriangle, CheckCircle2, 
  Clock, ShieldAlert, ArrowUpRight, ExternalLink, Settings,
  CreditCard, Truck, Layers, Edit2, Check, X
} from "lucide-react";
import { 
  Lead, 
  CPLEXUsageSummary, 
  CPLEXDateRangeType, 
  CPLEXIntegrationConfig 
} from "../../types";
import { cplexService } from "../../integrations/cplex/cplexService";

interface CPLEXUsageCardProps {
  lead: Lead;
  onUpdateLead?: (updatedLead: Lead) => void;
  onOpenSettings?: () => void;
}

export default function CPLEXUsageCard({
  lead,
  onUpdateLead,
  onOpenSettings
}: CPLEXUsageCardProps) {
  const [config, setConfig] = useState<CPLEXIntegrationConfig | null>(null);
  const [usage, setUsage] = useState<CPLEXUsageSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConfigured, setIsConfigured] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [dateRangeType, setDateRangeType] = useState<CPLEXDateRangeType>("30days");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showCustomDate, setShowCustomDate] = useState(false);

  // External Customer ID editing state
  const [isEditingExternalId, setIsEditingExternalId] = useState(false);
  const [externalIdInput, setExternalIdInput] = useState(lead.externalCustomerId || "");

  useEffect(() => {
    fetchUsageData();
  }, [lead.id, lead.customerCode, lead.phone, lead.externalCustomerId, dateRangeType]);

  const fetchUsageData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const cfg = await cplexService.getConfig();
      setConfig(cfg);

      if (!cfg.isEnabled || !cfg.baseUrl || !cfg.hasToken || cfg.status === "disconnected" || cfg.status === "waiting_for_api") {
        setIsConfigured(false);
        setIsLoading(false);
        return;
      }

      setIsConfigured(true);

      const res = await cplexService.getCustomerUsage(
        lead.id,
        lead.customerCode,
        lead.phone,
        undefined,
        lead.externalCustomerId,
        {
          type: dateRangeType,
          startDate: showCustomDate ? startDate : undefined,
          endDate: showCustomDate ? endDate : undefined
        }
      );

      if (res.success && res.usage) {
        setUsage(res.usage);
      } else {
        setUsage(null);
        setErrorMessage(res.errorMessage || "ไม่พบข้อมูลการใช้งานของลูกค้ารายนี้บนระบบ CPLEX");
      }
    } catch (err: any) {
      console.error("Error fetching CPLEX usage:", err);
      setErrorMessage(err.message || "ไม่สามารถดึงข้อมูลจากระบบ Mylogiz CPLEX ได้");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveExternalId = () => {
    if (onUpdateLead) {
      onUpdateLead({
        ...lead,
        externalCustomerId: externalIdInput.trim() || undefined
      });
    }
    setIsEditingExternalId(false);
  };

  const handleDateRangeSelect = (type: CPLEXDateRangeType) => {
    setDateRangeType(type);
    if (type === "custom") {
      setShowCustomDate(true);
    } else {
      setShowCustomDate(false);
    }
  };

  const formatCurrency = (val?: number) => {
    if (val === undefined || val === null) return "฿0";
    return `฿${val.toLocaleString("th-TH", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  };

  const formatNumber = (val?: number) => {
    if (val === undefined || val === null) return "0";
    return val.toLocaleString("th-TH");
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "-";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const thaiYear = d.getFullYear() + 543;
      return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${thaiYear}`;
    } catch {
      return dateStr;
    }
  };

  return (
    <div 
      className="bg-white rounded-2xl border border-indigo-100 shadow-xs overflow-hidden"
      id="cplex-usage-section"
    >
      
      {/* Header */}
      <div className="p-4.5 bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-500/20 border border-indigo-400/30 rounded-xl text-indigo-300">
            <Server className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-white">ข้อมูลการใช้งาน Mylogiz CPLEX</h3>
              
              {/* Status Badge */}
              {isConfigured ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  เชื่อมต่อแล้ว
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-400/30 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  รอการตั้งค่า API
                </span>
              )}
            </div>
            <p className="text-xs text-indigo-200/80 mt-0.5">
              ดึงข้อมูลยอดขาย จำนวนออเดอร์ พัสดุ และ COD จากระบบหลังบ้าน CPLEX
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* External ID mapping badge */}
          <div className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-lg text-xs border border-white/10">
            <span className="text-[10px] text-slate-300">CPLEX ID:</span>
            {isEditingExternalId ? (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={externalIdInput}
                  onChange={(e) => setExternalIdInput(e.target.value)}
                  placeholder="รหัส CPLEX"
                  className="px-1.5 py-0.5 bg-white text-slate-900 rounded text-[11px] font-mono w-24 focus:outline-none"
                  autoFocus
                />
                <button 
                  onClick={handleSaveExternalId} 
                  className="p-0.5 hover:text-emerald-400"
                  title="บันทึก"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={() => setIsEditingExternalId(false)} 
                  className="p-0.5 hover:text-rose-400"
                  title="ยกเลิก"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 font-mono font-bold text-indigo-200">
                <span>{lead.externalCustomerId || lead.customerCode || "ไม่ระบุ"}</span>
                {onUpdateLead && (
                  <button 
                    onClick={() => {
                      setExternalIdInput(lead.externalCustomerId || "");
                      setIsEditingExternalId(true);
                    }}
                    className="p-0.5 text-slate-300 hover:text-white"
                    title="แก้ไขรหัส CPLEX"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Refresh Button */}
          <button
            onClick={fetchUsageData}
            disabled={isLoading}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors disabled:opacity-50"
            title="รีเฟรชข้อมูล CPLEX"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Date Range Selector Toolbar */}
      {isConfigured && (
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: "today", label: "วันนี้" },
              { id: "yesterday", label: "เมื่อวาน" },
              { id: "7days", label: "7 วัน" },
              { id: "30days", label: "30 วัน" },
              { id: "thisMonth", label: "เดือนนี้" },
              { id: "lastMonth", label: "เดือนที่แล้ว" },
              { id: "custom", label: "กำหนดเอง" },
            ].map((range) => (
              <button
                key={range.id}
                onClick={() => handleDateRangeSelect(range.id as CPLEXDateRangeType)}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer whitespace-nowrap ${
                  dateRangeType === range.id
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200"
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>

          {/* Custom Date Inputs if 'custom' is active */}
          {showCustomDate && (
            <div className="flex items-center gap-2 pt-1 sm:pt-0">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2 py-1 bg-white border border-slate-200 rounded text-xs text-slate-700"
              />
              <span className="text-slate-400 text-xs">ถึง</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2 py-1 bg-white border border-slate-200 rounded text-xs text-slate-700"
              />
              <button
                onClick={fetchUsageData}
                className="px-2.5 py-1 bg-indigo-600 text-white rounded text-xs font-bold hover:bg-indigo-700"
              >
                ค้นหา
              </button>
            </div>
          )}
        </div>
      )}

      {/* Main Content Body */}
      <div className="p-4 sm:p-5">
        
        {/* Case 1: Not Configured State */}
        {!isConfigured && !isLoading && (
          <div className="p-6 bg-indigo-50/50 rounded-xl border border-indigo-100 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center mx-auto">
              <Server className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-slate-800 text-sm">รอการตั้งค่า API Mylogiz CPLEX</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                ระบบเชื่อมต่อและ UI พร้อมใช้งานแล้ว ขณะนี้รอการระบุ API Key / Secret Token จริงจากระบบ Mylogiz CPLEX
                เมื่อนำ Credential มาใส่ในหน้า Settings หรือ Environment Variables ระบบจะดึงยอดขาย ออเดอร์ พัสดุ และ COD มาแสดงผลทันที
              </p>
            </div>
            {onOpenSettings && (
              <button
                onClick={onOpenSettings}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 transition-colors cursor-pointer shadow-xs"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>ไปที่หน้าตั้งค่าเชื่อมต่อ CPLEX</span>
              </button>
            )}
          </div>
        )}

        {/* Case 2: Loading State */}
        {isLoading && (
          <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
            <span className="text-xs font-semibold">กำลังดึงข้อมูลการใช้งานจาก Mylogiz CPLEX...</span>
          </div>
        )}

        {/* Case 3: Error State */}
        {!isLoading && isConfigured && errorMessage && (
          <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-bold text-amber-900">แจ้งเตือนจากระบบ CPLEX</div>
              <p className="mt-0.5 text-amber-800">{errorMessage}</p>
              <div className="mt-2 flex items-center gap-2">
                <button
                  onClick={fetchUsageData}
                  className="px-2.5 py-1 bg-amber-200/80 hover:bg-amber-300 text-amber-900 font-bold rounded-lg text-[11px]"
                >
                  ลองใหม่อีกครั้ง
                </button>
                {onOpenSettings && (
                  <button
                    onClick={onOpenSettings}
                    className="px-2.5 py-1 bg-white border border-amber-300 text-amber-900 font-bold rounded-lg text-[11px]"
                  >
                    ตรวจสอบการตั้งค่า
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Case 4: Usage Metrics Grid */}
        {!isLoading && isConfigured && usage && (
          <div className="space-y-4">
            
            {/* 8 Primary Usage Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              
              {/* 1. Total Sales */}
              <div className="p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-200">
                <div className="flex items-center justify-between text-emerald-700 mb-1">
                  <span className="text-[11px] font-bold">ยอดขายรวม</span>
                  <DollarSign className="w-4 h-4" />
                </div>
                <div className="text-base sm:text-lg font-black text-emerald-900 font-mono">
                  {formatCurrency(usage.totalSales)}
                </div>
                <div className="text-[10px] text-emerald-600 mt-0.5">ช่วงเวลาที่เลือก</div>
              </div>

              {/* 2. Total Orders */}
              <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-200">
                <div className="flex items-center justify-between text-blue-700 mb-1">
                  <span className="text-[11px] font-bold">จำนวนออเดอร์</span>
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <div className="text-base sm:text-lg font-black text-blue-900 font-mono">
                  {formatNumber(usage.totalOrder)} <span className="text-xs font-normal">รายการ</span>
                </div>
                <div className="text-[10px] text-blue-600 mt-0.5">ออเดอร์ทั้งหมด</div>
              </div>

              {/* 3. Total Shipments */}
              <div className="p-3.5 bg-indigo-50/60 rounded-xl border border-indigo-200">
                <div className="flex items-center justify-between text-indigo-700 mb-1">
                  <span className="text-[11px] font-bold">จำนวนพัสดุ</span>
                  <Package className="w-4 h-4" />
                </div>
                <div className="text-base sm:text-lg font-black text-indigo-900 font-mono">
                  {formatNumber(usage.totalShipment)} <span className="text-xs font-normal">ชิ้น</span>
                </div>
                <div className="text-[10px] text-indigo-600 mt-0.5">พัสดุที่จัดส่งแล้ว</div>
              </div>

              {/* 4. Total Items */}
              <div className="p-3.5 bg-purple-50/60 rounded-xl border border-purple-200">
                <div className="flex items-center justify-between text-purple-700 mb-1">
                  <span className="text-[11px] font-bold">จำนวนชิ้นสินค้า</span>
                  <Layers className="w-4 h-4" />
                </div>
                <div className="text-base sm:text-lg font-black text-purple-900 font-mono">
                  {formatNumber(usage.totalItems)} <span className="text-xs font-normal">ชิ้น</span>
                </div>
                <div className="text-[10px] text-purple-600 mt-0.5">รวมสินค้าในออเดอร์</div>
              </div>

              {/* 5. Total COD */}
              <div className="p-3.5 bg-amber-50/60 rounded-xl border border-amber-200">
                <div className="flex items-center justify-between text-amber-700 mb-1">
                  <span className="text-[11px] font-bold">ยอด COD เก็บเงินปลายทาง</span>
                  <CreditCard className="w-4 h-4" />
                </div>
                <div className="text-base sm:text-lg font-black text-amber-900 font-mono">
                  {formatCurrency(usage.totalCod)}
                </div>
                <div className="text-[10px] text-amber-600 mt-0.5">ยอดเก็บเงินปลายทาง</div>
              </div>

              {/* 6. Total Shipping Cost */}
              <div className="p-3.5 bg-rose-50/60 rounded-xl border border-rose-200">
                <div className="flex items-center justify-between text-rose-700 mb-1">
                  <span className="text-[11px] font-bold">ค่าขนส่งรวม</span>
                  <Truck className="w-4 h-4" />
                </div>
                <div className="text-base sm:text-lg font-black text-rose-900 font-mono">
                  {formatCurrency(usage.totalShippingCost)}
                </div>
                <div className="text-[10px] text-rose-600 mt-0.5">ค่าส่งตามบิล</div>
              </div>

              {/* 7. Last Activity Date */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between text-slate-700 mb-1">
                  <span className="text-[11px] font-bold">วันที่ใช้งานล่าสุด</span>
                  <Clock className="w-4 h-4" />
                </div>
                <div className="text-sm sm:text-base font-black text-slate-800 font-mono">
                  {formatDate(usage.lastActivityDate)}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">กิจกรรมบน CPLEX</div>
              </div>

              {/* 8. Last Shipment Date */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between text-slate-700 mb-1">
                  <span className="text-[11px] font-bold">วันที่ส่งพัสดุล่าสุด</span>
                  <Calendar className="w-4 h-4" />
                </div>
                <div className="text-sm sm:text-base font-black text-slate-800 font-mono">
                  {formatDate(usage.lastShipmentDate)}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">สร้างบิลส่งล่าสุด</div>
              </div>

            </div>

            {/* Carrier Breakdown if available */}
            {usage.carrierBreakdown && Object.keys(usage.carrierBreakdown).length > 0 && (
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <div className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-indigo-600" />
                  <span>สัดส่วนการจัดส่งแยกตามขนส่ง (Carrier Distribution):</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(usage.carrierBreakdown).map(([carrier, count]) => (
                    <div key={carrier} className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs flex items-center gap-2">
                      <span className="font-bold uppercase text-slate-700">{carrier}</span>
                      <span className="px-1.5 py-0.2 bg-indigo-50 text-indigo-700 rounded font-mono font-bold text-[11px]">
                        {count} ชิ้น
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}

      </div>

    </div>
  );
}
