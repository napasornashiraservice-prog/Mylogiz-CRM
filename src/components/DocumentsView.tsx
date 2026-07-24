import React, { useState } from "react";
import { Lead, Documents, StatusLabels } from "../types";
import { FileText, CheckCircle2, AlertCircle, ShieldCheck, Search, HelpCircle, ExternalLink } from "lucide-react";
import { motion } from "motion/react";

interface DocumentsViewProps {
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
  onUpdateLead: (lead: Lead) => void;
}

export default function DocumentsView({ leads, onSelectLead, onUpdateLead }: DocumentsViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDocStatus, setFilterDocStatus] = useState<"all" | "missing" | "complete">("all");

  const filteredLeads = leads.filter(l => {
    const docs = l.documents || { idCard: false, bookBank: false, companyReg: false, taxDoc: false, storefrontPhoto: false };
    const isCorporate = l.customerType === "corporate";
    const hasAll = isCorporate 
      ? (docs.idCard && docs.companyReg && docs.taxDoc && docs.storefrontPhoto)
      : (docs.idCard && docs.storefrontPhoto);
    
    const matchesSearch = 
      l.shopName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (l.contactName && l.contactName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (l.phone && l.phone.includes(searchQuery));

    const matchesStatus = 
      filterDocStatus === "all" ||
      (filterDocStatus === "complete" && hasAll) ||
      (filterDocStatus === "missing" && !hasAll);

    return matchesSearch && matchesStatus;
  });

  const handleToggleDoc = (lead: Lead, key: keyof Documents, e: React.MouseEvent) => {
    e.stopPropagation();
    const currentDocs = lead.documents || { idCard: false, bookBank: false, companyReg: false, taxDoc: false, storefrontPhoto: false };
    const updatedDocs = {
      ...currentDocs,
      [key]: !currentDocs[key]
    };
    onUpdateLead({
      ...lead,
      documents: updatedDocs
    });
  };

  const getMissingText = (lead: Lead) => {
    const docs = lead.documents || { idCard: false, bookBank: false, companyReg: false, taxDoc: false, storefrontPhoto: false };
    const isCorporate = lead.customerType === "corporate";
    const missing: string[] = [];
    if (!docs.idCard) missing.push("บัตรประชาชน");
    if (isCorporate && !docs.companyReg) missing.push("หนังสือรับรอง");
    if (isCorporate && !docs.taxDoc) missing.push("ภาษี");
    if (!docs.storefrontPhoto) missing.push("รูปหน้าร้าน");
    
    if (missing.length === 0) {
      return (
        <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded font-bold flex items-center gap-1 shrink-0 border border-emerald-200">
          <CheckCircle2 className="w-3.5 h-3.5" /> เอกสารครบถ้วน
        </span>
      );
    }
    
    return (
      <span className="text-[10px] bg-amber-50 text-amber-700 px-2.5 py-1 rounded font-bold flex items-center gap-1 shrink-0 border border-amber-200">
        <AlertCircle className="w-3.5 h-3.5" /> เหลือ {missing.join(", ")}
      </span>
    );
  };

  const getProgressPercentage = (lead: Lead) => {
    const docs = lead.documents || { idCard: false, bookBank: false, companyReg: false, taxDoc: false, storefrontPhoto: false };
    const isCorporate = lead.customerType === "corporate";
    if (isCorporate) {
      let count = 0;
      if (docs.idCard) count++;
      if (docs.companyReg) count++;
      if (docs.taxDoc) count++;
      if (docs.storefrontPhoto) count++;
      return Math.round((count / 4) * 100);
    } else {
      let count = 0;
      if (docs.idCard) count++;
      if (docs.storefrontPhoto) count++;
      return Math.round((count / 2) * 100);
    }
  };

  return (
    <div className="space-y-6" id="documents-container">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-gray-800">ศูนย์ควบคุมเอกสารการสมัครสมาชิก (Documents Portal)</h2>
        <p className="text-xs text-gray-500 mt-0.5">คัดกรอง และบันทึกสถานะเอกสารประกอบความปลอดภัย COD (บัตรประชาชน, บัญชีธนาคาร, หนังสือรับรองบริษัท, ทะเบียนภาษี)</p>
      </div>

      {/* Control bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row justify-between gap-3">
          {/* Tabs */}
          <div className="bg-slate-100 p-0.5 rounded-lg flex border border-slate-200 text-xs">
            <button
              id="doc-filter-all"
              onClick={() => setFilterDocStatus("all")}
              className={`px-4 py-1.5 rounded-md font-bold transition-all cursor-pointer ${filterDocStatus === "all" ? "bg-white text-blue-700 shadow-xs" : "text-slate-500 hover:text-slate-800"}`}
            >
              ลูกค้าทั้งหมด ({leads.length})
            </button>
            <button
              id="doc-filter-missing"
              onClick={() => setFilterDocStatus("missing")}
              className={`px-4 py-1.5 rounded-md font-bold transition-all cursor-pointer ${filterDocStatus === "missing" ? "bg-white text-blue-700 shadow-xs" : "text-slate-500 hover:text-slate-800"}`}
            >
              เอกสารยังไม่ครบ ({leads.filter(l => {
                const d = l.documents || { idCard: false, bookBank: false, companyReg: false, taxDoc: false, storefrontPhoto: false };
                const isCorp = l.customerType === "corporate";
                const hasAll = isCorp 
                  ? (d.idCard && d.companyReg && d.taxDoc && d.storefrontPhoto)
                  : (d.idCard && d.storefrontPhoto);
                return !hasAll;
              }).length})
            </button>
            <button
              id="doc-filter-complete"
              onClick={() => setFilterDocStatus("complete")}
              className={`px-4 py-1.5 rounded-md font-bold transition-all cursor-pointer ${filterDocStatus === "complete" ? "bg-white text-blue-700 shadow-xs" : "text-slate-500 hover:text-slate-800"}`}
            >
              เอกสารครบแล้ว ({leads.filter(l => {
                const d = l.documents || { idCard: false, bookBank: false, companyReg: false, taxDoc: false, storefrontPhoto: false };
                const isCorp = l.customerType === "corporate";
                const hasAll = isCorp 
                  ? (d.idCard && d.companyReg && d.taxDoc && d.storefrontPhoto)
                  : (d.idCard && d.storefrontPhoto);
                return hasAll;
              }).length})
            </button>
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:w-64">
            <input
              id="doc-search-input"
              type="text"
              placeholder="ค้นหาชื่อร้าน, เบอร์โทร..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-3 pr-8 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white text-slate-800"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
          </div>
        </div>

        {/* Audit list table */}
        <div className="overflow-x-auto pt-1">
          <table id="documents-table" className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
                <th className="p-4 pl-5">ชื่อร้านค้า / ผู้ดูแล / ประเภท</th>
                <th className="p-4">สถานะพอร์ท</th>
                <th className="p-4 text-center">สัดส่วนเอกสาร</th>
                <th className="p-4 text-center">บัตรประชาชน</th>
                <th className="p-4 text-center">Book Bank (ไม่บังคับ)</th>
                <th className="p-4 text-center">หนังสือรับรอง</th>
                <th className="p-4 text-center">ภาษี (ภพ.20)</th>
                <th className="p-4 text-center">รูปถ่ายหน้าร้าน</th>
                <th className="p-4">สถานะสรุป</th>
                <th className="p-4 text-center">เปิดดู</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLeads.map(lead => {
                const docsObj = lead.documents || { idCard: false, bookBank: false, companyReg: false, taxDoc: false, storefrontPhoto: false };
                const percentage = getProgressPercentage(lead);

                return (
                  <tr
                    key={lead.id}
                    id={`doc-row-${lead.id}`}
                    onClick={() => onSelectLead(lead)}
                    className="hover:bg-slate-50/50 cursor-pointer transition-all"
                  >
                    <td className="p-4 pl-5">
                      <div className="space-y-1">
                        <span className="font-bold text-slate-900 block">{lead.shopName}</span>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-slate-400 text-[10px]">ผู้ติดต่อ: {lead.contactName || "-"} | เซลส์: {lead.salesPerson}</span>
                          <button
                            id={`toggle-type-btn-${lead.id}`}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const newType = lead.customerType === "corporate" ? "individual" : "corporate";
                              onUpdateLead({
                                ...lead,
                                customerType: newType
                              });
                            }}
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold border transition-all cursor-pointer ${lead.customerType === "corporate" ? "bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100" : "bg-teal-50 border-teal-200 text-teal-700 hover:bg-teal-100"}`}
                            title="คลิกสลับประเภทลูกค้า (บุคคลธรรมดา / นิติบุคคล)"
                          >
                            {lead.customerType === "corporate" ? "🏢 นิติบุคคล" : "👤 บุคคลธรรมดา"} (สลับ)
                          </button>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-slate-500 font-medium">
                      {StatusLabels[lead.status]}
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col items-center justify-center gap-1.5">
                        <span className="font-mono font-bold text-slate-700">{percentage}%</span>
                        <div className="w-20 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all ${percentage === 100 ? "bg-emerald-500" : "bg-indigo-600"}`} 
                            style={{ width: `${percentage}%` }} 
                          />
                        </div>
                      </div>
                    </td>

                    {/* Interactive document cells */}
                    {[
                      { key: "idCard", idPrefix: "idcard" },
                      { key: "bookBank", idPrefix: "bookbank" },
                      { key: "companyReg", idPrefix: "companyreg" },
                      { key: "taxDoc", idPrefix: "taxdoc" },
                      { key: "storefrontPhoto", idPrefix: "storefront" }
                    ].map(cell => {
                      const isCorpOnly = ["bookBank", "companyReg", "taxDoc"].includes(cell.key);
                      const isRequired = !isCorpOnly || lead.customerType === "corporate";

                      if (!isRequired) {
                        return (
                          <td key={cell.key} className="p-4 text-center bg-slate-50/50" onClick={(e) => e.stopPropagation()}>
                            <span className="text-[10px] text-slate-400 font-medium bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">ไม่ต้องใช้</span>
                          </td>
                        );
                      }

                      const val = docsObj[cell.key as keyof Documents];
                      return (
                        <td key={cell.key} className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <button
                            id={`doc-cell-btn-${cell.idPrefix}-${lead.id}`}
                            type="button"
                            onClick={(e) => handleToggleDoc(lead, cell.key as keyof Documents, e)}
                            className={`w-6 h-6 rounded-full border flex items-center justify-center mx-auto transition-all cursor-pointer ${val ? "bg-indigo-600 border-indigo-600 text-white" : "border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 bg-white text-slate-300"}`}
                          >
                            <ShieldCheck className="w-4 h-4" />
                          </button>
                        </td>
                      );
                    })}

                    <td className="p-4">
                      {getMissingText(lead)}
                    </td>
                    <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        id={`doc-details-link-${lead.id}`}
                        onClick={() => onSelectLead(lead)}
                        className="p-1.5 border border-slate-200 hover:border-blue-200 bg-white hover:bg-blue-50 text-blue-600 rounded-lg cursor-pointer"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredLeads.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    ไม่พบข้อมูลลูกค้าสำหรับตัวกรองเอกสารนี้
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
