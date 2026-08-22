import React, { useState } from "react";
import { Affiliate, Lead, LeadStatus, StatusLabels, StatusColors } from "../types";
import { 
  canManageAffiliates, 
  generateNextAffiliateId, 
  isAffiliateIdUnique, 
  getAffiliateStats 
} from "../utils/affiliateHelpers";
import { 
  Users, Search, Plus, Edit2, Copy, Check, 
  Phone, MessageCircle, Calendar, ShieldCheck, 
  AlertCircle, X, Eye, CheckCircle2, ArrowUpRight, 
  Share2, Megaphone
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface AffiliatesViewProps {
  affiliates: Affiliate[];
  leads: Lead[];
  currentUser?: string | null;
  salespersons?: string[];
  onAddAffiliate: (data: Omit<Affiliate, "id" | "createdAt" | "updatedAt">) => Promise<boolean>;
  onUpdateAffiliate: (affiliate: Affiliate) => Promise<boolean>;
  onSelectLead: (lead: Lead) => void;
}

export default function AffiliatesView({
  affiliates,
  leads,
  currentUser,
  salespersons = [],
  onAddAffiliate,
  onUpdateAffiliate,
  onSelectLead
}: AffiliatesViewProps) {
  const isManagerOrAdmin = canManageAffiliates(currentUser, salespersons);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingAffiliate, setEditingAffiliate] = useState<Affiliate | null>(null);
  const [detailAffiliate, setDetailAffiliate] = useState<Affiliate | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Form State for Add / Edit
  const [formData, setFormData] = useState<{
    affiliateId: string;
    name: string;
    phone: string;
    lineId: string;
    contactChannel: string;
    status: "active" | "inactive";
    notes: string;
  }>({
    affiliateId: "",
    name: "",
    phone: "",
    lineId: "",
    contactChannel: "",
    status: "active",
    notes: ""
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter within Detail Modal
  const [detailSearchQuery, setDetailSearchQuery] = useState("");

  const handleCopyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey(null);
    }, 2000);
  };

  const handleOpenAddModal = () => {
    const nextId = generateNextAffiliateId(affiliates);
    setFormData({
      affiliateId: nextId,
      name: "",
      phone: "",
      lineId: "",
      contactChannel: "",
      status: "active",
      notes: ""
    });
    setFormError(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (aff: Affiliate, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingAffiliate(aff);
    setFormData({
      affiliateId: aff.affiliateId,
      name: aff.name,
      phone: aff.phone,
      lineId: aff.lineId || "",
      contactChannel: aff.contactChannel || "",
      status: aff.status,
      notes: aff.notes || ""
    });
    setFormError(null);
  };

  const handleSaveAffiliate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const affId = formData.affiliateId.trim().toUpperCase();
    const name = formData.name.trim();
    const phone = formData.phone.trim();

    if (!affId) {
      setFormError("กรุณาระบุ Affiliate ID");
      return;
    }
    if (!name) {
      setFormError("กรุณาระบุชื่อผู้แนะนำ / Affiliate");
      return;
    }
    if (!phone) {
      setFormError("กรุณาระบุเบอร์โทรศัพท์");
      return;
    }

    const currentDocId = editingAffiliate ? editingAffiliate.id : undefined;

    if (!isAffiliateIdUnique(affId, affiliates, currentDocId)) {
      setFormError(`รหัส Affiliate ID "${affId}" นี้มีอยู่ในระบบแล้ว กรุณาใช้รหัสอื่นที่ไม่ซ้ำ`);
      return;
    }

    setIsSubmitting(true);

    try {
      if (editingAffiliate) {
        const updated: Affiliate = {
          ...editingAffiliate,
          affiliateId: affId,
          name,
          phone,
          lineId: formData.lineId.trim(),
          contactChannel: formData.contactChannel.trim(),
          status: formData.status,
          notes: formData.notes.trim(),
          updatedAt: new Date().toISOString()
        };
        const success = await onUpdateAffiliate(updated);
        if (success) {
          setEditingAffiliate(null);
          // If we also had detail open for this affiliate, update it
          if (detailAffiliate && detailAffiliate.id === updated.id) {
            setDetailAffiliate(updated);
          }
        } else {
          setFormError("เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง");
        }
      } else {
        const success = await onAddAffiliate({
          affiliateId: affId,
          name,
          phone,
          lineId: formData.lineId.trim(),
          contactChannel: formData.contactChannel.trim(),
          status: formData.status,
          notes: formData.notes.trim()
        });
        if (success) {
          setIsAddModalOpen(false);
        } else {
          setFormError("เกิดข้อผิดพลาดในการเพิ่ม Affiliate กรุณาลองใหม่อีกครั้ง");
        }
      }
    } catch (err: any) {
      console.error(err);
      setFormError("เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter Affiliates
  const filteredAffiliates = affiliates.filter(aff => {
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch = !q || 
      aff.name.toLowerCase().includes(q) ||
      aff.affiliateId.toLowerCase().includes(q) ||
      aff.phone.includes(q) ||
      (aff.lineId && aff.lineId.toLowerCase().includes(q)) ||
      (aff.contactChannel && aff.contactChannel.toLowerCase().includes(q));

    const matchesStatus = statusFilter === "all" || aff.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Calculate Overall System Metrics for Affiliates
  const totalAffiliatesCount = affiliates.length;
  const activeAffiliatesCount = affiliates.filter(a => a.status === "active").length;
  
  // Total members referred across all affiliates
  const allReferredLeads = leads.filter(l => Boolean(l.affiliateId));
  const totalReferredCount = allReferredLeads.length;
  const totalActiveReferredCount = allReferredLeads.filter(
    l => l.status === LeadStatus.ACTIVATED || l.status === LeadStatus.REGULAR
  ).length;

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6" id="affiliates-view-container">
      
      {/* 1. Header & Action Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Megaphone className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">Affiliate Member Tracking</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            บันทึกและติดตามข้อมูลว่า Affiliate ผู้แนะนำท่านใดเป็นผู้นำพาสมาชิกและลูกค้าเข้ามาในระบบ
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="add-affiliate-btn"
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-medium rounded-xl text-xs shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>เพิ่ม Affiliate ใหม่</span>
          </button>
        </div>
      </div>

      {/* 2. Top Summary KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-xs font-medium">Affiliate ทั้งหมด</span>
            <Users className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold text-slate-800">{totalAffiliatesCount}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">ผู้แนะนำในระบบ</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-xs font-medium">สถานะเปิดใช้งาน (Active)</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-600">{activeAffiliatesCount}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">พร้อมแนะนำลูกค้า</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-xs font-medium">ลูกค้าที่แนะนำเข้ามา</span>
            <Share2 className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-blue-600">{totalReferredCount}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">สมาชิก/Lead ทั้งหมด</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-xs font-medium">ลูกค้าเปิดพอร์ต/ส่งจริง</span>
            <ShieldCheck className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-bold text-purple-600">{totalActiveReferredCount}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">ส่งของประจำ & เปิดพอร์ต</p>
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="affiliate-search-input"
            type="text"
            placeholder="ค้นหาชื่อ, เบอร์โทร, LINE, รหัส Affiliate ID (เช่น AFF0001)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="flex items-center bg-slate-100 p-1 rounded-lg text-xs w-full sm:w-auto">
            <button
              onClick={() => setStatusFilter("all")}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-md font-medium transition-all ${statusFilter === "all" ? "bg-white text-slate-800 shadow-2xs" : "text-slate-500 hover:text-slate-700"}`}
            >
              ทั้งหมด ({affiliates.length})
            </button>
            <button
              onClick={() => setStatusFilter("active")}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-md font-medium transition-all ${statusFilter === "active" ? "bg-white text-emerald-700 shadow-2xs" : "text-slate-500 hover:text-slate-700"}`}
            >
              🟢 ใช้งานอยู่ ({activeAffiliatesCount})
            </button>
            <button
              onClick={() => setStatusFilter("inactive")}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-md font-medium transition-all ${statusFilter === "inactive" ? "bg-white text-slate-700 shadow-2xs" : "text-slate-500 hover:text-slate-700"}`}
            >
              ⚪ ปิดใช้งาน ({totalAffiliatesCount - activeAffiliatesCount})
            </button>
          </div>
        </div>
      </div>

      {/* 4. Affiliates List Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {filteredAffiliates.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <Megaphone className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-slate-700 mb-1">
              {searchQuery ? "ไม่พบข้อมูล Affiliate ตามเงื่อนไขค้นหา" : "ยังไม่มีข้อมูล Affiliate ในระบบ"}
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
              {searchQuery ? "ลองเปลี่ยนคำค้นหา หรือรีเซ็ตฟิลเตอร์สถานะ" : "เริ่มต้นเพิ่มรายชื่อผู้แนะนำ Affiliate เพื่อใช้ในการติดตามลูกค้าที่ถูกแนะนำเข้ามา"}
            </p>
            {!searchQuery && (
              <button
                onClick={handleOpenAddModal}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>เพิ่ม Affiliate คนแรก</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Affiliate ID</th>
                  <th className="py-3 px-4">ชื่อผู้แนะนำ (Name)</th>
                  <th className="py-3 px-4">ข้อมูลติดต่อ</th>
                  <th className="py-3 px-4">สถานะ</th>
                  <th className="py-3 px-4 text-center">ลูกค้าที่แนะนำ</th>
                  <th className="py-3 px-4 text-center">เปิดพอร์ต / Active</th>
                  <th className="py-3 px-4">วันที่เพิ่ม</th>
                  <th className="py-3 px-4 text-right">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAffiliates.map((aff) => {
                  const stats = getAffiliateStats(aff, leads);
                  const isCopiedId = copiedKey === `id-${aff.id}`;

                  return (
                    <tr 
                      key={aff.id} 
                      id={`affiliate-row-${aff.id}`}
                      onClick={() => setDetailAffiliate(aff)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    >
                      <td className="py-3 px-4 font-medium" onClick={(e) => e.stopPropagation()}>
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 font-mono text-xs font-bold shadow-2xs">
                          <span>{aff.affiliateId}</span>
                          <button
                            onClick={() => handleCopyText(aff.affiliateId, `id-${aff.id}`)}
                            className="text-indigo-400 hover:text-indigo-700 p-0.5 rounded cursor-pointer transition-colors"
                            title="คัดลอก Affiliate ID"
                          >
                            {isCopiedId ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </td>

                      <td className="py-3 px-4 font-medium text-slate-800">
                        <div className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                          {aff.name}
                        </div>
                        {aff.notes && (
                          <p className="text-[10px] text-slate-400 truncate max-w-xs mt-0.5">{aff.notes}</p>
                        )}
                      </td>

                      <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                        <div className="space-y-1 text-[11px]">
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <a href={`tel:${aff.phone}`} className="hover:text-indigo-600 hover:underline">
                              {aff.phone}
                            </a>
                          </div>
                          {aff.lineId && (
                            <div className="flex items-center gap-1.5 text-slate-500 text-[10px]">
                              <MessageCircle className="w-3 h-3 text-emerald-500" />
                              <span>LINE: {aff.lineId}</span>
                            </div>
                          )}
                          {aff.contactChannel && (
                            <div className="text-[10px] text-slate-400">
                              ช่องทาง: {aff.contactChannel}
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        {aff.status === "active" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                            Inactive
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100">
                          {stats.totalReferred} ราย
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-lg text-xs font-bold ${stats.activeCount > 0 ? "bg-purple-50 text-purple-700 border border-purple-100" : "bg-slate-50 text-slate-400"}`}>
                          {stats.activeCount} ราย
                        </span>
                      </td>

                      <td className="py-3 px-4 text-slate-500 text-[11px] whitespace-nowrap">
                        {aff.createdAt ? new Date(aff.createdAt).toLocaleDateString("th-TH") : "-"}
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            id={`view-affiliate-${aff.id}-btn`}
                            onClick={() => setDetailAffiliate(aff)}
                            className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-medium"
                            title="ดูรายชื่อสมาชิกที่แนะนำ"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>ดูสมาชิก</span>
                          </button>
                          
                          <button
                            id={`edit-affiliate-${aff.id}-btn`}
                            onClick={(e) => handleOpenEditModal(aff, e)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="แก้ไขข้อมูล Affiliate"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. Add / Edit Affiliate Modal */}
      <AnimatePresence>
        {(isAddModalOpen || editingAffiliate) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden"
            >
              {/* Modal Header */}
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-indigo-100 text-indigo-700">
                    <Megaphone className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-800">
                      {editingAffiliate ? "แก้ไขข้อมูล Affiliate" : "เพิ่ม Affiliate / ผู้แนะนำใหม่"}
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      กรอกข้อมูลผู้แนะนำเพื่อเชื่อมโยงกับสมาชิกลูกค้า
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingAffiliate(null);
                  }}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form Content */}
              <form onSubmit={handleSaveAffiliate} className="p-5 space-y-4 text-xs">
                {formError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Affiliate ID <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.affiliateId}
                      onChange={(e) => setFormData({ ...formData, affiliateId: e.target.value.toUpperCase() })}
                      placeholder="เช่น AFF0001"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold text-indigo-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-hidden"
                      required
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">รหัสประจำตัวผู้แนะนำ (เช่น AFF0001)</span>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">สถานะ</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as "active" | "inactive" })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-hidden"
                    >
                      <option value="active">🟢 Active (เปิดใช้งาน)</option>
                      <option value="inactive">⚪ Inactive (ปิดใช้งานชั่วคราว)</option>
                    </select>
                    <span className="text-[10px] text-slate-400 mt-0.5 block">สถานะการรับสมาชิก</span>
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    ชื่อผู้แนะนำ / Affiliate <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="เช่น คุณสมชาย ค้าขายดี หรือ เพจรีวิวขนส่ง"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-hidden"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      เบอร์โทรศัพท์ <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="เช่น 0812345678"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-hidden"
                      required
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">LINE ID</label>
                    <input
                      type="text"
                      value={formData.lineId}
                      onChange={(e) => setFormData({ ...formData, lineId: e.target.value })}
                      placeholder="เช่น @affiliate99"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">ช่องทางติดต่อ / แหล่งที่มา</label>
                  <input
                    type="text"
                    value={formData.contactChannel}
                    onChange={(e) => setFormData({ ...formData, contactChannel: e.target.value })}
                    placeholder="เช่น TikTok, Facebook Group, แนะนำต่อ"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">หมายเหตุเพิ่มเติม</label>
                  <textarea
                    rows={2}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="บันทึกข้อตกลง หรือเงื่อนไขเพิ่มเติม..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-hidden"
                  />
                </div>

                {/* Modal Footer */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddModalOpen(false);
                      setEditingAffiliate(null);
                    }}
                    className="px-3.5 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-medium transition-colors"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-medium rounded-xl transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmitting ? "กำลังบันทึก..." : editingAffiliate ? "บันทึกการแก้ไข" : "ยืนยันเพิ่ม Affiliate"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 6. Affiliate Detail Modal (หน้ารายละเอียด Affiliate & สมาชิกที่แนะนำ) */}
      <AnimatePresence>
        {detailAffiliate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden"
            >
              {/* Detail Header */}
              <div className="p-5 border-b border-slate-100 bg-slate-50/70 flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-base shrink-0 shadow-xs">
                    {detailAffiliate.name.substring(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-base font-bold text-slate-800">{detailAffiliate.name}</h2>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-indigo-50 border border-indigo-200 text-indigo-700 font-mono text-xs font-bold">
                        {detailAffiliate.affiliateId}
                      </span>
                      {detailAffiliate.status === "active" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                          Inactive
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-xs text-slate-500 mt-1.5 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <a href={`tel:${detailAffiliate.phone}`} className="hover:text-indigo-600 hover:underline">
                          {detailAffiliate.phone}
                        </a>
                      </span>
                      {detailAffiliate.lineId && (
                        <span className="flex items-center gap-1">
                          <MessageCircle className="w-3.5 h-3.5 text-emerald-500" />
                          LINE: {detailAffiliate.lineId}
                        </span>
                      )}
                      {detailAffiliate.contactChannel && (
                        <span className="text-slate-400">
                          ช่องทาง: {detailAffiliate.contactChannel}
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-slate-400">
                        <Calendar className="w-3.5 h-3.5" />
                        เพิ่มเมื่อ {detailAffiliate.createdAt ? new Date(detailAffiliate.createdAt).toLocaleDateString("th-TH") : "-"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenEditModal(detailAffiliate)}
                    className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-white rounded-lg border border-slate-200 text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>แก้ไข</span>
                  </button>
                  <button
                    onClick={() => setDetailAffiliate(null)}
                    className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Detail KPI Summary Stats */}
              {(() => {
                const stats = getAffiliateStats(detailAffiliate, leads);
                const filteredReferred = stats.referredLeads.filter(l => {
                  const q = detailSearchQuery.trim().toLowerCase();
                  if (!q) return true;
                  return (
                    l.shopName?.toLowerCase().includes(q) ||
                    l.contactName?.toLowerCase().includes(q) ||
                    l.phone?.includes(q) ||
                    l.customerCode?.toLowerCase().includes(q) ||
                    l.salesPerson?.toLowerCase().includes(q)
                  );
                });

                return (
                  <div className="p-5 overflow-y-auto flex-1 space-y-5">
                    {/* 4 Stat Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                        <span className="text-[11px] font-medium text-slate-500 block">สมาชิกที่แนะนำทั้งหมด</span>
                        <span className="text-xl font-bold text-slate-800 block mt-1">{stats.totalReferred}</span>
                        <span className="text-[10px] text-slate-400">รวมทุกขั้นตอนใน CRM</span>
                      </div>

                      <div className="bg-blue-50/50 p-3.5 rounded-xl border border-blue-100">
                        <span className="text-[11px] font-medium text-blue-700 block">อยู่ระหว่างติดตาม (Pipeline)</span>
                        <span className="text-xl font-bold text-blue-800 block mt-1">{stats.pipelineCount}</span>
                        <span className="text-[10px] text-blue-600/80">Lead ใหม่ & เสนอราคา</span>
                      </div>

                      <div className="bg-emerald-50/50 p-3.5 rounded-xl border border-emerald-100">
                        <span className="text-[11px] font-medium text-emerald-700 block">สมัครสมาชิกสำเร็จ</span>
                        <span className="text-xl font-bold text-emerald-800 block mt-1">{stats.registeredCount}</span>
                        <span className="text-[10px] text-emerald-600/80">ปิดการขาย & อนุมัติเอกสาร</span>
                      </div>

                      <div className="bg-purple-50/50 p-3.5 rounded-xl border border-purple-100">
                        <span className="text-[11px] font-medium text-purple-700 block">เปิดใช้งานแล้ว (Active)</span>
                        <span className="text-xl font-bold text-purple-800 block mt-1">{stats.activeCount}</span>
                        <span className="text-[10px] text-purple-600/80">มีรหัสลูกค้า & ส่งของประจำ</span>
                      </div>
                    </div>

                    {/* Table Section */}
                    <div>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-sm text-slate-800">
                            รายชื่อสมาชิกที่แนะนำเข้ามา ({stats.referredLeads.length} รายการ)
                          </h3>
                        </div>

                        <div className="relative w-full sm:w-64">
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            placeholder="ค้นหาร้านค้า, ชื่อ, เบอร์โทร..."
                            value={detailSearchQuery}
                            onChange={(e) => setDetailSearchQuery(e.target.value)}
                            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                      </div>

                      {filteredReferred.length === 0 ? (
                        <div className="text-center py-10 bg-slate-50 rounded-xl border border-slate-200">
                          <p className="text-xs text-slate-500">
                            {stats.referredLeads.length === 0 
                              ? "ยังไม่มีสมาชิกลูกค้าที่ผูกกับรหัสผู้แนะนำนี้" 
                              : "ไม่พบข้อมูลที่ตรงกับคำค้นหา"}
                          </p>
                          <p className="text-[11px] text-slate-400 mt-1">
                            สามารถเลือกรหัสผู้แนะนำนี้ได้ในหน้ารายละเอียด Lead หรือเมื่อเพิ่ม Lead ใหม่
                          </p>
                        </div>
                      ) : (
                        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold text-[11px]">
                                <th className="py-2.5 px-3">รหัสสมาชิก / Lead ID</th>
                                <th className="py-2.5 px-3">ชื่อร้านค้า / ผู้ติดต่อ</th>
                                <th className="py-2.5 px-3">เบอร์โทร</th>
                                <th className="py-2.5 px-3">สถานะในระบบ</th>
                                <th className="py-2.5 px-3">เซลส์ผู้ดูแล</th>
                                <th className="py-2.5 px-3">วันที่เพิ่ม</th>
                                <th className="py-2.5 px-3 text-right">เปิดดู</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {filteredReferred.map((lead) => {
                                const statusColorClass = StatusColors[lead.status] || "bg-slate-100 text-slate-700";
                                return (
                                  <tr
                                    key={lead.id}
                                    onClick={() => {
                                      onSelectLead(lead);
                                    }}
                                    className="hover:bg-indigo-50/50 transition-colors cursor-pointer"
                                  >
                                    <td className="py-2.5 px-3 font-mono">
                                      {lead.customerCode ? (
                                        <span className="font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                                          {lead.customerCode}
                                        </span>
                                      ) : (
                                        <span className="text-slate-400 text-[10px]">
                                          {lead.id.substring(0, 8)}
                                        </span>
                                      )}
                                    </td>

                                    <td className="py-2.5 px-3">
                                      <div className="font-bold text-slate-800">{lead.shopName || "-"}</div>
                                      <div className="text-[10px] text-slate-400">{lead.contactName || "-"}</div>
                                    </td>

                                    <td className="py-2.5 px-3 text-slate-600 font-mono">
                                      {lead.phone || "-"}
                                    </td>

                                    <td className="py-2.5 px-3">
                                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${statusColorClass}`}>
                                        {StatusLabels[lead.status] || lead.status}
                                      </span>
                                    </td>

                                    <td className="py-2.5 px-3 text-slate-600 font-medium">
                                      {lead.salesPerson || "-"}
                                    </td>

                                    <td className="py-2.5 px-3 text-slate-400 text-[10px] whitespace-nowrap">
                                      {lead.createdAt ? new Date(lead.createdAt).toLocaleDateString("th-TH") : "-"}
                                    </td>

                                    <td className="py-2.5 px-3 text-right">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onSelectLead(lead);
                                        }}
                                        className="p-1 text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                                        title="เปิดหน้ารายละเอียด Lead/Customer"
                                      >
                                        <ArrowUpRight className="w-3.5 h-3.5" />
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Detail Footer */}
              <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
                <button
                  onClick={() => setDetailAffiliate(null)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium rounded-xl text-xs transition-colors cursor-pointer"
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
