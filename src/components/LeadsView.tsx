import React, { useState } from "react";
import { Lead, LeadStatus, StatusLabels, StatusColors, THAI_PROVINCES, TRANSPORT_CARRIERS } from "../types";
import { 
  Plus, Search, SlidersHorizontal, Check, Star, Filter, 
  MapPin, Phone, MessageSquare, ArrowRight, Kanban, ListFilter,
  X, Calendar, Clock, ShoppingBag, Download, Megaphone
} from "lucide-react";
import { motion } from "motion/react";
import CampaignManagerModal from "./CampaignManagerModal";

interface LeadsViewProps {
  leads: Lead[];
  salespersons?: string[];
  campaigns?: string[];
  onAddCampaign?: (name: string) => Promise<void>;
  onDeleteCampaign?: (name: string) => Promise<void>;
  currentUser?: string | null;
  onAddLead: (lead: Omit<Lead, "id" | "createdAt" | "updatedAt" | "timeline" | "calls" | "files">) => void;
  onUpdateLeadStatus: (id: string, newStatus: LeadStatus) => void;
  onSelectLead: (lead: Lead) => void;
  onUpdateLead?: (updatedLead: Lead) => void;
  onDeleteLead?: (leadId: string) => Promise<boolean> | void;
}

const ALL_CHANNELS = ["Facebook", "TikTok", "Website", "Line OA", "โทรเข้า", "คนแนะนำ", "หาเอง"];
const ALL_TAGS = ["เปิดร้านรับส่งใหม่", "เพิ่มขนส่ง"];
const ALL_PROVINCES = THAI_PROVINCES;


