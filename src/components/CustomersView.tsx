import React, { useState } from "react";
import { Lead, LeadStatus, StatusLabels, StatusColors, Affiliate } from "../types";
import { generateNextCustomerCode } from "../utils/codeGenerator";
import { exportLeadsToExcel } from "../utils/crmHelpers";
import { 
  Users, UserCheck, CheckCircle2, ShieldCheck, Search, HelpCircle, 
  MapPin, Clipboard, Calendar, Tag, CreditCard, ChevronRight, Play, Award,
  Edit2, Check, X, Megaphone, Download
} from "lucide-react";
import { motion } from "motion/react";

interface CustomersViewProps {
  leads: Lead[];
  affiliates?: Affiliate[];
  onSelectLead: (lead: Lead) => void;
  onUpdateLead: (lead: Lead) => void;
}

export default function CustomersView({ leads, affiliates = [], onSelectLead, onUpdateLead }: CustomersViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | LeadStatus.REGISTERED | LeadStatus.ACTIVATED | LeadStatus.REGULAR>("all");
  const [editingRateId, setEditingRateId] = useState<string | null>(null);
  const [rateInput, setRateInput] = useState<string>("");

  const handleStartEditRate = (cust: Lead, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingRateId(cust.id);
    setRateInput(cust.ratePlan || "");
  };

  const handleSaveRate = (cust: Lead, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    onUpdateLead({
      ...cust,
      ratePlan: rateInput.trim()
    });
    setEditingRateId(null);
  };

  const handleCancelRate = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingRateId(null);
  };

  // Filter customers (only registered, activated, or regular shippers)
  const customers = leads.filter(l => 
    l.status === LeadStatus.REGISTERED || 
    l.status === LeadStatus.ACTIVATED || 
    l.status === LeadStatus.REGULAR
  );

  const filteredCustomers = customers.filter(c => {
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch = !query ||
      c.shopName.toLowerCase().includes(query) ||
      c.contactName.toLowerCase().includes(query) ||
      c.phone.includes(query) ||
      (c.customerCode && c.customerCode.toLowerCase().includes(query)) ||
      c.province.toLowerCase().includes(query) ||
      (c.affiliateId && c.affiliateId.toLowerCase().includes(query));

    const matchesStatus = statusFilter === "all" || c.status === statusFilter;

    return matchesSearch && matchesStatus;
  }).sort((a, b) => {
    // Show regular active shippers first, then newest registered/activated
    return b.status.localeCompare(a.status);
  });

  // Handle manual activation
  const handleActivatePort = (lead: Lead, e: React.MouseEvent) => {
    e.stopPropagation();
    const generatedCode = generateNextCustomerCode(leads);
    const updated: Lead = {
      ...lead,
      status: LeadStatus.ACTIVATED,
      customerCode: lead.customerCode || generatedCode,
      activationDate: lead.activationDate || new Date().toISOString().split("T")[0],
      ratePlan: lead.ratePlan || "",
      paymentType: lead.paymentType || "เติมเงิน"
    };

    // Append to timeline
    updated.timeline = [
      ...(lead.timeline || []),
      {
        id: `tl_${Date.now()}`,
        title: "อนุมัติเปิดพอร์ตลูกค้าใหม่สำเร็จ",
        description: `ฝ่ายทะเบียนเปิดใช้งานรหัสลูกค้า ${updated.customerCode}${updated.ratePlan ? ` เรทเสนอขาย ${updated.ratePlan}` : ""}`,
        date: new Date().toISOString(),
        type: "activation"
      }
    ];

    onUpdateLead(updated);
  };

  // Handle first shipment trigger
  const handleStartShipping = (lead: Lead, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated: Lead = {
      ...lead,
      status: LeadStatus.REGULAR,
      firstShipmentDate: lead.firstShipmentDate || new Date().toISOString().split("T")[0]
    };

    updated.timeline = [
      ...(lead.timeline || []),
      {
        id: `tl_${Date.now()}`,
        title: "จัดส่งพัสดุกล่องแรกสำเร็จ",
        description: "ระบบยืนยันการสแกนรับพัสดุกล่องแรกเข้าระบบเรียบร้อย ย้ายกลุ่มเป็นลูกค้าประจำ",
        date: new Date().toISOString(),
        type: "system"
      }
    ];

    onUpdateLead(updated);
  };

  // Export customers to Excel
  const handleExportCustomers = () => {
    const dateStr = new Date().toISOString().split("T")[0];
    const exportTitle = statusFilter === "all"
      ? `Mylogiz_Customers_Directory_All_${dateStr}.xlsx`
      : `Mylogiz_Customers_Directory_${statusFilter}_${dateStr}.xlsx`;
    exportLeadsToExcel(filteredCustomers, exportTitle);
  };

  return (
    <div className="space-y-6" id="customers-container">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-800">ฐานข้อมูลลูกค้าที่สมัครสำเร็จ (Customers Directory)</h2>
          <p className="text-xs text-gray-500 mt-0.5 font-sans">คลังข้อมูลแยกเฉพาะลูกค้าที่สมัครเสร็จสิ้น ตรวจเช็คประวัติการส่งพัสดุกล่องแรกและเรทราคาที่ใช้อย่างเป็นทางการ</p>
        </div>
      </div>

      {/* Control widgets */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          
          {/* Quick status filters */}
          <div className="bg-slate-100 p-0.5 rounded-lg flex border border-slate-200 text-xs overflow-x-auto">
            <button
              id="cust-tab-all"
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 rounded-md font-bold transition-all cursor-pointer whitespace-nowrap ${statusFilter === "all" ? "bg-white text-blue-700 shadow-xs" : "text-slate-500 hover:text-slate-800"}`}
            >
              ทั้งหมด ({customers.length})
            </button>
            <button
              id="cust-tab-registered"
              onClick={() => setStatusFilter(LeadStatus.REGISTERED)}
              className={`px-3 py-1.5 rounded-md font-bold transition-all cursor-pointer whitespace-nowrap ${statusFilter === LeadStatus.REGISTERED ? "bg-white text-blue-700 shadow-xs" : "text-slate-500 hover:text-slate-800"}`}
            >
              สมัครสำเร็จ ({customers.filter(c => c.status === LeadStatus.REGISTERED).length})
            </button>
            <button
              id="cust-tab-activated"
              onClick={() => setStatusFilter(LeadStatus.ACTIVATED)}
              className={`px-3 py-1.5 rounded-md font-bold transition-all cursor-pointer whitespace-nowrap ${statusFilter === LeadStatus.ACTIVATED ? "bg-white text-blue-700 shadow-xs" : "text-slate-500 hover:text-slate-800"}`}
            >
              เปิดใช้งานพอร์ต ({customers.filter(c => c.status === LeadStatus.ACTIVATED).length})
            </button>
            <button
              id="cust-tab-regular"
              onClick={() => setStatusFilter(LeadStatus.REGULAR)}
              className={`px-3 py-1.5 rounded-md font-bold transition-all cursor-pointer whitespace-nowrap ${statusFilter === LeadStatus.REGULAR ? "bg-white text-blue-700 shadow-xs" : "text-slate-500 hover:text-slate-800"}`}
            >
              ส่งเป็นประจำ ({customers.filter(c => c.status === LeadStatus.REGULAR).length})
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2.5">
            {/* Quick Search */}
            <div className="relative w-full sm:w-64">
              <input
                id="cust-search-input"
                type="text"
                placeholder="ค้นหารหัสลูกค้า, ชื่อร้าน, จังหวัด..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-3 pr-8 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white text-slate-700"
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-2 p-0.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200"
                  title="ล้างคำค้นหา"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : (
                <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
              )}
            </div>

            {/* Export Excel Button */}
            <button
              id="cust-export-excel-btn"
              type="button"
              onClick={handleExportCustomers}
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer shrink-0"
              title={`ส่งออกข้อมูลลูกค้า ${filteredCustomers.length} รายการเป็นไฟล์ Excel (.xlsx)`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Excel ({filteredCustomers.length})</span>
            </button>
          </div>

        </div>

        {/* Directory details layout table */}
        <div className="overflow-x-auto pt-1">
          <table id="customers-directory-table" className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
                <th className="p-4 pl-5">รหัสลูกค้า</th>
                <th className="p-4">ชื่อร้านค้า / จังหวัด</th>
                <th className="p-4">ประวัติการเริ่มใช้งาน</th>
                <th className="p-4">ผู้ดูแล</th>
                <th className="p-4">เรทที่เสนอ/ใช้</th>
                <th className="p-4">ชำระเงิน</th>
                <th className="p-4">สถานะการใช้งาน</th>
                <th className="p-4 text-center">จัดการด่วน</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCustomers.map(cust => {
                return (
                  <tr
                    key={cust.id}
                    id={`cust-row-${cust.id}`}
                    onClick={() => onSelectLead(cust)}
                    className="hover:bg-slate-50/50 cursor-pointer transition-colors"
                  >
                    {/* Customer Code */}
                    <td className="p-4 pl-5 font-bold text-slate-900 font-mono">
                      {cust.customerCode ? (
                        <span className="text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100 block text-center">
                          {cust.customerCode}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-normal italic">รอตั้งรหัส</span>
                      )}
                    </td>

                    {/* Shop details */}
                    <td className="p-4">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-slate-900">{cust.shopName}</span>
                          {cust.affiliateId && (
                            <span 
                              className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-50 text-purple-700 border border-purple-200 font-mono"
                              title={`ผู้แนะนำ: ${cust.affiliateId}`}
                            >
                              🤝 {cust.affiliateId}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-slate-400">
                          <MapPin className="w-3 h-3 text-slate-400" /> {cust.province}
                        </div>
                      </div>
                    </td>

                    {/* Operational Dates Checklist */}
                    <td className="p-4 text-slate-600 space-y-1">
                      <div className="flex items-center gap-1.5 text-[10px]">
                        <span className="w-3 h-3 bg-purple-100 text-purple-700 flex items-center justify-center rounded text-[8px] font-bold">1</span>
                        <span>สมัคร: {cust.registeredDate ? new Date(cust.registeredDate).toLocaleDateString("th-TH") : "-"}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px]">
                        <span className="w-3 h-3 bg-emerald-100 text-emerald-700 flex items-center justify-center rounded text-[8px] font-bold">2</span>
                        <span>เปิดระบบ: {cust.activationDate ? new Date(cust.activationDate).toLocaleDateString("th-TH") : "-"}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px]">
                        <span className="w-3 h-3 bg-yellow-100 text-yellow-700 flex items-center justify-center rounded text-[8px] font-bold">3</span>
                        <span>ส่งพัสดุแรก: {cust.firstShipmentDate ? new Date(cust.firstShipmentDate).toLocaleDateString("th-TH") : <span className="text-rose-500 font-bold">ยังไม่ส่งพัสดุ</span>}</span>
                      </div>
                    </td>

                    {/* Salesperson */}
                    <td className="p-4 text-slate-500 font-medium">{cust.salesPerson}</td>

                    {/* Rate plan (editable) */}
                    <td className="p-4 font-semibold text-slate-700" onClick={(e) => e.stopPropagation()}>
                      {editingRateId === cust.id ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={rateInput}
                            onChange={(e) => setRateInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveRate(cust);
                              if (e.key === "Escape") setEditingRateId(null);
                            }}
                            placeholder="ระบุเรทราคา"
                            className="w-32 bg-white border border-blue-400 p-1 rounded text-xs focus:outline-hidden font-sans font-normal"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={(e) => handleSaveRate(cust, e)}
                            className="p-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded cursor-pointer transition-colors"
                            title="บันทึก"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={handleCancelRate}
                            className="p-1 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded cursor-pointer transition-colors"
                            title="ยกเลิก"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div 
                          onClick={(e) => handleStartEditRate(cust, e)}
                          className="inline-flex items-center gap-1.5 cursor-pointer group hover:bg-slate-100/80 px-2 py-1 rounded-lg transition-all"
                          title="คลิกเพื่อระบุ/แก้ไขเรทราคาที่เสนอ"
                        >
                          {cust.ratePlan ? (
                            <span className="text-slate-900 font-bold">{cust.ratePlan}</span>
                          ) : (
                            <span className="text-slate-400 font-normal italic text-[11px]">ไม่ได้ระบุ (คลิกแก้ไข)</span>
                          )}
                          <Edit2 className="w-3 h-3 text-slate-300 group-hover:text-blue-600 transition-colors shrink-0" />
                        </div>
                      )}
                    </td>

                    {/* Payment type */}
                    <td className="p-4 text-slate-600">
                      <div className="flex items-center gap-1">
                        <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                        <span>{cust.paymentType || "เติมเงิน"}</span>
                      </div>
                    </td>

                    {/* Status Colors */}
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${StatusColors[cust.status]}`}>
                        {StatusLabels[cust.status]}
                      </span>
                    </td>

                    {/* Operational Trigger buttons */}
                    <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                      {cust.status === LeadStatus.REGISTERED && (
                        <button
                          id={`cust-activate-btn-${cust.id}`}
                          onClick={(e) => handleActivatePort(cust, e)}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold text-[10px] flex items-center gap-1.5 mx-auto shadow-2xs transition-colors cursor-pointer"
                        >
                          <Play className="w-3 h-3" /> เปิดใช้งานพอร์ต
                        </button>
                      )}
                      {cust.status === LeadStatus.ACTIVATED && (
                        <button
                          id={`cust-ship-btn-${cust.id}`}
                          onClick={(e) => handleStartShipping(cust, e)}
                          className="px-3 py-1 bg-yellow-500 hover:bg-yellow-400 text-slate-900 rounded font-black text-[10px] flex items-center gap-1.5 mx-auto shadow-2xs transition-colors cursor-pointer"
                        >
                          <CheckCircle2 className="w-3 h-3 text-slate-900" /> เริ่มส่งพัสดุกล่องแรก
                        </button>
                      )}
                      {cust.status === LeadStatus.REGULAR && (
                        <span className="text-emerald-700 text-[11px] font-bold flex items-center gap-1 justify-center">
                          <Award className="w-4 h-4 text-amber-500" /> ใช้งานสมบูรณ์
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filteredCustomers.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    ไม่พบข้อมูลสมาชิกตามหัวข้อการจัดสรรกลุ่มนี้
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}
