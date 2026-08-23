import React, { useState } from "react";
import { 
  Lead, LeadStatus, StatusLabels, StatusColors, 
  THAI_PROVINCES, TRANSPORT_CARRIERS, PRESET_TAG_CATEGORIES, TimelineItem,
  Affiliate
} from "../types";
import { 
  Plus, Search, SlidersHorizontal, Check, Star, Filter, 
  MapPin, Phone, MessageSquare, ArrowRight, Kanban, ListFilter,
  X, Calendar, Clock, ShoppingBag, Download, Megaphone,
  Tag as TagIcon, Layers, PhoneCall, AlertCircle, Lock,
  FileSpreadsheet, Upload, CheckCircle2, XCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import CampaignManagerModal from "./CampaignManagerModal";
import ImportLeadsModal from "./ImportLeadsModal";
import StatusReasonModal from "./StatusReasonModal";
import TagFilterDropdown from "./TagFilterDropdown";
import TagPill from "./TagPill";
import LeadCardTags from "./LeadCardTags";
import AffiliateSelectCombobox from "./AffiliateSelectCombobox";
import { exportLeadsToExcel, getFollowUpStatus, getTagInfo, canManageTags } from "../utils/crmHelpers";

interface LeadsViewProps {
  leads: Lead[];
  salespersons?: string[];
  campaigns?: string[];
  affiliates?: Affiliate[];
  onAddCampaign?: (name: string) => Promise<void>;
  onDeleteCampaign?: (name: string) => Promise<void>;
  currentUser?: string | null;
  onAddLead: (lead: Omit<Lead, "id" | "createdAt" | "updatedAt" | "timeline" | "calls" | "files">) => void;
  onBatchAddLeads?: (leadsData: Omit<Lead, "id" | "createdAt" | "updatedAt" | "timeline" | "calls" | "files">[]) => Promise<{ success: boolean; count: number }>;
  onUpdateLeadStatus: (
    id: string, 
    newStatus: LeadStatus,
    reasonData?: {
      wonReason?: string;
      wonReasonOther?: string;
      lostReason?: string;
      lostReasonOther?: string;
    }
  ) => void;
  onSelectLead: (lead: Lead) => void;
  onUpdateLead?: (updatedLead: Lead) => void;
  onDeleteLead?: (leadId: string) => Promise<boolean> | void;
}

const ALL_CHANNELS = ["Facebook", "TikTok", "Website", "Line OA", "โทรเข้า", "คนแนะนำ", "หาเอง"];
const ALL_PROVINCES = THAI_PROVINCES;

export default function LeadsView({ 
  leads, 
  salespersons = [], 
  campaigns = [],
  affiliates = [],
  onAddCampaign,
  onDeleteCampaign,
  currentUser, 
  onAddLead, 
  onBatchAddLeads,
  onUpdateLeadStatus, 
  onSelectLead, 
  onUpdateLead, 
  onDeleteLead 
}: LeadsViewProps) {
  const isTagAdmin = canManageTags(currentUser, salespersons);

  // UI views: "kanban" or "list"
  const [viewType, setViewType] = useState<"kanban" | "list">("kanban");
  
  // Search and Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedSalesperson, setSelectedSalesperson] = useState<string>("all");
  const [selectedChannel, setSelectedChannel] = useState("all");
  const [selectedCampaign, setSelectedCampaign] = useState<string>("all");
  const [selectedAffiliate, setSelectedAffiliate] = useState<string>("all");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagMatchMode, setTagMatchMode] = useState<"ANY" | "ALL">("ANY");
  const [selectedFollowUpStatus, setSelectedFollowUpStatus] = useState<string>("all");
  const [selectedProvince, setSelectedProvince] = useState("all");
  const [selectedScore, setSelectedScore] = useState<number | "all">("all");
  const [showFilters, setShowFilters] = useState(false);
  const [showCampaignManagerModal, setShowCampaignManagerModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  // Add Lead Modal State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newCustomerType, setNewCustomerType] = useState<"individual" | "corporate">("individual");
  const [newShopName, setNewShopName] = useState("");
  const [newContactName, setNewContactName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newLineId, setNewLineId] = useState("");
  const [newFacebook, setNewFacebook] = useState("");
  const [newProvince, setNewProvince] = useState("กรุงเทพมหานคร");
  const [newChannel, setNewChannel] = useState("Facebook");
  const [newCampaign, setNewCampaign] = useState("");
  const [newAffiliateId, setNewAffiliateId] = useState("");
  const [newTags, setNewTags] = useState<string[]>([]);
  const [newScore, setNewScore] = useState(3);
  const [newAddress, setNewAddress] = useState("");
  const [newPreferredTransport, setNewPreferredTransport] = useState<string[]>(["Flash"]);
  const [newShipmentsPerDay, setNewShipmentsPerDay] = useState(10);
  const [newCompetitor, setNewCompetitor] = useState("");
  const [newSalesPerson, setNewSalesPerson] = useState("");
  const [initialNote, setInitialNote] = useState("");

  // All distinct tags collected from preset and existing leads
  const allKnownTags = Array.from(
    new Set([
      ...PRESET_TAG_CATEGORIES.flatMap(c => c.tags),
      ...leads.flatMap(l => l.tags || [])
    ])
  ).filter(Boolean);

  React.useEffect(() => {
    if (currentUser) {
      setNewSalesPerson(currentUser);
    } else if (salespersons.length > 0 && !newSalesPerson) {
      setNewSalesPerson(salespersons[0]);
    }
  }, [salespersons, currentUser, newSalesPerson]);

  // Filtered Leads
  const filteredLeads = leads.filter(l => {
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch = !query || 
      (l.shopName && l.shopName.toLowerCase().includes(query)) ||
      (l.contactName && l.contactName.toLowerCase().includes(query)) ||
      (l.phone && l.phone.includes(query)) ||
      (l.lineId && l.lineId.toLowerCase().includes(query)) ||
      (l.province && l.province.toLowerCase().includes(query)) ||
      (l.customerCode && l.customerCode.toLowerCase().includes(query)) ||
      (l.facebook && l.facebook.toLowerCase().includes(query)) ||
      (l.affiliateId && l.affiliateId.toLowerCase().includes(query));

    const matchesStatus = selectedStatus === "all" || l.status === selectedStatus;
    const matchesChannel = selectedChannel === "all" || l.channel === selectedChannel;
    const matchesCampaign = selectedCampaign === "all" || l.campaign === selectedCampaign;
    const matchesAffiliate = selectedAffiliate === "all" || 
      (selectedAffiliate === "none" ? !l.affiliateId : l.affiliateId === selectedAffiliate);
    const matchesProvince = selectedProvince === "all" || l.province === selectedProvince;
    const matchesScore = selectedScore === "all" || l.score === selectedScore;
    const matchesSalesperson = selectedSalesperson === "all" || l.salesPerson === selectedSalesperson;

    // Multi-tag matching (ANY vs. ALL)
    let matchesTags = true;
    if (selectedTags.length > 0) {
      const leadTags = l.tags || [];
      if (tagMatchMode === "ANY") {
        matchesTags = selectedTags.some(t => leadTags.includes(t));
      } else {
        matchesTags = selectedTags.every(t => leadTags.includes(t));
      }
    }

    // Follow-up status matching
    let matchesFollowUp = true;
    if (selectedFollowUpStatus !== "all") {
      const followUpInfo = getFollowUpStatus(l.followUp);
      matchesFollowUp = followUpInfo.status === selectedFollowUpStatus;
    }

    return matchesSearch && matchesStatus && matchesChannel && matchesCampaign && matchesAffiliate && matchesTags && matchesFollowUp && matchesProvince && matchesScore && matchesSalesperson;
  });

  const hasActiveFilters = 
    searchQuery !== "" || 
    selectedStatus !== "all" || 
    selectedSalesperson !== "all" ||
    selectedChannel !== "all" || 
    selectedCampaign !== "all" ||
    selectedAffiliate !== "all" ||
    selectedTags.length > 0 ||
    selectedFollowUpStatus !== "all" ||
    selectedProvince !== "all" || 
    selectedScore !== "all";

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedStatus("all");
    setSelectedSalesperson("all");
    setSelectedChannel("all");
    setSelectedCampaign("all");
    setSelectedAffiliate("all");
    setSelectedTags([]);
    setSelectedFollowUpStatus("all");
    setSelectedProvince("all");
    setSelectedScore("all");
  };

  const toggleFilterTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  // Excel Export
  const handleExportAllFiltered = () => {
    const dateStr = new Date().toISOString().split("T")[0];
    exportLeadsToExcel(filteredLeads, `Mylogiz_CRM_Filtered_${dateStr}.xlsx`);
  };

  // Status Reason modal state (For Won & Rejection reasons)
  const [statusReasonModal, setStatusReasonModal] = useState<{
    isOpen: boolean;
    lead: Lead | null;
    targetStatus: LeadStatus | null;
  }>({
    isOpen: false,
    lead: null,
    targetStatus: null
  });

  const handleRequestStatusChange = (lead: Lead, targetStatus: LeadStatus) => {
    if (targetStatus === lead.status) return;

    const isWon = targetStatus === LeadStatus.REGISTERED || targetStatus === LeadStatus.ACTIVATED || targetStatus === LeadStatus.REGULAR;
    const isRejected = targetStatus === LeadStatus.NOT_INTERESTED || targetStatus === LeadStatus.LOST;

    if (isWon || isRejected) {
      setStatusReasonModal({
        isOpen: true,
        lead,
        targetStatus
      });
    } else {
      onUpdateLeadStatus(lead.id, targetStatus);
    }
  };

  const handleConfirmStatusReason = ({
    status,
    reason,
    reasonOther
  }: {
    status: LeadStatus;
    reason: string;
    reasonOther?: string;
  }) => {
    if (!statusReasonModal.lead) return;
    const leadId = statusReasonModal.lead.id;
    const isWon = status === LeadStatus.REGISTERED || status === LeadStatus.ACTIVATED || status === LeadStatus.REGULAR;
    const isRejected = status === LeadStatus.NOT_INTERESTED || status === LeadStatus.LOST;

    const reasonPayload = {
      ...(isWon ? { wonReason: reason, wonReasonOther: reasonOther } : {}),
      ...(isRejected ? { lostReason: reason, lostReasonOther: reasonOther } : {})
    };

    onUpdateLeadStatus(leadId, status, reasonPayload);
    setStatusReasonModal({ isOpen: false, lead: null, targetStatus: null });
  };

  // Pipeline Columns
  const PIPELINE_COLUMNS: { id: LeadStatus; label: string; color: string }[] = [
    { id: LeadStatus.NEW_LEAD, label: "🟡 Lead ใหม่", color: "border-amber-400 bg-amber-500/10" },
    { id: LeadStatus.CONTACTED, label: "🟠 ติดต่อแล้ว", color: "border-orange-400 bg-orange-500/10" },
    { id: LeadStatus.SENT_DETAILS, label: "🔵 รอพิจารณา", color: "border-blue-400 bg-blue-500/10" },
    { id: LeadStatus.MEETING, label: "📅 นัด Meeting", color: "border-indigo-400 bg-indigo-500/10" },
    { id: LeadStatus.WAITING_DOCS, label: "🟣 รอเอกสาร", color: "border-purple-400 bg-purple-500/10" },
    { id: LeadStatus.REGISTERED, label: "🟢 ปิดการขาย (สมัครแล้ว)", color: "border-green-400 bg-green-500/10" },
    { id: LeadStatus.ACTIVATED, label: "✅ เปิดใช้งานแล้ว", color: "border-emerald-400 bg-emerald-500/10" },
    { id: LeadStatus.LOST, label: "❌ Lost / ยกเลิก", color: "border-rose-400 bg-rose-500/10" },
    { id: LeadStatus.NOT_INTERESTED, label: "⚪ ปฏิเสธ", color: "border-gray-400 bg-gray-500/10" },
    { id: LeadStatus.NO_CONTACT, label: "🔇 ติดต่อไม่ได้", color: "border-slate-400 bg-slate-500/10" }
  ];

  const handleCreateLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShopName.trim()) return;

    onAddLead({
      shopName: newShopName,
      contactName: newContactName,
      phone: newPhone,
      lineId: newLineId,
      facebook: newFacebook,
      province: newProvince,
      channel: newChannel,
      tags: newTags,
      status: LeadStatus.NEW_LEAD,
      score: newScore,
      address: newAddress,
      preferredTransport: newPreferredTransport,
      shipmentsPerDay: Number(newShipmentsPerDay) || 0,
      competitor: newCompetitor,
      salesPerson: newSalesPerson,
      customerType: newCustomerType,
      campaign: newCampaign,
      affiliateId: newAffiliateId.trim(),
      documents: { idCard: false, bookBank: false, companyReg: false, taxDoc: false, storefrontPhoto: false },
      followUp: { date: "", time: "10:00", isCompleted: false },
      notes: initialNote.trim() ? [{
        id: `note_${Date.now()}`,
        text: initialNote,
        createdAt: new Date().toISOString(),
        author: newSalesPerson
      }] : []
    });

    // Reset Form
    setNewCustomerType("individual");
    setNewShopName("");
    setNewContactName("");
    setNewPhone("");
    setNewLineId("");
    setNewFacebook("");
    setNewProvince("กรุงเทพมหานคร");
    setNewChannel("Facebook");
    setNewCampaign("");
    setNewAffiliateId("");
    setNewTags([]);
    setNewScore(3);
    setNewAddress("");
    setNewPreferredTransport(["Flash"]);
    setNewShipmentsPerDay(10);
    setNewCompetitor("");
    setInitialNote("");
    setIsAddOpen(false);
  };

  const toggleNewTag = (tag: string) => {
    if (newTags.includes(tag)) {
      setNewTags(newTags.filter(t => t !== tag));
    } else {
      setNewTags([...newTags, tag]);
    }
  };

  const toggleTransport = (t: string) => {
    if (newPreferredTransport.includes(t)) {
      setNewPreferredTransport(newPreferredTransport.filter(x => x !== t));
    } else {
      setNewPreferredTransport([...newPreferredTransport, t]);
    }
  };

  return (
    <div className="space-y-5" id="leads-container">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">จัดการลูกค้าเป้าหมาย (Lead Management)</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            ค้นหา กรองสถานะ จัดการ Tags สี นัดหมายการโทร และติดตามดีลใน Sales Pipeline
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* View Toggle */}
          <div className="bg-slate-100 p-0.5 rounded-xl flex items-center border border-slate-200">
            <button 
              id="view-type-kanban"
              onClick={() => setViewType("kanban")} 
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer ${viewType === "kanban" ? "bg-white text-blue-600 shadow-xs" : "text-slate-500 hover:text-slate-800"}`}
            >
              <Kanban className="w-3.5 h-3.5" /> Pipeline
            </button>
            <button 
              id="view-type-list"
              onClick={() => setViewType("list")} 
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer ${viewType === "list" ? "bg-white text-blue-600 shadow-xs" : "text-slate-500 hover:text-slate-800"}`}
            >
              <ListFilter className="w-3.5 h-3.5" /> รายการ ({filteredLeads.length})
            </button>
          </div>

          {/* Export Excel Button */}
          <button 
            id="download-leads-excel-btn"
            onClick={handleExportAllFiltered} 
            className="flex items-center gap-2 bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-200 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors shadow-xs cursor-pointer"
            title="ส่งออกรายการที่กรองเป็นไฟล์ Excel"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>Export Excel ({filteredLeads.length})</span>
          </button>

          {/* Import Excel Button */}
          <button 
            id="open-import-leads-excel-btn"
            onClick={() => setShowImportModal(true)} 
            className="flex items-center gap-2 bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors shadow-xs cursor-pointer"
            title="นำเข้าข้อมูลลูกค้าเป้าหมายหลายรายพร้อมกันจากไฟล์ Excel"
          >
            <Upload className="w-4 h-4 text-blue-600" />
            <span>Import Excel</span>
          </button>

          {/* Add Lead Button */}
          <button 
            id="open-add-lead-btn"
            onClick={() => setIsAddOpen(true)} 
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-xl text-xs font-bold transition-colors shadow-xs cursor-pointer ml-auto sm:ml-0"
          >
            <Plus className="w-4 h-4" /> เพิ่ม Lead ใหม่
          </button>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input 
              id="lead-search-input"
              type="text" 
              placeholder="ค้นหาชื่อลูกค้า, ร้านค้า, บริษัท, ผู้ติดต่อ, เบอร์โทร, LINE ID, รหัสลูกค้า..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-slate-700 placeholder-slate-400 font-medium"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                title="ล้างคำค้นหา"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Quick Dropdown: Lead Status Filter */}
          <div className="w-full lg:w-48">
            <select
              id="filter-status-select"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="all">ทุกสถานะ Lead ({leads.length})</option>
              {Object.entries(StatusLabels).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          {/* Quick Dropdown: Follow-up Status */}
          <div className="w-full lg:w-48">
            <select
              id="filter-followup-select"
              value={selectedFollowUpStatus}
              onChange={(e) => setSelectedFollowUpStatus(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
            >
              <option value="all">สถานะการโทร (ทั้งหมด)</option>
              <option value="overdue">🔴 เลยกำหนด (Overdue)</option>
              <option value="today">🟠 ต้องโทรวันนี้ (Today)</option>
              <option value="upcoming">🔵 กำลังมาถึง (Upcoming)</option>
              <option value="completed">🟢 ติดตามเสร็จแล้ว</option>
              <option value="no_followup">⚪ ยังไม่มีนัดหมาย</option>
            </select>
          </div>

          {/* Quick Dropdown: Salesperson Filter */}
          {salespersons.length > 0 && (
            <div className="w-full lg:w-40">
              <select
                id="filter-salesperson-select"
                value={selectedSalesperson}
                onChange={(e) => setSelectedSalesperson(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="all">เซลส์ทั้งหมด</option>
                {salespersons.map(sp => (
                  <option key={sp} value={sp}>{sp}</option>
                ))}
              </select>
            </div>
          )}

          {/* Compact Tag Filter Dropdown */}
          <TagFilterDropdown
            selectedTags={selectedTags}
            onChangeTags={setSelectedTags}
            tagMatchMode={tagMatchMode}
            onChangeMatchMode={setTagMatchMode}
            allKnownTags={allKnownTags}
          />

          {/* Toggle Advanced Filters */}
          <button 
            id="toggle-filters-btn"
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center justify-center gap-2 px-3.5 py-2 border rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${showFilters ? "border-blue-200 bg-blue-50 text-blue-600" : "border-slate-200 bg-white hover:bg-slate-50 text-slate-600"}`}
          >
            <SlidersHorizontal className="w-4 h-4" /> ตัวกรองละเอียด {showFilters ? "(ซ่อน)" : ""}
          </button>

          {/* Reset Filters Button */}
          {hasActiveFilters && (
            <button
              id="reset-filters-btn"
              onClick={resetFilters}
              className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap"
            >
              <X className="w-3.5 h-3.5" /> ล้างตัวกรอง
            </button>
          )}
        </div>

        {/* Extended Filters */}
        {showFilters && (
          <motion.div 
            id="filters-panel"
            initial={{ opacity: 0, height: 0 }} 
            animate={{ opacity: 1, height: "auto" }} 
            className="grid grid-cols-1 sm:grid-cols-5 gap-3 pt-3 border-t border-slate-100 text-xs"
          >
            <div>
              <label className="block text-slate-500 font-semibold mb-1">แคมเปญการตลาด</label>
              <select 
                id="filter-campaign-select"
                value={selectedCampaign} 
                onChange={(e) => setSelectedCampaign(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="all">ทั้งหมด ทุกแคมเปญ</option>
                {campaigns.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-slate-500 font-semibold mb-1">ผู้แนะนำ (Affiliate)</label>
              <select 
                id="filter-affiliate-select"
                value={selectedAffiliate} 
                onChange={(e) => setSelectedAffiliate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="all">ทั้งหมด (มี/ไม่มีผู้แนะนำ)</option>
                <option value="none">-- ไม่มีผู้แนะนำ --</option>
                {affiliates.map(a => (
                  <option key={a.id} value={a.affiliateId}>
                    {a.affiliateId} - {a.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-500 font-semibold mb-1">ช่องทางที่เข้ามา</label>
              <select 
                id="filter-channel-select"
                value={selectedChannel} 
                onChange={(e) => setSelectedChannel(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="all">ทั้งหมด ทุกช่องทาง</option>
                {ALL_CHANNELS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-slate-500 font-semibold mb-1">จังหวัด</label>
              <select 
                id="filter-province-select"
                value={selectedProvince} 
                onChange={(e) => setSelectedProvince(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="all">ทุกจังหวัด</option>
                {ALL_PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-slate-500 font-semibold mb-1">ระดับคะแนน (Lead Score)</label>
              <select 
                id="filter-score-select"
                value={selectedScore} 
                onChange={(e) => setSelectedScore(e.target.value === "all" ? "all" : Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="all">ทุกระดับคะแนน</option>
                <option value={5}>⭐⭐⭐⭐⭐ (5 ดาว - พร้อมปิดการขาย)</option>
                <option value={4}>⭐⭐⭐⭐ (4 ดาว - โอกาสสูง)</option>
                <option value={3}>⭐⭐⭐ (3 ดาว - ปานกลาง)</option>
                <option value={2}>⭐⭐ (2 ดาว - สนใจน้อย)</option>
                <option value={1}>⭐ (1 ดาว - โอกาสต่ำ)</option>
              </select>
            </div>
          </motion.div>
        )}
      </div>

      {/* VIEW MODES */}
      {viewType === "kanban" ? (
        /* KANBAN PIPELINE VIEW */
        <div id="pipeline-board-container" className="flex gap-4 overflow-x-auto pb-6 pt-1 snap-x">
          {PIPELINE_COLUMNS.map((column) => {
            const columnLeads = filteredLeads.filter((l) => l.status === column.id);
            return (
              <div 
                key={column.id} 
                id={`kanban-col-${column.id}`}
                className="flex-shrink-0 w-80 bg-slate-50/80 rounded-2xl p-3 border border-slate-200/80 flex flex-col max-h-[78vh]"
              >
                {/* Column Header */}
                <div className="flex justify-between items-center mb-3 px-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-800">{column.label}</span>
                    <span className="bg-slate-200 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {columnLeads.length}
                    </span>
                  </div>
                </div>

                {/* Cards Container */}
                <div className="space-y-3 overflow-y-auto pr-1 flex-1">
                  {columnLeads.map((lead) => {
                    const followUpInfo = getFollowUpStatus(lead.followUp);
                    return (
                      <motion.div
                        key={lead.id}
                        id={`kanban-card-${lead.id}`}
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        onClick={() => onSelectLead(lead)}
                        className="p-3.5 bg-white rounded-xl border border-slate-200 hover:border-blue-300 shadow-xs hover:shadow-md transition-all cursor-pointer relative group space-y-2.5"
                      >
                        {/* Header Row: Customer Code + Shop Name */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <span className="font-bold text-slate-900 text-xs group-hover:text-blue-600 transition-colors block truncate">
                              {lead.shopName}
                            </span>
                            <span className="text-[10px] text-slate-400 block truncate">
                              ผู้ติดต่อ: {lead.contactName || "-"}
                            </span>
                          </div>

                          <div className="flex flex-col items-end gap-1 shrink-0">
                            {lead.customerType === "corporate" && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0">
                                🏢 นิติบุคคล
                              </span>
                            )}
                            {lead.affiliateId && (
                              <span 
                                className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 shrink-0 font-mono" 
                                title={`ผู้แนะนำ: ${lead.affiliateId}`}
                              >
                                🤝 {lead.affiliateId}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Follow-up Alert / Scheduled Row */}
                        {lead.followUp?.date && (
                          <div className={`px-2 py-1 rounded-lg border text-[10px] font-bold flex items-center justify-between gap-1 ${followUpInfo.badgeClass}`}>
                            <span className="flex items-center gap-1 truncate">
                              <Clock className="w-3 h-3 shrink-0" />
                              <span>{followUpInfo.label}: {lead.followUp.date} {lead.followUp.time || ""}</span>
                            </span>
                            {lead.phone && (
                              <a
                                href={`tel:${lead.phone}`}
                                onClick={(e) => e.stopPropagation()}
                                className="p-1 hover:bg-black/10 rounded transition-colors"
                                title="โทรทันที"
                              >
                                <PhoneCall className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        )}

                        {/* Tags Badges Row (with compact pills) */}
                        {lead.tags && lead.tags.length > 0 && (
                          <LeadCardTags tags={lead.tags} maxVisible={3} size="xs" />
                        )}

                        {/* Reason indicator badge if Won or Rejected */}
                        {lead.wonReason && (lead.status === LeadStatus.REGISTERED || lead.status === LeadStatus.ACTIVATED || lead.status === LeadStatus.REGULAR) && (
                          <div 
                            className="px-2 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-[10px] font-semibold flex items-center gap-1 truncate"
                            title={`สาเหตุปิดการขาย: ${lead.wonReason}${lead.wonReasonOther ? ` (${lead.wonReasonOther})` : ""}`}
                          >
                            <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                            <span className="truncate">ปิดการขาย: {lead.wonReason}</span>
                          </div>
                        )}

                        {lead.lostReason && (lead.status === LeadStatus.NOT_INTERESTED || lead.status === LeadStatus.LOST) && (
                          <div 
                            className="px-2 py-1 bg-rose-50 text-rose-800 border border-rose-200 rounded-lg text-[10px] font-semibold flex items-center gap-1 truncate"
                            title={`สาเหตุที่ปฏิเสธ: ${lead.lostReason}${lead.lostReasonOther ? ` (${lead.lostReasonOther})` : ""}`}
                          >
                            <XCircle className="w-3 h-3 text-rose-500 shrink-0" />
                            <span className="truncate">ปฏิเสธ: {lead.lostReason}</span>
                          </div>
                        )}

                        {/* Location, Volume & Score */}
                        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                          <div className="flex items-center gap-1 truncate">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{lead.province}</span>
                          </div>

                          <div className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`w-3 h-3 ${star <= lead.score ? "text-amber-400 fill-amber-400" : "text-slate-200"}`}
                              />
                            ))}
                          </div>
                        </div>

                        {/* Quick Status Pipeline Shift dropdown */}
                        <div className="pt-1" onClick={(e) => e.stopPropagation()}>
                          <select
                            value={lead.status}
                            onChange={(e) => handleRequestStatusChange(lead, e.target.value as LeadStatus)}
                            className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg px-2 py-1 text-[10px] font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                          >
                            {PIPELINE_COLUMNS.map((opt) => (
                              <option key={opt.id} value={opt.id}>ย้ายไป: {opt.label}</option>
                            ))}
                          </select>
                        </div>
                      </motion.div>
                    );
                  })}

                  {columnLeads.length === 0 && (
                    <div className="py-12 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl">
                      ไม่มีลูกค้าในขั้นนี้
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* STANDARD LIST / TABLE VIEW */
        <div id="list-view-table-wrapper" className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table id="leads-list-table" className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase text-[10px]">
                  <th className="p-3.5 pl-5">ชื่อร้าน / ผู้ติดต่อ</th>
                  <th className="p-3.5">เบอร์โทร / LINE</th>
                  <th className="p-3.5">Tags สี</th>
                  <th className="p-3.5">นัดโทรติดตาม (Follow-up)</th>
                  <th className="p-3.5">สถานะ Pipeline</th>
                  <th className="p-3.5">ผู้ดูแล</th>
                  <th className="p-3.5 text-center">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLeads.map(lead => {
                  const followUpInfo = getFollowUpStatus(lead.followUp);
                  return (
                    <tr 
                      key={lead.id} 
                      id={`list-row-${lead.id}`}
                      onClick={() => onSelectLead(lead)}
                      className="hover:bg-slate-50/70 cursor-pointer transition-colors"
                    >
                      <td className="p-3.5 pl-5 font-medium text-slate-800">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-slate-900">{lead.shopName}</span>
                            {lead.customerType === "corporate" && (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                                🏢 นิติบุคคล
                              </span>
                            )}
                            {lead.affiliateId && (
                              <span 
                                className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-50 text-purple-700 border border-purple-200 font-mono"
                                title={`ผู้แนะนำ: ${lead.affiliateId}`}
                              >
                                🤝 {lead.affiliateId}
                              </span>
                            )}
                          </div>
                          <span className="text-slate-400 text-[10px] block">ผู้ติดต่อ: {lead.contactName || "ไม่ระบุ"}</span>
                        </div>
                      </td>

                      <td className="p-3.5 text-slate-600 font-mono">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-800">{lead.phone || "-"}</span>
                            {lead.phone && (
                              <a
                                href={`tel:${lead.phone}`}
                                onClick={(e) => e.stopPropagation()}
                                className="p-1 hover:bg-emerald-50 text-emerald-600 rounded transition-colors"
                                title="โทรออก"
                              >
                                <PhoneCall className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                          <span className="text-slate-400 text-[10px] block">Line: {lead.lineId || "-"}</span>
                        </div>
                      </td>

                      <td className="p-3.5">
                        <LeadCardTags tags={lead.tags} maxVisible={3} size="xs" />
                      </td>

                      <td className="p-3.5">
                        {lead.followUp?.date ? (
                          <div className="space-y-0.5">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${followUpInfo.badgeClass}`}>
                              <Clock className="w-3 h-3" />
                              <span>{followUpInfo.label}</span>
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono block">
                              {lead.followUp.date} {lead.followUp.time || ""}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-300 text-[10px]">ยังไม่มีนัด</span>
                        )}
                      </td>

                      <td className="p-3.5" onClick={(e) => e.stopPropagation()}>
                        <div className="space-y-1">
                          <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold border ${StatusColors[lead.status]}`}>
                            {StatusLabels[lead.status]}
                          </span>
                          {lead.wonReason && (lead.status === LeadStatus.REGISTERED || lead.status === LeadStatus.ACTIVATED || lead.status === LeadStatus.REGULAR) && (
                            <span 
                              className="block text-[10px] text-emerald-700 font-semibold truncate max-w-[140px]" 
                              title={`สาเหตุปิดการขาย: ${lead.wonReason}${lead.wonReasonOther ? ` (${lead.wonReasonOther})` : ""}`}
                            >
                              🎯 {lead.wonReason}
                            </span>
                          )}
                          {lead.lostReason && (lead.status === LeadStatus.NOT_INTERESTED || lead.status === LeadStatus.LOST) && (
                            <span 
                              className="block text-[10px] text-rose-700 font-semibold truncate max-w-[140px]" 
                              title={`สาเหตุที่ปฏิเสธ: ${lead.lostReason}${lead.lostReasonOther ? ` (${lead.lostReasonOther})` : ""}`}
                            >
                              ❌ {lead.lostReason}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="p-3.5 text-slate-600 font-semibold">{lead.salesPerson || "-"}</td>

                      <td className="p-3.5 text-center">
                        <div className="flex justify-center items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onUpdateLead) {
                                  onUpdateLead({ ...lead, score: star });
                                }
                              }}
                              className="p-0.5 hover:scale-125 transition-transform cursor-pointer group"
                              title={`ปรับเป็น ${star} ดาว`}
                            >
                              <Star 
                                className={`w-3.5 h-3.5 ${star <= lead.score ? "text-amber-400 fill-amber-400" : "text-slate-200 group-hover:text-amber-300"}`} 
                              />
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredLeads.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      ไม่พบผลการค้นหาตามคีย์เวิร์ดหรือตัวกรองที่เลือก
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ADD LEAD POPUP MODAL */}
      {isAddOpen && (
        <div id="add-lead-modal" className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }} 
            animate={{ scale: 1, opacity: 1 }} 
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-800">เพิ่มลูกค้าเป้าหมายใหม่ (Create Lead)</h3>
                <p className="text-xs text-slate-400">กรอกข้อมูลที่จำเป็นของร้านค้าเพื่อบันทึกและรันขั้นตอนการปิดการขาย</p>
              </div>
              <button 
                id="close-add-lead-modal-btn"
                onClick={() => setIsAddOpen(false)} 
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleCreateLead} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Shop Name */}
                <div className="space-y-1">
                  <label className="block text-slate-600 font-bold">ชื่อร้านค้า / แบรนด์ <span className="text-rose-500">*</span></label>
                  <input 
                    id="new-lead-shop-name"
                    type="text" 
                    required
                    placeholder="เช่น ร้านชลธิชา บิวตี้" 
                    value={newShopName}
                    onChange={(e) => setNewShopName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  />
                </div>

                {/* Contact Name */}
                <div className="space-y-1">
                  <label className="block text-slate-600 font-bold">ชื่อผู้ติดต่อ</label>
                  <input 
                    id="new-lead-contact-name"
                    type="text" 
                    placeholder="เช่น คุณชลธิชา" 
                    value={newContactName}
                    onChange={(e) => setNewContactName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  />
                </div>

                {/* Phone */}
                <div className="space-y-1">
                  <label className="block text-slate-600 font-bold">เบอร์โทรศัพท์ <span className="text-rose-500">*</span></label>
                  <input 
                    id="new-lead-phone"
                    type="tel" 
                    required
                    placeholder="เช่น 0812345678" 
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white font-mono"
                  />
                </div>

                {/* LINE ID */}
                <div className="space-y-1">
                  <label className="block text-slate-600 font-bold">LINE ID</label>
                  <input 
                    id="new-lead-line-id"
                    type="text" 
                    placeholder="เช่น @chonthicha_shop" 
                    value={newLineId}
                    onChange={(e) => setNewLineId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  />
                </div>

                {/* Customer Type */}
                <div className="space-y-1">
                  <label className="block text-slate-600 font-bold">ประเภทลูกค้า</label>
                  <select 
                    id="new-lead-customer-type"
                    value={newCustomerType}
                    onChange={(e) => setNewCustomerType(e.target.value as "individual" | "corporate")}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white font-semibold"
                  >
                    <option value="individual">👤 บุคคลธรรมดา</option>
                    <option value="corporate">🏢 นิติบุคคล (บริษัท / ห้างหุ้นส่วน)</option>
                  </select>
                </div>

                {/* Channel */}
                <div className="space-y-1">
                  <label className="block text-slate-600 font-bold">ช่องทางที่เข้ามา (Lead Source)</label>
                  <select 
                    id="new-lead-channel"
                    value={newChannel}
                    onChange={(e) => setNewChannel(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  >
                    {ALL_CHANNELS.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {/* Campaign */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="block text-slate-600 font-bold">แคมเปญการตลาด</label>
                    <button
                      type="button"
                      onClick={() => setShowCampaignManagerModal(true)}
                      className="text-blue-600 hover:underline font-bold text-[10px]"
                    >
                      + จัดการแคมเปญ
                    </button>
                  </div>
                  <select 
                    id="new-lead-campaign"
                    value={newCampaign}
                    onChange={(e) => setNewCampaign(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  >
                    <option value="">-- ไม่ระบุแคมเปญ --</option>
                    {campaigns.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {/* Affiliate */}
                <div className="space-y-1">
                  <label className="block text-slate-600 font-bold">ผู้แนะนำ (Affiliate ID)</label>
                  <AffiliateSelectCombobox
                    id="new-lead-affiliate"
                    value={newAffiliateId}
                    onChange={(val) => setNewAffiliateId(val)}
                    affiliates={affiliates}
                    placeholder="-- ไม่ระบุ (ไม่มีผู้แนะนำ) --"
                  />
                </div>

                {/* Province */}
                <div className="space-y-1">
                  <label className="block text-slate-600 font-bold">จังหวัด</label>
                  <select 
                    id="new-lead-province"
                    value={newProvince}
                    onChange={(e) => setNewProvince(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  >
                    {ALL_PROVINCES.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                {/* Salesperson */}
                <div className="space-y-1">
                  <label className="block text-slate-600 font-bold">ผู้ดูแล (Salesperson)</label>
                  <select 
                    id="new-lead-salesperson"
                    value={newSalesPerson}
                    onChange={(e) => setNewSalesPerson(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  >
                    {salespersons.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                {/* Estimated Shipments */}
                <div className="space-y-1">
                  <label className="block text-slate-600 font-bold">ยอดพัสดุคาดการณ์ (ชิ้น/เดือน)</label>
                  <input 
                    id="new-lead-shipments"
                    type="number" 
                    placeholder="เช่น 100" 
                    value={newShipmentsPerDay}
                    onChange={(e) => setNewShipmentsPerDay(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white font-mono"
                  />
                </div>
              </div>

              {/* Tags Selector with 3 Categories & Compact Pills */}
              <div className="space-y-2.5 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="block text-slate-600 font-bold">ป้ายกำกับลูกค้า (Tags)</label>
                  <span className="text-[11px] text-slate-400 font-medium">
                    {newTags.length > 0 ? `เลือกแล้ว ${newTags.length} ป้าย` : "เลือกป้ายกำกับ (หรือไม่ระบุก็ได้)"}
                  </span>
                </div>

                <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                  {PRESET_TAG_CATEGORIES.map(category => (
                    <div key={category.name} className="space-y-1 bg-slate-50/70 p-2.5 rounded-xl border border-slate-100">
                      <div className="flex items-center gap-1.5 text-slate-600 font-bold text-[11px]">
                        <span className="w-2 h-2 rounded-full" style={{
                          backgroundColor: category.colorName === "blue" ? "#3b82f6" :
                            category.colorName === "purple" ? "#a855f7" :
                            category.colorName === "green" ? "#10b981" :
                            category.colorName === "orange" ? "#f59e0b" : "#ef4444"
                        }} />
                        <span>{category.name}</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {category.tags.map(tag => {
                          const isSelected = newTags.includes(tag);
                          return (
                            <TagPill
                              key={tag}
                              tag={tag}
                              size="sm"
                              isSelected={isSelected}
                              onClick={() => toggleNewTag(tag)}
                            />
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Initial Note */}
              <div className="space-y-1">
                <label className="block text-slate-600 font-bold">บันทึกช่วยจำเริ่มต้น (Initial Note)</label>
                <textarea 
                  id="new-lead-initial-note"
                  rows={2}
                  placeholder="เช่น รายละเอียดการโทรคุยรอบแรก ลูกค้าต้องการข้อมูลเรทราคาเพิ่ม หรือชอบคุยเวลาไหน..."
                  value={initialNote}
                  onChange={(e) => setInitialNote(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-800"
                />
              </div>

              {/* Footer Actions */}
              <div className="flex justify-end gap-2.5 border-t border-slate-100 pt-4 mt-2">
                <button 
                  id="cancel-add-lead-btn"
                  type="button" 
                  onClick={() => setIsAddOpen(false)} 
                  className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 rounded-xl font-bold transition-all cursor-pointer text-xs"
                >
                  ยกเลิก
                </button>
                <button 
                  id="submit-add-lead-btn"
                  type="submit" 
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all cursor-pointer shadow-xs text-xs"
                >
                  บันทึกและรัน Pipeline
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Campaign Manager Modal */}
      {onAddCampaign && onDeleteCampaign && (
        <CampaignManagerModal
          isOpen={showCampaignManagerModal}
          onClose={() => setShowCampaignManagerModal(false)}
          campaigns={campaigns}
          onAddCampaign={onAddCampaign}
          onDeleteCampaign={onDeleteCampaign}
          onSelectCampaign={(name) => setNewCampaign(name)}
          leads={leads}
        />
      )}

      {/* Import Leads Excel Modal */}
      {onBatchAddLeads && (
        <ImportLeadsModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          currentUser={currentUser}
          salespersons={salespersons}
          campaigns={campaigns}
          onBatchAddLeads={onBatchAddLeads}
        />
      )}

      {/* Pipeline Status Reason Modal (Won / Rejection reason capture) */}
      <StatusReasonModal
        isOpen={statusReasonModal.isOpen}
        lead={statusReasonModal.lead}
        targetStatus={statusReasonModal.targetStatus}
        onClose={() => setStatusReasonModal({ isOpen: false, lead: null, targetStatus: null })}
        onConfirm={handleConfirmStatusReason}
      />
    </div>
  );
}