export default function LeadsView({ 
  leads, 
  salespersons = [], 
  campaigns = [],
  onAddCampaign,
  onDeleteCampaign,
  currentUser, 
  onAddLead, 
  onUpdateLeadStatus, 
  onSelectLead, 
  onUpdateLead, 
  onDeleteLead 
}: LeadsViewProps) {
  // UI views: "kanban" or "list"
  const [viewType, setViewType] = useState<"kanban" | "list">("kanban");
  
  // Search and Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedSalesperson, setSelectedSalesperson] = useState<string>("all");
  const [selectedChannel, setSelectedChannel] = useState("all");
  const [selectedCampaign, setSelectedCampaign] = useState<string>("all");
  const [selectedTag, setSelectedTag] = useState("all");
  const [selectedProvince, setSelectedProvince] = useState("all");
  const [selectedScore, setSelectedScore] = useState<number | "all">("all");
  const [showFilters, setShowFilters] = useState(false);
  const [showCampaignManagerModal, setShowCampaignManagerModal] = useState(false);

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
  const [newTags, setNewTags] = useState<string[]>([]);
  const [newScore, setNewScore] = useState(3);
  const [newAddress, setNewAddress] = useState("");
  const [newPreferredTransport, setNewPreferredTransport] = useState<string[]>(["Flash"]);
  const [newShipmentsPerDay, setNewShipmentsPerDay] = useState(10);
  const [newCompetitor, setNewCompetitor] = useState("");
  const [newSalesPerson, setNewSalesPerson] = useState("");
  const [initialNote, setInitialNote] = useState("");

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
      (l.facebook && l.facebook.toLowerCase().includes(query));

    const matchesStatus = selectedStatus === "all" || l.status === selectedStatus;
    const matchesChannel = selectedChannel === "all" || l.channel === selectedChannel;
    const matchesCampaign = selectedCampaign === "all" || l.campaign === selectedCampaign;
    const matchesTag = selectedTag === "all" || l.tags.includes(selectedTag);
    const matchesProvince = selectedProvince === "all" || l.province === selectedProvince;
    const matchesScore = selectedScore === "all" || l.score === selectedScore;
    const matchesSalesperson = selectedSalesperson === "all" || l.salesPerson === selectedSalesperson;

    return matchesSearch && matchesStatus && matchesChannel && matchesCampaign && matchesTag && matchesProvince && matchesScore && matchesSalesperson;
  });

  const hasActiveFilters = 
    searchQuery !== "" || 
    selectedStatus !== "all" || 
    selectedSalesperson !== "all" ||
    selectedChannel !== "all" || 
    selectedCampaign !== "all" ||
    selectedTag !== "all" || 
    selectedProvince !== "all" || 
    selectedScore !== "all";

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedStatus("all");
    setSelectedSalesperson("all");
    setSelectedChannel("all");
    setSelectedCampaign("all");
    setSelectedTag("all");
    setSelectedProvince("all");
    setSelectedScore("all");
  };

  const handleDownloadCSV = () => {
    // 1. Prepare headers
    const headers = [
      "รหัสลูกค้า",
      "ชื่อร้านค้า/แบรนด์",
      "ชื่อผู้ติดต่อ",
      "เบอร์โทรศัพท์",
      "LINE ID",
      "Facebook",
      "ประเภทลูกค้า",
      "จังหวัด",
      "ที่อยู่",
      "ช่องทางที่ได้ Lead",
      "ยอดจัดส่งเฉลี่ย (ชิ้น/เดือน)",
      "ค่ายขนส่งที่สนใจ",
      "ขนส่งคู่แข่ง",
      "เซลส์ผู้รับผิดชอบดูแล",
      "สถานะ",
      "คะแนนความน่าสนใจ",
      "วันที่ลงทะเบียนเอกสาร",
      "วันที่เปิดใช้งาน",
      "วันที่ส่งพัสดุแรก",
      "วันที่สร้าง Lead"
    ];

    // Helper to escape CSV fields correctly
    const escapeCSV = (val: any) => {
      if (val === null || val === undefined) return "";
      let str = String(val);
      str = str.replace(/"/g, '""');
      if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
        return `"${str}"`;
      }
      return str;
    };

    // 2. Map leads to CSV rows
    const rows = filteredLeads.map(l => [
      l.customerCode || "-",
      l.shopName || "-",
      l.contactName || "-",
      l.phone || "-",
      l.lineId || "-",
      l.facebook || "-",
      l.customerType === "corporate" ? "นิติบุคคล" : "บุคคลธรรมดา",
      l.province || "-",
      l.address || "-",
      l.channel || "-",
      l.shipmentsPerDay || 0,
      (l.preferredTransport || []).join(", ") || "-",
      l.competitor || "-",
      l.salesPerson || "-",
      StatusLabels[l.status] || l.status,
      "⭐".repeat(l.score || 0) || "-",
      l.registeredDate || "-",
      l.activationDate || "-",
      l.firstShipmentDate || "-",
      l.createdAt ? new Date(l.createdAt).toLocaleDateString("th-TH") : "-"
    ]);

    // 3. Create the full CSV content
    const csvContent = [
      headers.map(escapeCSV).join(","),
      ...rows.map(row => row.map(escapeCSV).join(","))
    ].join("\n");

    // 4. Create blob with UTF-8 BOM so Excel opens it with correct Thai encoding
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `mylogiz_leads_export_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Pipeline Columns
  const PIPELINE_COLUMNS: { id: LeadStatus; label: string; color: string }[] = [
    { id: LeadStatus.NEW_LEAD, label: "🟡 Lead ใหม่", color: "border-amber-400 bg-amber-500/10" },
    { id: LeadStatus.CONTACTED, label: "🟠 ติดต่อแล้ว", color: "border-orange-400 bg-orange-500/10" },
    { id: LeadStatus.SENT_DETAILS, label: "🔵 ส่งรายละเอียด", color: "border-blue-400 bg-blue-500/10" },
    { id: LeadStatus.MEETING, label: "📅 นัด Meeting", color: "border-indigo-400 bg-indigo-500/10" },
    { id: LeadStatus.WAITING_DOCS, label: "🟣 รอเอกสาร", color: "border-purple-400 bg-purple-500/10" },
    { id: LeadStatus.REGISTERED, label: "🟢 สมัครแล้ว", color: "border-green-400 bg-green-500/10" },
    { id: LeadStatus.ACTIVATED, label: "✅ เปิดใช้งานแล้ว", color: "border-emerald-400 bg-emerald-500/10" },
    { id: LeadStatus.LOST, label: "❌ Lost / ยกเลิก", color: "border-rose-400 bg-rose-500/10" },
    { id: LeadStatus.NOT_INTERESTED, label: "⚪ ยังไม่สนใจ", color: "border-gray-400 bg-gray-500/10" },
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
    setNewTags([]);
    setNewScore(3);
    setNewAddress("");
    setNewPreferredTransport(["Flash"]);
    setNewShipmentsPerDay(10);
    setNewCompetitor("");
    setInitialNote("");
    setIsAddOpen(false);
  };

  const toggleTag = (tag: string) => {
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
    <div className="space-y-6" id="leads-container">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800">จัดการลูกค้าเป้าหมาย (Lead Management)</h2>
          <p className="text-xs text-gray-500 mt-0.5">ลากและย้ายสถานะลูกค้าผ่านระบบ Sales Pipeline</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* View Toggle */}
          <div className="bg-slate-100 p-0.5 rounded-lg flex items-center border border-slate-200">
            <button 
              id="view-type-kanban"
              onClick={() => setViewType("kanban")} 
              className={`p-1.5 rounded-md flex items-center gap-1.5 text-xs font-semibold transition-all cursor-pointer ${viewType === "kanban" ? "bg-white text-blue-600 shadow-xs" : "text-slate-500 hover:text-slate-800"}`}
            >
              <Kanban className="w-3.5 h-3.5" /> Pipeline
            </button>
            <button 
              id="view-type-list"
              onClick={() => setViewType("list")} 
              className={`p-1.5 rounded-md flex items-center gap-1.5 text-xs font-semibold transition-all cursor-pointer ${viewType === "list" ? "bg-white text-blue-600 shadow-xs" : "text-slate-500 hover:text-slate-800"}`}
            >
              <ListFilter className="w-3.5 h-3.5" /> รายการ
            </button>
          </div>

          <button 
            id="download-leads-csv-btn"
            onClick={handleDownloadCSV} 
            className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow-xs cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-500" /> ส่งออก Excel (CSV)
          </button>

          <button 
            id="open-add-lead-btn"
            onClick={() => setIsAddOpen(true)} 
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow-xs cursor-pointer ml-auto sm:ml-0"
          >
            <Plus className="w-4 h-4" /> เพิ่ม Lead ใหม่
          </button>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input 
              id="lead-search-input"
              type="text" 
              placeholder="ค้นหาชื่อลูกค้า, ชื่อร้าน/บริษัท, ผู้ติดต่อ, เบอร์โทร, LINE ID, รหัสลูกค้า..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-slate-700 placeholder-slate-400"
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
          <div className="w-full lg:w-52">
            <select
              id="filter-status-select"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="all">ทุกสถานะ Lead</option>
              {Object.entries(StatusLabels).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          {/* Quick Dropdown: Salesperson Filter (if salespersons exist) */}
          {salespersons.length > 0 && (
            <div className="w-full lg:w-44">
              <select
                id="filter-salesperson-select"
                value={selectedSalesperson}
                onChange={(e) => setSelectedSalesperson(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="all">เซลส์ทั้งหมด</option>
                {salespersons.map(sp => (
                  <option key={sp} value={sp}>{sp}</option>
                ))}
              </select>
            </div>
          )}

          {/* Toggle Advanced Filters */}
          <button 
            id="toggle-filters-btn"
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center justify-center gap-2 px-3.5 py-2 border rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${showFilters ? "border-blue-200 bg-blue-50 text-blue-600" : "border-slate-200 bg-white hover:bg-slate-50 text-slate-600"}`}
          >
            <SlidersHorizontal className="w-4 h-4" /> ตัวกรองเพิ่มเติม {showFilters ? "(ซ่อน)" : ""}
          </button>

          {/* Reset Filters Button */}
          {hasActiveFilters && (
            <button
              id="reset-filters-btn"
              onClick={resetFilters}
              className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap"
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
            className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100 text-xs"
          >
            <div>
              <label className="block text-slate-500 font-semibold mb-1">แคมเปญการตลาด</label>
              <select 
                id="filter-campaign-select"
                value={selectedCampaign} 
                onChange={(e) => setSelectedCampaign(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="all">ทั้งหมด ทุกแคมเปญ</option>
                {campaigns.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-slate-500 font-semibold mb-1">ช่องทางที่เข้ามา</label>
              <select 
                id="filter-channel-select"
                value={selectedChannel} 
                onChange={(e) => setSelectedChannel(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="all">ทั้งหมด ทุกจังหวัด</option>
                {ALL_PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-slate-500 font-semibold mb-1">คะแนน Lead Score</label>
              <select 
                id="filter-score-select"
                value={selectedScore.toString()} 
                onChange={(e) => setSelectedScore(e.target.value === "all" ? "all" : Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="all">ทั้งหมด ทุกคะแนน</option>
                <option value="5">⭐⭐⭐⭐⭐ พร้อมปิดดีล</option>
                <option value="4">⭐⭐⭐⭐ สนใจมาก</option>
                <option value="3">⭐⭐⭐ ปานกลาง</option>
                <option value="2">⭐⭐ ไม่พร้อม</option>
                <option value="1">⭐ ยังไม่สนใจ</option>
              </select>
            </div>
          </motion.div>
        )}

        {/* Filter Summary Counter */}
        {hasActiveFilters && (
          <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500 border-t border-slate-100">
            <span>
              ผลการค้นหา/กรองข้อมูล: พบล่าสุด <strong className="text-blue-600 font-bold">{filteredLeads.length}</strong> จากทั้งหมด {leads.length} รายการ
            </span>
          </div>
        )}
      </div>

      {/* Visual Workspace Rendering */}
      {viewType === "kanban" ? (
        /* KANBAN BOARD VIEW */
        <div id="kanban-scroller" className="flex gap-4 overflow-x-auto pb-6 pt-2 snap-x select-none min-h-[480px]">
          {PIPELINE_COLUMNS.map(col => {
            const columnLeads = filteredLeads.filter(l => l.status === col.id);
            const totalShipments = columnLeads.reduce((acc, l) => acc + l.shipmentsPerDay, 0);

            return (
              <div 
                key={col.id} 
                id={`kanban-col-${col.id}`}
                className={`w-72 shrink-0 rounded-xl border border-slate-200 bg-slate-50 flex flex-col snap-start overflow-hidden shadow-xs`}
              >
                {/* Column Header */}
                <div className={`p-3 border-b border-slate-200 flex items-center justify-between bg-white`}>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-800">{col.label}</span>
                    <span className="text-[10px] text-slate-400 font-medium">รวมยอดพัสดุ: {totalShipments} ชิ้น/เดือน</span>
                  </div>
                  <span className="bg-slate-100 text-slate-700 text-[10px] px-2 py-0.5 rounded-full font-bold">
                    {columnLeads.length}
                  </span>
                </div>

                {/* Column Body - Leads Cards List */}
                <div className="p-2 space-y-2.5 overflow-y-auto flex-1 max-h-[500px]">
                  {columnLeads.map(lead => (
                    <motion.div
                      key={lead.id}
                      id={`kanban-card-${lead.id}`}
                      layoutId={`lead-${lead.id}`}
                      onClick={() => onSelectLead(lead)}
                      className="bg-white p-3 rounded-lg border border-slate-200 hover:border-blue-500 hover:shadow-sm cursor-pointer transition-all space-y-2 relative"
                    >
                      {/* Shop Name & Score */}
                      <div className="flex items-start justify-between gap-1">
                        <h4 className="text-xs font-bold text-gray-800 line-clamp-2 pr-1">{lead.shopName}</h4>
                        <div className="flex shrink-0 items-center">
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
                              className="p-[1px] hover:scale-125 transition-transform cursor-pointer group"
                              title={`ปรับเป็น ${star} ดาว`}
                            >
                              <Star 
                                className={`w-3 h-3 ${star <= lead.score ? "text-amber-400 fill-amber-400" : "text-gray-200 group-hover:text-amber-300"}`} 
                              />
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Lead Contact Info Block */}
                      <div className="space-y-1 text-[10px] text-gray-500">
                        <p className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-gray-400 shrink-0" /> {lead.phone}
                        </p>
                        <p className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-gray-400 shrink-0" /> {lead.province}
                        </p>
                        <p className="flex items-center gap-1">
                          <ShoppingBag className="w-3 h-3 text-blue-500 shrink-0" /> ยอดส่ง: <span className="font-bold text-slate-700">{lead.shipmentsPerDay} ชิ้น/เดือน</span>
                        </p>
                      </div>

                      {/* Tags */}
                      {lead.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {lead.tags.slice(0, 3).map(t => (
                            <span key={t} className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">
                              {t}
                            </span>
                          ))}
                          {lead.tags.length > 3 && (
                            <span className="text-[9px] text-gray-400">+{lead.tags.length - 3}</span>
                          )}
                        </div>
                      )}

                      {/* Card Footer */}
                      <div className="border-t border-gray-50 pt-2 flex items-center justify-between text-[9px] text-gray-400 font-medium">
                        <div className="flex items-center gap-1 overflow-hidden">
                          <span>{lead.channel}</span>
                          {lead.campaign && (
                            <span className="bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-bold flex items-center gap-0.5 truncate shrink-0" title={`แคมเปญ: ${lead.campaign}`}>
                              <Megaphone className="w-2.5 h-2.5 shrink-0" />
                              <span className="truncate max-w-[90px]">{lead.campaign}</span>
                            </span>
                          )}
                        </div>
                        <span className="text-gray-400 shrink-0 ml-1">{lead.salesPerson}</span>
                      </div>

                      {/* Move Controls inside Card to allow switching without DND package */}
                      <div className="mt-2 pt-2 border-t border-gray-50 flex items-center gap-1 justify-end">
                        <select
                          id={`move-status-select-${lead.id}`}
                          value={lead.status}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => onUpdateLeadStatus(lead.id, e.target.value as LeadStatus)}
                          className="bg-gray-50 hover:bg-gray-100 border border-gray-200 text-[9px] text-gray-500 rounded px-1.5 py-0.5 focus:outline-none"
                        >
                          {PIPELINE_COLUMNS.map(opt => (
                            <option key={opt.id} value={opt.id}>ย้ายไป: {opt.label}</option>
                          ))}
                        </select>
                      </div>
                    </motion.div>
                  ))}

                  {columnLeads.length === 0 && (
                    <div className="py-12 text-center text-gray-300 text-[11px] border border-dashed border-gray-200 rounded-lg">
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
        <div id="list-view-table-wrapper" className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table id="leads-list-table" className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase text-[10px]">
                  <th className="p-4 pl-6">ชื่อร้าน / ผู้ติดต่อ</th>
                  <th className="p-4">เบอร์โทร / LINE ID</th>
                  <th className="p-4">จังหวัด</th>
                  <th className="p-4">ช่องทาง</th>
                  <th className="p-4">ยอดส่ง (เดือน)</th>
                  <th className="p-4">สถานะ</th>
                  <th className="p-4">ผู้ดูแล</th>
                  <th className="p-4 text-center">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLeads.map(lead => (
                  <tr 
                    key={lead.id} 
                    id={`list-row-${lead.id}`}
                    onClick={() => onSelectLead(lead)}
                    className="hover:bg-slate-50/50 cursor-pointer transition-colors"
                  >
                    <td className="p-4 pl-6 font-medium text-gray-800">
                      <div className="space-y-0.5">
                        <span className="font-bold text-gray-900 block">{lead.shopName}</span>
                        <span className="text-gray-400 text-[10px]">{lead.contactName || "ไม่ระบุผู้ติดต่อ"}</span>
                      </div>
                    </td>
                    <td className="p-4 text-gray-600 font-mono">
                      <div className="space-y-0.5">
                        <span className="block">{lead.phone}</span>
                        <span className="text-gray-400 text-[10px]">Line: {lead.lineId || "-"}</span>
                      </div>
                    </td>
                    <td className="p-4 text-gray-600">{lead.province}</td>
                    <td className="p-4 text-gray-600">
                      <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px]">{lead.channel}</span>
                    </td>
                    <td className="p-4 font-bold text-gray-700 font-mono">{lead.shipmentsPerDay} ชิ้น/เดือน</td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${StatusColors[lead.status]}`}>
                        {StatusLabels[lead.status]}
                      </span>
                    </td>
                    <td className="p-4 text-gray-500">{lead.salesPerson}</td>
                    <td className="p-4 text-center">
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
                              className={`w-3.5 h-3.5 ${star <= lead.score ? "text-amber-400 fill-amber-400" : "text-gray-200 group-hover:text-amber-300"}`} 
                            />
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredLeads.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-gray-400">
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
            className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-lg font-bold text-gray-900">เพิ่มลูกค้าเป้าหมายใหม่ (Create Lead)</h3>
                <p className="text-xs text-gray-400">กรอกข้อมูลที่จำเป็นของร้านค้าเพื่อบันทึกและรันขั้นตอนการปิดการขาย</p>
              </div>
              <button 
                id="close-add-lead-modal-btn"
                onClick={() => setIsAddOpen(false)} 
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleCreateLead} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Shop Name */}
                <div className="space-y-1">
                  <label className="block text-gray-600 font-bold">ชื่อร้านค้า / แบรนด์ <span className="text-rose-500">*</span></label>
                  <input 
                    id="new-lead-shop-name"
                    type="text" 
                    required
                    placeholder="เช่น ร้านชลธิชา บิวตี้" 
                    value={newShopName}
                    onChange={(e) => setNewShopName(e.target.value)}
                    className="w-full bg-slate-50 border border-gray-200 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  />
                </div>

                {/* Contact Name */}
                <div className="space-y-1">
                  <label className="block text-gray-600 font-bold">ชื่อผู้ติดต่อ</label>
                  <input 
                    id="new-lead-contact-name"
                    type="text" 
                    placeholder="เช่น คุณชลธิชา" 
                    value={newContactName}
                    onChange={(e) => setNewContactName(e.target.value)}
                    className="w-full bg-slate-50 border border-gray-200 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  />
                </div>

                {/* Phone */}
                <div className="space-y-1">
                  <label className="block text-gray-600 font-bold">เบอร์โทรศัพท์ <span className="text-rose-500">*</span></label>
                  <input 
                    id="new-lead-phone"
                    type="tel" 
                    required
                    placeholder="เช่น 081-234-5678" 
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-gray-200 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  />
                </div>

                {/* LINE ID */}
                <div className="space-y-1">
                  <label className="block text-gray-600 font-bold">LINE ID</label>
                  <input 
                    id="new-lead-line-id"
                    type="text" 
                    placeholder="เช่น chon.beauty" 
                    value={newLineId}
                    onChange={(e) => setNewLineId(e.target.value)}
                    className="w-full bg-slate-50 border border-gray-200 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  />
                </div>

                {/* Facebook */}
                <div className="space-y-1">
                  <label className="block text-gray-600 font-bold">Facebook Page / Profile</label>
                  <input 
                    id="new-lead-facebook"
                    type="text" 
                    placeholder="เช่น Chonlicha Beauty Official" 
                    value={newFacebook}
                    onChange={(e) => setNewFacebook(e.target.value)}
                    className="w-full bg-slate-50 border border-gray-200 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  />
                </div>

                {/* Customer Type */}
                <div className="space-y-1">
                  <label className="block text-gray-600 font-bold">ประเภทลูกค้า (บุคคล/นิติบุคคล)</label>
                  <select 
                    id="new-lead-customer-type"
                    value={newCustomerType}
                    onChange={(e) => setNewCustomerType(e.target.value as "individual" | "corporate")}
                    className="w-full bg-slate-50 border border-gray-200 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  >
                    <option value="individual">👤 บุคคลธรรมดา</option>
                    <option value="corporate">🏢 นิติบุคคล</option>
                  </select>
                </div>

                {/* Province */}
                <div className="space-y-1">
                  <label className="block text-gray-600 font-bold">จังหวัดที่จัดส่งพัสดุ</label>
                  <select 
                    id="new-lead-province"
                    value={newProvince}
                    onChange={(e) => setNewProvince(e.target.value)}
                    className="w-full bg-slate-50 border border-gray-200 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  >
                    {ALL_PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                    <option value="อื่นๆ">อื่นๆ (ต่างจังหวัด)</option>
                  </select>
                </div>

                {/* Channel */}
                <div className="space-y-1">
                  <label className="block text-gray-600 font-bold">ช่องทางที่ได้ Lead</label>
                  <select 
                    id="new-lead-channel"
                    value={newChannel}
                    onChange={(e) => setNewChannel(e.target.value)}
                    className="w-full bg-slate-50 border border-gray-200 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  >
                    {ALL_CHANNELS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                {/* Campaign */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="block text-gray-600 font-bold">แคมเปญการตลาด (Campaign)</label>
                    <button
                      type="button"
                      onClick={() => setShowCampaignManagerModal(true)}
                      className="text-[11px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>จัดการแคมเปญ (+ / -)</span>
                    </button>
                  </div>
                  <select 
                    id="new-lead-campaign"
                    value={newCampaign}
                    onChange={(e) => {
                      if (e.target.value === "__add_new__") {
                        setShowCampaignManagerModal(true);
                      } else {
                        setNewCampaign(e.target.value);
                      }
                    }}
                    className="w-full bg-slate-50 border border-gray-200 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-800"
                  >
                    <option value="">-- ไม่ได้ระบุแคมเปญ --</option>
                    {campaigns.map(c => <option key={c} value={c}>{c}</option>)}
                    <option value="__add_new__">➕ เพิ่ม/จัดการแคมเปญ...</option>
                  </select>
                </div>

                {/* Lead Score */}
                <div className="space-y-1">
                  <label className="block text-gray-600 font-bold">คะแนนความน่าสนใจ (Lead Score)</label>
                  <div className="flex gap-1.5 py-2">
                    {[1, 2, 3, 4, 5].map((num) => (
                      <button
                        key={num}
                        id={`new-lead-score-star-${num}`}
                        type="button"
                        onClick={() => setNewScore(num)}
                        className="p-1 hover:scale-110 transition-transform"
                      >
                        <Star className={`w-6 h-6 ${num <= newScore ? "text-amber-400 fill-amber-400" : "text-gray-200"}`} />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Address */}
              <div className="space-y-1">
                <label className="block text-gray-600 font-bold">ที่อยู่อย่างละเอียด (สำหรับใช้ทำเรื่องเรียกรถเข้ารับพัสดุ)</label>
                <textarea 
                  id="new-lead-address"
                  rows={2}
                  placeholder="กรอกที่อยู่อย่างละเอียด..."
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  className="w-full bg-slate-50 border border-gray-200 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>

              {/* Logistics Specific Fields */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-blue-50/50 p-3.5 rounded-xl border border-blue-100">
                {/* Shipments per day */}
                <div className="space-y-1 col-span-1">
                  <label className="block text-slate-800 font-bold">ยอดจัดส่งพัสดุเฉลี่ย (ชิ้น/เดือน)</label>
                  <input 
                    id="new-lead-shipments-per-day"
                    type="number" 
                    min={0}
                    value={newShipmentsPerDay}
                    onChange={(e) => setNewShipmentsPerDay(Number(e.target.value))}
                    className="w-full bg-white border border-blue-200 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Competitor */}
                <div className="space-y-1 col-span-1">
                  <label className="block text-slate-800 font-bold">ขนส่ง/ระบบคู่แข่งที่ใช้อยู่</label>
                  <input 
                    id="new-lead-competitor"
                    type="text" 
                    placeholder="เช่น Shipnity, Kerry, Flash เดิม"
                    value={newCompetitor}
                    onChange={(e) => setNewCompetitor(e.target.value)}
                    className="w-full bg-white border border-blue-200 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Salesperson */}
                <div className="space-y-1 col-span-1">
                  <label className="block text-slate-800 font-bold">เซลส์ผู้รับผิดชอบดูแล</label>
                  <select 
                    id="new-lead-salesperson"
                    value={newSalesPerson}
                    onChange={(e) => setNewSalesPerson(e.target.value)}
                    className="w-full bg-white border border-blue-200 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {salespersons.map((sp) => (
                      <option key={sp} value={sp}>{sp}</option>
                    ))}
                  </select>
                </div>

                {/* Transport Options (flash/ dhl/ spx /kex /best express / ไปรษณีย์ / ขนส่งต่างประเทศ / ทั้งหมด) */}
                <div className="space-y-1 col-span-3">
                  <label className="block text-slate-800 font-bold">ค่ายขนส่งที่ลูกค้าสนใจเป็นพิเศษ</label>
                  <div className="flex flex-wrap gap-x-4 gap-y-2 mt-1">
                    {TRANSPORT_CARRIERS.map((t) => (
                      <label key={t} className="flex items-center gap-2 font-medium text-slate-700 cursor-pointer">
                        <input
                          id={`new-lead-transport-checkbox-${t}`}
                          type="checkbox"
                          checked={newPreferredTransport.includes(t)}
                          onChange={() => toggleTransport(t)}
                          className="w-4 h-4 text-blue-600 border-blue-300 rounded focus:ring-blue-500"
                        />
                        <span className="capitalize">{t}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Tags Selector */}
              <div className="space-y-1">
                <label className="block text-slate-600 font-bold">ประเภทธุรกิจ / คุณสมบัติลูกค้า (Tags)</label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {ALL_TAGS.map((tag) => (
                    <button
                      key={tag}
                      id={`new-lead-tag-btn-${tag}`}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`px-3 py-1.5 rounded-full text-[10px] font-semibold border transition-all cursor-pointer ${newTags.includes(tag) ? "bg-blue-600 text-white border-blue-600 shadow-xs" : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"}`}
                    >
                      {tag}
                    </button>
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
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-800"
                />
              </div>

              {/* Footer Actions */}
              <div className="flex justify-end gap-2.5 border-t border-slate-100 pt-4 mt-2">
                <button 
                  id="cancel-add-lead-btn"
                  type="button" 
                  onClick={() => setIsAddOpen(false)} 
                  className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 rounded-lg font-bold transition-all cursor-pointer text-xs"
                >
                  ยกเลิก
                </button>
                <button 
                  id="submit-add-lead-btn"
                  type="submit" 
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold transition-all cursor-pointer shadow-xs text-xs"
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
    </div>
  );
}
