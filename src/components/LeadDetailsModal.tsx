import React, { useState } from "react";
import { Lead, LeadStatus, StatusLabels, StatusColors, Note, TimelineItem, Documents, THAI_PROVINCES, TRANSPORT_CARRIERS } from "../types";
import { 
  X, Calendar, Clock, Star, Phone, MapPin, Tag, Briefcase, 
  Plus, Trash2, FileText, UploadCloud, MessageSquare, ClipboardCheck, 
  Clock3, ShieldCheck, HelpCircle, Package, Send, Copy, Check,
  Image as ImageIcon, Eye, Download, Loader2, Paperclip,
  Sparkles, TrendingUp, CheckCircle2, AlertTriangle, Lightbulb, Zap, ShieldAlert,
  Megaphone, Pencil, Share2
} from "lucide-react";
import { motion } from "motion/react";
import CampaignManagerModal from "./CampaignManagerModal";

interface LeadDetailsModalProps {
  lead: Lead;
  salespersons?: string[];
  campaigns?: string[];
  onAddCampaign?: (name: string) => Promise<void>;
  onDeleteCampaign?: (name: string) => Promise<void>;
  currentUser?: string | null;
  onClose: () => void;
  onUpdateLead: (updatedLead: Lead) => void;
  onAddNote: (leadId: string, text: string, author: string) => void;
  onAddCall: (leadId: string, answered: boolean, interestLevel: number, notes: string, nextFollowUpInDays?: number, customFollowUpDate?: string) => void;
  onAddFile: (leadId: string, name: string, size: string, type: "image" | "pdf" | "other", url?: string) => void;
  onDeleteLead?: (leadId: string) => Promise<boolean> | void;
}

const ALL_STATUSES = Object.values(LeadStatus);
const PROVINCES = THAI_PROVINCES;
const ALL_CHANNELS = ["Facebook", "TikTok", "Website", "Line OA", "โทรเข้า", "คนแนะนำ", "หาเอง", "Shopee", "Lazada", "Instagram", "อื่นๆ"];


export default function LeadDetailsModal({ 
  lead, 
  salespersons = ["Phere", "Nalin", "Beer"], 
  campaigns = [],
  onAddCampaign,
  onDeleteCampaign,
  currentUser = null, 
  onClose, 
  onUpdateLead, 
  onDeleteLead, 
  onAddNote, 
  onAddCall, 
  onAddFile 
}: LeadDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<"timeline" | "calls" | "notes" | "files" | "ai">("timeline");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeletingLead, setIsDeletingLead] = useState(false);
  
  // AI Customer Analysis state
  const [aiAnalysis, setAiAnalysis] = useState<{
    winProbability: number;
    dealUrgency: "high" | "medium" | "low";
    summary: string;
    customerPersona: string;
    strengths: string[];
    challenges: string[];
    recommendedAction: string;
    salesPitchScript: string;
    suggestedOffers: string[];
  } | null>(null);
  const [isAnalyzingAI, setIsAnalyzingAI] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [copiedScript, setCopiedScript] = useState(false);

  const handleRunAIAnalysis = async () => {
    setIsAnalyzingAI(true);
    setAiError(null);
    try {
      const res = await fetch("/api/ai/analyze-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead })
      });
      if (!res.ok) {
        throw new Error("เกิดข้อผิดพลาดในการประมวลผลด้วย AI");
      }
      const data = await res.json();
      setAiAnalysis(data);
    } catch (err: any) {
      setAiError(err.message || "ไม่สามารถวิเคราะห์ข้อมูลได้ในขณะนี้");
    } finally {
      setIsAnalyzingAI(false);
    }
  };
  
  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [isQuickEditingChannel, setIsQuickEditingChannel] = useState(false);
  const [showCampaignManagerModal, setShowCampaignManagerModal] = useState(false);
  const [editShopName, setEditShopName] = useState(lead.shopName || "");
  const [editContactName, setEditContactName] = useState(lead.contactName || "");
  const [editPhone, setEditPhone] = useState(lead.phone || "");
  const [editLineId, setEditLineId] = useState(lead.lineId || "");
  const [editFacebook, setEditFacebook] = useState(lead.facebook || "");
  const [editProvince, setEditProvince] = useState(lead.province || "กรุงเทพมหานคร");
  const [editChannel, setEditChannel] = useState(lead.channel || "Facebook");
  const [editCampaign, setEditCampaign] = useState(lead.campaign || "");
  const [editAddress, setEditAddress] = useState(lead.address || "");
  const [editShipments, setEditShipments] = useState(lead.shipmentsPerDay || 0);
  const [editCompetitor, setEditCompetitor] = useState(lead.competitor || "");
  const [editScore, setEditScore] = useState(lead.score || 3);
  const [editSalesperson, setEditSalesperson] = useState(lead.salesPerson || "");
  const [editTransport, setEditTransport] = useState<string[]>(lead.preferredTransport || []);
  const [editCustomerType, setEditCustomerType] = useState<"individual" | "corporate">(lead.customerType || "individual");
  
  // Custom billing fields (Visible if registered or activated)
  const [editCustomerCode, setEditCustomerCode] = useState(lead.customerCode || "");
  const [editRatePlan, setEditRatePlan] = useState(lead.ratePlan || "");
  const [editPaymentType, setEditPaymentType] = useState(lead.paymentType || "เติมเงิน");

  // Follow-up setting state
  const [followUpDate, setFollowUpDate] = useState(lead.followUp?.date || "");
  const [followUpTime, setFollowUpTime] = useState(lead.followUp?.time || "10:00");
  const [followUpCompleted, setFollowUpCompleted] = useState(lead.followUp?.isCompleted || false);
  const [followUpNote, setFollowUpNote] = useState(lead.followUp?.note || "");
  const [isSavingFollowUp, setIsSavingFollowUp] = useState(false);
  const [saveFollowUpSuccess, setSaveFollowUpSuccess] = useState(false);

  // Sync state when lead prop updates
  React.useEffect(() => {
    setEditShopName(lead.shopName || "");
    setEditContactName(lead.contactName || "");
    setEditPhone(lead.phone || "");
    setEditLineId(lead.lineId || "");
    setEditFacebook(lead.facebook || "");
    setEditProvince(lead.province || "กรุงเทพมหานคร");
    setEditChannel(lead.channel || "Facebook");
    setEditCampaign(lead.campaign || "");
    setEditAddress(lead.address || "");
    setEditShipments(lead.shipmentsPerDay || 0);
    setEditCompetitor(lead.competitor || "");
    setEditScore(lead.score || 3);
    setEditSalesperson(lead.salesPerson || "");
    setEditTransport(lead.preferredTransport || []);
    setEditCustomerType(lead.customerType || "individual");
    setEditCustomerCode(lead.customerCode || "");
    setEditRatePlan(lead.ratePlan || "");
    setEditPaymentType(lead.paymentType || "เติมเงิน");
    setFollowUpDate(lead.followUp?.date || "");
    setFollowUpTime(lead.followUp?.time || "10:00");
    setFollowUpCompleted(lead.followUp?.isCompleted || false);
    setFollowUpNote(lead.followUp?.note || "");
  }, [
    lead.id, 
    lead.updatedAt, 
    lead.channel, 
    lead.shopName, 
    lead.status, 
    lead.followUp?.date, 
    lead.followUp?.time, 
    lead.followUp?.isCompleted, 
    lead.followUp?.note
  ]);

  // Notes state
  const [noteText, setNoteText] = useState("");
  const [noteAuthor, setNoteAuthor] = useState(() => currentUser || salespersons[0] || "Phere");

  React.useEffect(() => {
    if (currentUser) {
      setNoteAuthor(currentUser);
    } else if (salespersons.length > 0) {
      setNoteAuthor(salespersons[0]);
    }
  }, [currentUser, salespersons]);

  // Calls logger state
  const [callAnswered, setCallAnswered] = useState(true);
  const [callInterest, setCallInterest] = useState(4);
  const [callNotes, setCallNotes] = useState("");
  const [callFollowDays, setCallFollowDays] = useState("3");
  const [customCallDate, setCustomCallDate] = useState("");

  // Real File upload state
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [fileType, setFileType] = useState<"image" | "pdf" | "other">("image");
  const [isUploading, setIsUploading] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setFileName(file.name);

    if (file.type.startsWith("image/")) {
      setFileType("image");
      const reader = new FileReader();
      reader.onload = (e) => {
        setFilePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
      setFileType("pdf");
      setFilePreview(null);
    } else {
      setFileType("other");
      setFilePreview(null);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Copy to clipboard state & helper
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopyText = (text: string, fieldName: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => {
      setCopiedField(null);
    }, 2000);
  };

  const getFullContactSummary = () => {
    const lines = [
      `ชื่อร้านค้า/แบรนด์: ${lead.shopName || "-"}`,
      `ชื่อผู้ติดต่อ: ${lead.contactName || "-"}`,
      `เบอร์โทรศัพท์: ${lead.phone || "-"}`,
      `LINE ID: ${lead.lineId ? `@${lead.lineId}` : "-"}`,
      `Facebook Page: ${lead.facebook || "-"}`,
      `จังหวัด: ${lead.province || "-"}`,
      `ที่อยู่: ${lead.address || "-"}`,
      lead.customerCode ? `รหัสลูกค้า: ${lead.customerCode}` : null,
      `ยอดส่งเฉลี่ย: ${lead.shipmentsPerDay || 0} ชิ้น/เดือน`,
      `เซลส์ผู้ดูแล: ${lead.salesPerson || "-"}`
    ].filter(Boolean);
    return lines.join("\n");
  };

  // Documents Checklist computations
  const docs = lead.documents || { idCard: false, bookBank: false, companyReg: false, taxDoc: false, storefrontPhoto: false };
  
  const isCorporate = lead.customerType === "corporate";

  const getMissingDocsText = () => {
    const missing: string[] = [];
    if (!docs.idCard) missing.push("บัตรประชาชน");
    if (isCorporate && !docs.companyReg) missing.push("หนังสือรับรองบริษัท");
    if (isCorporate && !docs.taxDoc) missing.push("ใบทะเบียนภาษี (ภพ.20)");
    if (!docs.storefrontPhoto) missing.push("รูปถ่ายหน้าร้าน");
    
    if (missing.length === 0) return "✓ เอกสารยื่นครบถ้วนสมบูรณ์";
    return `เหลือ ${missing.join(", ")}`;
  };

  const hasMissingDocs = isCorporate 
    ? (!docs.idCard || !docs.companyReg || !docs.taxDoc || !docs.storefrontPhoto)
    : (!docs.idCard || !docs.storefrontPhoto);

  // Quick date helper
  const handleSetQuickDate = (daysAhead: number) => {
    const target = new Date();
    target.setDate(target.getDate() + daysAhead);
    const dateStr = target.toISOString().split("T")[0];
    setFollowUpDate(dateStr);
    setFollowUpCompleted(false);
  };

  // Handle updates
  const handleSaveDetails = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateLead({
      ...lead,
      shopName: editShopName,
      contactName: editContactName,
      phone: editPhone,
      lineId: editLineId,
      facebook: editFacebook,
      province: editProvince,
      channel: editChannel.trim() || "Facebook",
      address: editAddress,
      shipmentsPerDay: Number(editShipments) || 0,
      competitor: editCompetitor,
      score: editScore,
      salesPerson: editSalesperson,
      campaign: editCampaign ? editCampaign.trim() : "",
      preferredTransport: editTransport,
      customerType: editCustomerType,
      customerCode: editCustomerCode ? editCustomerCode.trim() : "",
      ratePlan: editRatePlan ? editRatePlan.trim() : "",
      paymentType: editPaymentType ? editPaymentType.trim() : "",
      followUp: {
        date: followUpDate,
        time: followUpTime,
        isCompleted: followUpCompleted,
        note: followUpNote ? followUpNote.trim() : ""
      }
    });
    setIsEditing(false);
  };

  const handleToggleDoc = (key: keyof Documents) => {
    const updatedDocs = {
      ...docs,
      [key]: !docs[key]
    };
    onUpdateLead({
      ...lead,
      documents: updatedDocs
    });
  };

  const handleUpdateStatus = (status: LeadStatus) => {
    onUpdateLead({
      ...lead,
      status
    });
  };

  const handleSaveFollowUpSettings = async () => {
    if (!followUpDate) {
      alert("กรุณาระบุหรือเลือกวันที่ต้องการโทรติดตามผล");
      return;
    }
    setIsSavingFollowUp(true);
    try {
      const updatedTimeline = [...(lead.timeline || [])];
      updatedTimeline.unshift({
        id: `id_${Math.random().toString(36).substring(2, 11)}`,
        title: "บันทึกแผนโทรติดตาม (Follow Up Plan)",
        description: `นัดหมายโทรวันที่ ${followUpDate} เวลา ${followUpTime || "10:00"} น.${followUpNote ? ` (หมายเหตุ: ${followUpNote})` : ""} [${followUpCompleted ? "ทำเครื่องหมายเป็นโทรแล้ว" : "รอดำเนินการ"}]`,
        date: new Date().toISOString(),
        type: "call"
      });

      await onUpdateLead({
        ...lead,
        timeline: updatedTimeline,
        followUp: {
          date: followUpDate,
          time: followUpTime || "10:00",
          isCompleted: followUpCompleted,
          note: followUpNote ? followUpNote.trim() : ""
        }
      });
      setSaveFollowUpSuccess(true);
      setTimeout(() => {
        setSaveFollowUpSuccess(false);
      }, 2500);
    } catch (err) {
      console.error("Failed to save follow up plan:", err);
    } finally {
      setIsSavingFollowUp(false);
    }
  };

  const submitNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim()) return;
    onAddNote(lead.id, noteText, noteAuthor);
    setNoteText("");
  };

  const submitCall = (e: React.FormEvent) => {
    e.preventDefault();
    const days = callFollowDays === "custom" ? undefined : (Number(callFollowDays) || undefined);
    const customDate = callFollowDays === "custom" && customCallDate ? customCallDate : undefined;
    
    onAddCall(
      lead.id, 
      callAnswered, 
      callInterest, 
      callNotes || (callAnswered ? "โทรสำเร็จลูกค้าสนใจข้อมูล" : "ไม่รับสาย"), 
      days, 
      customDate
    );
    setCallNotes("");
    setActiveTab("timeline");
  };

  const submitFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile && !fileName.trim()) return;

    setIsUploading(true);

    try {
      let fileDataUrl = "#";
      let formattedSize = "120 KB";

      if (selectedFile) {
        formattedSize = formatFileSize(selectedFile.size);
        fileDataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (ev) => resolve(ev.target?.result as string || "#");
          reader.onerror = () => resolve("#");
          reader.readAsDataURL(selectedFile);
        });
      }

      const nameToSave = fileName.trim() || (selectedFile ? selectedFile.name : "ไฟล์เอกสารแนบ");
      onAddFile(lead.id, nameToSave, formattedSize, fileType, fileDataUrl);

      setSelectedFile(null);
      setFilePreview(null);
      setFileName("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err) {
      console.error("Error uploading file:", err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteFile = (fileId: string) => {
    const updatedFiles = (lead.files || []).filter(f => f.id !== fileId);
    onUpdateLead({
      ...lead,
      files: updatedFiles
    });
  };

  const toggleTransport = (t: string) => {
    if (editTransport.includes(t)) {
      setEditTransport(editTransport.filter(x => x !== t));
    } else {
      setEditTransport([...editTransport, t]);
    }
  };

  // Check if followUp is today or overdue
  const todayStr = new Date().toISOString().split("T")[0];
  const isFollowUpOverdue = lead.followUp && !lead.followUp.isCompleted && lead.followUp.date < todayStr;
  const isFollowUpToday = lead.followUp && !lead.followUp.isCompleted && lead.followUp.date === todayStr;

  return (
    <div id="lead-details-modal-container" className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }} 
        animate={{ scale: 1, opacity: 1 }} 
        className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-5xl w-full p-6 space-y-4 max-h-[95vh] overflow-y-auto flex flex-col"
      >
        {/* Header bar */}
        <div className="flex justify-between items-start border-b border-slate-200 pb-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900 font-sans">{lead.shopName}</h2>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${StatusColors[lead.status]}`}>
                {StatusLabels[lead.status]}
              </span>
              <button
                id="header-quick-ai-analyze-btn"
                onClick={() => {
                  setActiveTab("ai");
                  if (!aiAnalysis && !isAnalyzingAI) {
                    handleRunAIAnalysis();
                  }
                }}
                className="px-2.5 py-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1 shadow-2xs cursor-pointer ml-1"
                title="คลิกเพื่อให้อัลกอริทึม Gemini AI วิเคราะห์โอกาสปิดการขาย"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                <span>✨ AI วิเคราะห์</span>
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
              <p>เซลส์ดูแล: <span className="font-semibold text-slate-700">{lead.salesPerson || "-"}</span></p>
              <span>•</span>
              <div className="flex items-center gap-1.5">
                <span>ช่องทางเข้ามา:</span>
                {isQuickEditingChannel ? (
                  <select
                    id="header-quick-channel-select"
                    value={lead.channel || "Facebook"}
                    onChange={(e) => {
                      const newCh = e.target.value;
                      setEditChannel(newCh);
                      onUpdateLead({ ...lead, channel: newCh });
                      setIsQuickEditingChannel(false);
                    }}
                    onBlur={() => setIsQuickEditingChannel(false)}
                    autoFocus
                    className="bg-white border border-blue-400 text-blue-800 text-[11px] font-bold rounded px-1.5 py-0.5 shadow-xs focus:outline-none"
                  >
                    {ALL_CHANNELS.map(ch => (
                      <option key={ch} value={ch}>{ch}</option>
                    ))}
                  </select>
                ) : (
                  <button
                    type="button"
                    id="header-quick-channel-btn"
                    onClick={() => setIsQuickEditingChannel(true)}
                    className="inline-flex items-center gap-1 font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2 py-0.5 rounded text-[11px] transition-colors cursor-pointer"
                    title="คลิกเพื่อเปลี่ยนช่องทางที่เข้ามา"
                  >
                    <span>{lead.channel || "Facebook"}</span>
                    <Pencil className="w-2.5 h-2.5 opacity-60" />
                  </button>
                )}
              </div>
              <span>•</span>
              <p>ยอดส่ง: <span className="font-semibold text-blue-600">{lead.shipmentsPerDay || 0} ชิ้น/เดือน</span></p>
            </div>
          </div>
          <button 
            id="close-lead-details-modal-btn"
            onClick={onClose} 
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dynamic Warning for overdue calls or missing documents */}
        {(isFollowUpToday || isFollowUpOverdue || (lead.status === LeadStatus.WAITING_DOCS && hasMissingDocs)) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {/* Call Warning */}
            {(isFollowUpToday || isFollowUpOverdue) && (
              <div id="overdue-call-banner" className={`p-3 rounded-lg flex items-center justify-between border ${isFollowUpOverdue ? "bg-red-50 text-red-900 border-red-100" : "bg-amber-50 text-amber-900 border-amber-100"}`}>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-red-600 shrink-0" />
                  <div>
                    <span className="font-bold block">{isFollowUpOverdue ? "🔴 เกินกำหนดการนัดติดตาม" : "🟡 มีกำหนดติดต่อในวันนี้"}</span>
                    <span className="text-[10px] text-gray-500">นัดหมาย: {lead.followUp.date} เวลา {lead.followUp.time} น.</span>
                  </div>
                </div>
                <button 
                  id="mark-call-done-quick"
                  onClick={() => {
                    onUpdateLead({
                      ...lead,
                      followUp: { ...lead.followUp, isCompleted: true }
                    });
                    setFollowUpCompleted(true);
                  }}
                  className="bg-white hover:bg-gray-100 text-[10px] font-bold text-gray-700 py-1 px-2 border rounded transition-colors shrink-0"
                >
                  ทำเครื่องหมายเป็นโทรแล้ว
                </button>
              </div>
            )}

            {/* Document Check alert */}
            {lead.status === LeadStatus.WAITING_DOCS && (
              <div id="missing-docs-banner" className={`p-3 rounded-lg flex items-center gap-2 border ${hasMissingDocs ? "bg-amber-50 text-amber-900 border-amber-100" : "bg-emerald-50 text-emerald-900 border-emerald-100"}`}>
                <FileText className={`w-4 h-4 shrink-0 ${hasMissingDocs ? "text-amber-600" : "text-emerald-600"}`} />
                <div>
                  <span className="font-bold block">{hasMissingDocs ? "⚠️ เอกสารยื่นสมัครยังไม่สมบูรณ์" : "❇️ เอกสารครบถ้วนสมบูรณ์"}</span>
                  <span className="text-[10px] text-gray-500 font-medium">{getMissingDocsText()}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Modal Grid content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 min-h-0 overflow-y-auto">
          
          {/* Left Column (6/12) - Customer Core Profile, Documents check, Billing info */}
          <div className="lg:col-span-7 space-y-4">
            
            {/* Status quick switcher */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700">ปรับสถานะ Pipeline:</span>
              <select
                id="details-status-switcher"
                value={lead.status}
                onChange={(e) => handleUpdateStatus(e.target.value as LeadStatus)}
                className="bg-white border border-slate-200 rounded px-2.5 py-1 text-slate-600 font-semibold focus:outline-none cursor-pointer"
              >
                {ALL_STATUSES.map(st => (
                  <option key={st} value={st}>{StatusLabels[st]}</option>
                ))}
              </select>
            </div>

            {/* Profile detail card */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Briefcase className="w-4 h-4 text-blue-500" /> รายละเอียดข้อมูลร้านค้า
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    id="copy-lead-full-info-btn"
                    type="button"
                    onClick={() => handleCopyText(getFullContactSummary(), "full")}
                    className={`text-xs font-bold px-2.5 py-1 rounded-md border flex items-center gap-1.5 transition-all cursor-pointer ${
                      copiedField === "full" 
                        ? "bg-emerald-50 border-emerald-300 text-emerald-700 shadow-xs" 
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                    title="คัดลอกสรุปข้อมูลติดต่อทั้งหมดลง Clipboard"
                  >
                    {copiedField === "full" ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>คัดลอกเรียบร้อย!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-500" />
                        <span>คัดลอกข้อมูล</span>
                      </>
                    )}
                  </button>

                  <button
                    id="toggle-edit-details-btn"
                    type="button"
                    onClick={() => setIsEditing(!isEditing)}
                    className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer px-1 py-1"
                  >
                    {isEditing ? "ยกเลิกแก้ไข" : "📝 แก้ไขข้อมูล"}
                  </button>
                </div>
              </div>

              {isEditing ? (
                /* EDIT FORM */
                <form onSubmit={handleSaveDetails} className="space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="text-gray-500 font-semibold block mb-0.5">ชื่อร้านค้า</label>
                      <input 
                        id="edit-shop-name"
                        type="text" 
                        value={editShopName} 
                        onChange={(e) => setEditShopName(e.target.value)} 
                        className="w-full bg-slate-50 border p-2 rounded"
                      />
                    </div>
                    <div>
                      <label className="text-gray-500 font-semibold block mb-0.5">ชื่อผู้ติดต่อ</label>
                      <input 
                        id="edit-contact-name"
                        type="text" 
                        value={editContactName} 
                        onChange={(e) => setEditContactName(e.target.value)} 
                        className="w-full bg-slate-50 border p-2 rounded"
                      />
                    </div>
                    <div>
                      <label className="text-gray-500 font-semibold block mb-0.5">เบอร์โทรศัพท์</label>
                      <input 
                        id="edit-phone"
                        type="text" 
                        value={editPhone} 
                        onChange={(e) => setEditPhone(e.target.value)} 
                        className="w-full bg-slate-50 border p-2 rounded"
                      />
                    </div>
                    <div>
                      <label className="text-gray-500 font-semibold block mb-0.5">LINE ID</label>
                      <input 
                        id="edit-line-id"
                        type="text" 
                        value={editLineId} 
                        onChange={(e) => setEditLineId(e.target.value)} 
                        className="w-full bg-slate-50 border p-2 rounded"
                      />
                    </div>
                    <div>
                      <label className="text-gray-500 font-semibold block mb-0.5">Facebook Page</label>
                      <input 
                        id="edit-facebook"
                        type="text" 
                        value={editFacebook} 
                        onChange={(e) => setEditFacebook(e.target.value)} 
                        className="w-full bg-slate-50 border p-2 rounded"
                      />
                    </div>
                    <div>
                      <label className="text-gray-500 font-semibold block mb-0.5">จังหวัด</label>
                      <select 
                        id="edit-province"
                        value={editProvince} 
                        onChange={(e) => setEditProvince(e.target.value)} 
                        className="w-full bg-slate-50 border p-2 rounded"
                      >
                        {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-gray-500 font-semibold block mb-0.5">ช่องทางที่เข้ามา (Channel)</label>
                      <select 
                        id="edit-channel"
                        value={editChannel} 
                        onChange={(e) => setEditChannel(e.target.value)} 
                        className="w-full bg-slate-50 border p-2 rounded font-semibold text-slate-700"
                      >
                        {ALL_CHANNELS.map(ch => (
                          <option key={ch} value={ch}>{ch}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-gray-500 font-semibold block mb-0.5">เซลส์ผู้ดูแล</label>
                      <select 
                        id="edit-salesperson"
                        value={editSalesperson} 
                        onChange={(e) => setEditSalesperson(e.target.value)} 
                        className="w-full bg-slate-50 border p-2 rounded"
                      >
                        {salespersons.map((sp) => (
                          <option key={sp} value={sp}>{sp}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-0.5">
                        <label className="text-gray-500 font-semibold block">แคมเปญการตลาด</label>
                        <button
                          type="button"
                          onClick={() => setShowCampaignManagerModal(true)}
                          className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-0.5 cursor-pointer"
                        >
                          <Plus className="w-2.5 h-2.5" />
                          <span>จัดการ (+ / -)</span>
                        </button>
                      </div>
                      <select 
                        id="edit-campaign"
                        value={editCampaign} 
                        onChange={(e) => {
                          if (e.target.value === "__add_new__") {
                            setShowCampaignManagerModal(true);
                          } else {
                            setEditCampaign(e.target.value);
                          }
                        }} 
                        className="w-full bg-slate-50 border p-2 rounded"
                      >
                        <option value="">-- ไม่ได้ระบุแคมเปญ --</option>
                        {campaigns.map(c => <option key={c} value={c}>{c}</option>)}
                        <option value="__add_new__">➕ เพิ่ม/จัดการแคมเปญ...</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-gray-500 font-semibold block mb-0.5">ยอดส่งต่อเดือน (ชิ้น/เดือน)</label>
                      <input 
                        id="edit-shipments"
                        type="number" 
                        value={editShipments} 
                        onChange={(e) => setEditShipments(Number(e.target.value))} 
                        className="w-full bg-slate-50 border p-2 rounded"
                      />
                    </div>
                    <div>
                      <label className="text-gray-500 font-semibold block mb-0.5">คู่แข่งที่ใช้อยู่</label>
                      <input 
                        id="edit-competitor"
                        type="text" 
                        value={editCompetitor} 
                        onChange={(e) => setEditCompetitor(e.target.value)} 
                        className="w-full bg-slate-50 border p-2 rounded"
                      />
                    </div>
                    <div>
                      <label className="text-gray-500 font-semibold block mb-0.5">ประเภทลูกค้า</label>
                      <select
                        id="edit-customer-type"
                        value={editCustomerType}
                        onChange={(e) => setEditCustomerType(e.target.value as "individual" | "corporate")}
                        className="w-full bg-slate-50 border p-2.5 rounded font-bold"
                      >
                        <option value="individual">👤 บุคคลธรรมดา</option>
                        <option value="corporate">🏢 นิติบุคคล</option>
                      </select>
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <label className="text-gray-500 font-semibold block mb-0.5">ระดับความสนใจ (Lead Score)</label>
                      <div className="flex items-center gap-1.5 p-1.5 bg-slate-50 border border-slate-200 rounded-lg">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            id={`edit-lead-score-star-${star}`}
                            type="button"
                            onClick={() => setEditScore(star)}
                            className="p-1 hover:scale-110 transition-transform cursor-pointer"
                            title={`ปรับเป็น ${star} ดาว`}
                          >
                            <Star className={`w-5 h-5 ${star <= editScore ? "text-amber-400 fill-amber-400" : "text-slate-300"}`} />
                          </button>
                        ))}
                        <span className="text-xs font-bold text-slate-700 ml-1 font-mono">{editScore}/5</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-gray-500 font-semibold block mb-0.5">ที่อยู่อย่างละเอียด</label>
                    <textarea 
                      id="edit-address"
                      rows={2} 
                      value={editAddress} 
                      onChange={(e) => setEditAddress(e.target.value)} 
                      className="w-full bg-slate-50 border p-2 rounded"
                    />
                  </div>

                  {/* Registered/Activated Fields */}
                  {(lead.status === LeadStatus.REGISTERED || lead.status === LeadStatus.ACTIVATED || lead.status === LeadStatus.REGULAR) && (
                    <div className="bg-slate-50 p-3 rounded-lg border space-y-2">
                      <p className="font-bold text-gray-700">ข้อมูลรหัสและการตั้งค่าเปิดพอร์ต</p>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-gray-500 block text-[10px]">รหัสลูกค้า (Customer Code)</label>
                          <input type="text" value={editCustomerCode} onChange={(e) => setEditCustomerCode(e.target.value)} className="w-full bg-white border p-1 rounded" placeholder="เช่น ML000001" />
                        </div>
                        <div>
                          <label className="text-gray-500 block text-[10px]">เรทราคาที่เสนอ</label>
                          <input type="text" value={editRatePlan} onChange={(e) => setEditRatePlan(e.target.value)} className="w-full bg-white border p-1 rounded" placeholder="ระบุเรทราคาที่เสนอ (เว้นว่างได้)" />
                        </div>
                        <div>
                          <label className="text-gray-500 block text-[10px]">ประเภทชำระเงิน</label>
                          <select value={editPaymentType} onChange={(e) => setEditPaymentType(e.target.value)} className="w-full bg-white border p-1 rounded">
                            <option value="เติมเงิน">เติมเงิน</option>
                            <option value="เครดิต">เครดิต</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-gray-500 font-semibold block mb-0.5">สนใจขนส่ง</label>
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      {TRANSPORT_CARRIERS.map(t => (
                        <label key={t} className="flex items-center gap-1 cursor-pointer">
                          <input type="checkbox" checked={editTransport.includes(t)} onChange={() => toggleTransport(t)} />
                          <span className="capitalize">{t}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t">
                    <button type="button" onClick={() => setIsEditing(false)} className="px-3 py-1.5 border rounded text-gray-600">ยกเลิก</button>
                    <button id="save-edit-details-btn" type="submit" className="px-4 py-1.5 bg-indigo-600 text-white rounded font-bold shadow-xs">บันทึกข้อมูล</button>
                  </div>
                </form>
              ) : (
                /* READ-ONLY DISPLAY */
                <div className="space-y-3 text-xs text-gray-700">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <span className="text-gray-400 block text-[10px]">ชื่อผู้ติดต่อ</span>
                      <span className="font-semibold">{lead.contactName || "-"}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[10px]">เบอร์โทรศัพท์</span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="font-semibold font-mono">{lead.phone || "-"}</span>
                        {lead.phone && (
                          <button
                            id="copy-lead-phone-btn"
                            type="button"
                            onClick={() => handleCopyText(lead.phone, "phone")}
                            className="p-1 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                            title="คัดลอกเบอร์โทรศัพท์"
                          >
                            {copiedField === "phone" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        )}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[10px]">LINE ID</span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="font-semibold text-indigo-600">{lead.lineId ? `@${lead.lineId}` : "-"}</span>
                        {lead.lineId && (
                          <button
                            id="copy-lead-line-btn"
                            type="button"
                            onClick={() => handleCopyText(lead.lineId, "line")}
                            className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                            title="คัดลอก LINE ID"
                          >
                            {copiedField === "line" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        )}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[10px]">Facebook Page</span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="font-semibold truncate block">{lead.facebook || "-"}</span>
                        {lead.facebook && (
                          <button
                            id="copy-lead-fb-btn"
                            type="button"
                            onClick={() => handleCopyText(lead.facebook, "facebook")}
                            className="p-1 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded transition-colors cursor-pointer shrink-0"
                            title="คัดลอก Facebook Page"
                          >
                            {copiedField === "facebook" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        )}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[10px]">จังหวัดที่จัดส่ง</span>
                      <span className="font-semibold">{lead.province}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[10px]">ขนส่งปัจจุบัน / คู่แข่ง</span>
                      <span className="font-semibold text-rose-600">{lead.competitor || "ไม่มี"}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[10px]">ยอดจัดส่งพัสดุเฉลี่ย</span>
                      <span className="font-bold text-gray-900 font-mono text-sm">{lead.shipmentsPerDay} <span className="text-xs font-normal text-gray-500">ชิ้น/เดือน</span></span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[10px]">ค่ายขนส่งที่สนใจ</span>
                      <div className="flex gap-1.5 mt-0.5">
                        {lead.preferredTransport?.map(t => (
                          <span key={t} className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[9px] font-bold">{t}</span>
                        )) || "-"}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[10px]">ระดับความสนใจ (Lead Score)</span>
                      <div className="flex items-center gap-0.5 mt-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            id={`quick-score-star-${star}`}
                            onClick={() => {
                              setEditScore(star);
                              onUpdateLead({ ...lead, score: star });
                            }}
                            className="p-0.5 hover:scale-110 transition-transform cursor-pointer group"
                            title={`คลิกปรับเป็น ${star} ดาว`}
                          >
                            <Star className={`w-4 h-4 ${star <= lead.score ? "text-amber-400 fill-amber-400" : "text-gray-200 group-hover:text-amber-300"}`} />
                          </button>
                        ))}
                        <span className="text-[11px] font-bold text-amber-600 font-mono ml-1">{lead.score}/5</span>
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[10px]">ประเภทลูกค้า</span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 mt-1 rounded font-bold border text-[10px] ${lead.customerType === "corporate" ? "bg-indigo-50 border-indigo-200 text-indigo-700" : "bg-teal-50 border-teal-200 text-teal-700"}`}>
                        {lead.customerType === "corporate" ? "🏢 นิติบุคคล" : "👤 บุคคลธรรมดา"}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[10px]">ช่องทางที่เข้ามา</span>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-bold border text-[10px] bg-blue-50 border-blue-200 text-blue-700">
                          <Share2 className="w-3 h-3" /> {lead.channel || "Facebook"}
                        </span>
                        <button
                          type="button"
                          id="readonly-quick-edit-channel-btn"
                          onClick={() => setIsEditing(true)}
                          className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5 cursor-pointer"
                          title="แก้ไขช่องทาง"
                        >
                          <Pencil className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[10px]">แคมเปญการตลาดที่มา</span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 mt-1 rounded font-bold border text-[10px] bg-indigo-50 border-indigo-200 text-indigo-700">
                        <Megaphone className="w-3 h-3" /> {lead.campaign || "ไม่ได้ระบุแคมเปญ"}
                      </span>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 block text-[10px]">ที่อยู่รับของเข้าระบบ</span>
                      {lead.address && (
                        <button
                          id="copy-lead-address-btn"
                          type="button"
                          onClick={() => handleCopyText(lead.address, "address")}
                          className="text-[10px] font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                        >
                          {copiedField === "address" ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span className="text-emerald-600">คัดลอกที่อยู่แล้ว!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>คัดลอกที่อยู่</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                    <p className="font-medium bg-slate-50 p-2.5 rounded-lg border border-gray-100 mt-1 leading-relaxed">{lead.address || "ยังไม่ได้บันทึกที่อยู่"}</p>
                  </div>

                  {/* Registered Customer Code Block */}
                  {(lead.customerCode || lead.ratePlan) && (
                    <div className="bg-indigo-50/50 p-3 rounded-lg border border-indigo-100 grid grid-cols-3 gap-2">
                      <div>
                        <span className="text-indigo-950 block text-[9px] font-bold uppercase">รหัสลูกค้าสมัครแล้ว</span>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="text-xs font-bold text-indigo-800 font-mono">{lead.customerCode || "ไม่มี"}</span>
                          {lead.customerCode && (
                            <button
                              id="copy-lead-code-btn"
                              type="button"
                              onClick={() => handleCopyText(lead.customerCode!, "code")}
                              className="p-0.5 text-indigo-400 hover:text-indigo-700 rounded transition-colors cursor-pointer"
                              title="คัดลอกรหัสลูกค้า"
                            >
                              {copiedField === "code" ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                            </button>
                          )}
                        </div>
                      </div>
                      <div>
                        <span className="text-indigo-950 block text-[9px] font-bold uppercase">เรทราคาเสนอขาย</span>
                        <span className="text-xs font-bold text-indigo-800">{lead.ratePlan || "ไม่ได้ระบุ"}</span>
                      </div>
                      <div>
                        <span className="text-indigo-950 block text-[9px] font-bold uppercase">ประเภทจัดเก็บเงิน</span>
                        <span className="text-xs font-bold text-indigo-800">{lead.paymentType || "เติมเงิน"}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Document Checklist checklist layout */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <ClipboardCheck className="w-4 h-4 text-purple-500" /> ตรวจเช็คเอกสารสมัครสมาชิก (Document Checklist)
              </h3>
              
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
                {[
                  { key: "idCard", label: "บัตรประชาชน", desc: "สําเนาบัตรเจ้าของร้าน" },
                  { key: "bookBank", label: "Book Bank (ไม่บังคับ)", desc: "เลือกติ๊ก/ไม่ติ๊กก็ได้" },
                  { key: "companyReg", label: "หนังสือรับรอง", desc: "นิติบุคคล (ถ้ามี)" },
                  { key: "taxDoc", label: "ใบภาษี (ภพ.20)", desc: "ภาษีมูลค่าเพิ่ม (ถ้ามี)" },
                  { key: "storefrontPhoto", label: "รูปถ่ายหน้าร้าน", desc: "รูปถ่ายหน้าร้านค้า/ป้ายร้าน" }
                ].map(docItem => {
                  const isChecked = docs[docItem.key as keyof Documents];
                  return (
                    <button
                      key={docItem.key}
                      id={`doc-check-btn-${docItem.key}`}
                      type="button"
                      onClick={() => handleToggleDoc(docItem.key as keyof Documents)}
                      className={`p-3 rounded-xl border text-left flex flex-col justify-between h-20 transition-all cursor-pointer ${isChecked ? "bg-purple-50 border-purple-200 text-purple-900 font-semibold" : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-500"}`}
                    >
                      <span className="font-bold block leading-tight">{docItem.label}</span>
                      <div className="flex items-center justify-between w-full mt-2">
                        <span className="text-[9px] text-slate-400 leading-none">{docItem.desc}</span>
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${isChecked ? "bg-purple-600 border-purple-600 text-white" : "border-slate-300 bg-white"}`}>
                          {isChecked && <ShieldCheck className="w-3 h-3" />}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Follow-up Scheduler Panel */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock3 className="w-4 h-4 text-amber-500" /> บันทึกวันและเวลาติดตามงาน (Follow Up Plan)
                </h3>
                {saveFollowUpSuccess && (
                  <motion.span 
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200"
                  >
                    <Check className="w-3.5 h-3.5" /> บันทึกแผนโทรเรียบร้อยแล้ว!
                  </motion.span>
                )}
              </div>

              {/* Quick Date Presets */}
              <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                <span className="text-slate-400 text-[10px] font-medium mr-1">ตั้งวันด่วน:</span>
                <button
                  type="button"
                  id="preset-follow-tomorrow"
                  onClick={() => handleSetQuickDate(1)}
                  className="px-2 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 border border-slate-200 rounded text-slate-600 font-medium transition-colors cursor-pointer"
                >
                  +1 วัน (พรุ่งนี้)
                </button>
                <button
                  type="button"
                  id="preset-follow-3days"
                  onClick={() => handleSetQuickDate(3)}
                  className="px-2 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 border border-slate-200 rounded text-slate-600 font-medium transition-colors cursor-pointer"
                >
                  +3 วัน
                </button>
                <button
                  type="button"
                  id="preset-follow-7days"
                  onClick={() => handleSetQuickDate(7)}
                  className="px-2 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 border border-slate-200 rounded text-slate-600 font-medium transition-colors cursor-pointer"
                >
                  +7 วัน (1 สัปดาห์)
                </button>
                <button
                  type="button"
                  id="preset-follow-14days"
                  onClick={() => handleSetQuickDate(14)}
                  className="px-2 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 border border-slate-200 rounded text-slate-600 font-medium transition-colors cursor-pointer"
                >
                  +14 วัน
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end text-xs">
                <div>
                  <label className="text-gray-500 font-semibold block text-[10px] mb-1">วันที่ต้องการโทรติดตาม</label>
                  <div className="relative">
                    <input 
                      id="details-follow-date"
                      type="date" 
                      value={followUpDate} 
                      onChange={(e) => setFollowUpDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 p-2 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono text-slate-800"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-gray-500 font-semibold block text-[10px] mb-1">เวลาที่นัดหมาย</label>
                  <input 
                    id="details-follow-time"
                    type="time" 
                    value={followUpTime} 
                    onChange={(e) => setFollowUpTime(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-2 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono text-slate-800"
                  />
                </div>
                <div>
                  <label className="text-gray-500 font-semibold block text-[10px] mb-1">สถานะการโทร</label>
                  <button
                    id="toggle-follow-completed-btn"
                    type="button"
                    onClick={() => setFollowUpCompleted(!followUpCompleted)}
                    className={`w-full p-2 border rounded flex items-center justify-center gap-1.5 cursor-pointer transition-colors text-[11px] font-bold ${followUpCompleted ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-amber-50 border-amber-200 text-amber-700"}`}
                    title="คลิกสลับสถานะ"
                  >
                    {followUpCompleted ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>โทรติดตามแล้ว</span>
                      </>
                    ) : (
                      <>
                        <Clock className="w-3.5 h-3.5" />
                        <span>รอดำเนินการโทร</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-gray-500 font-semibold block text-[10px] mb-1">โน้ต/หัวข้อที่ต้องคุยในการโทรครั้งนี้ (ถ้ามี)</label>
                <input 
                  id="details-follow-note"
                  type="text"
                  placeholder="เช่น โทรสรุปเรทราคา, สอบถามเรื่องเอกสาร, ติดตามผลย้ายค่าย..."
                  value={followUpNote}
                  onChange={(e) => setFollowUpNote(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 p-2 rounded text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800"
                />
              </div>

              <div className="flex justify-end pt-1">
                <button
                  id="save-follow-settings-btn"
                  type="button"
                  disabled={isSavingFollowUp}
                  onClick={handleSaveFollowUpSettings}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
                >
                  {isSavingFollowUp ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>กำลังบันทึก...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>บันทึกแผนโทร (Save Plan)</span>
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>

          {/* Right Column (5/12) - Tabbed interaction logs (Timeline, Calls, Notes, Files) */}
          <div className="lg:col-span-5 flex flex-col bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden min-h-[380px]">
            
            {/* Tabs Selector Navigation */}
            <div className="flex bg-slate-100 border-b border-slate-200 p-1 shrink-0 overflow-x-auto">
              {[
                { id: "timeline", label: "ประวัติการขาย", icon: Clock3 },
                { id: "calls", label: "บันทึกการโทร", icon: Phone },
                { id: "notes", label: "โน้ตย่อย", icon: MessageSquare },
                { id: "files", label: "เอกสารแนบ", icon: FileText },
                { id: "ai", label: "✨ AI วิเคราะห์", icon: Sparkles }
              ].map(tab => (
                <button
                  key={tab.id}
                  id={`details-tab-btn-${tab.id}`}
                  onClick={() => {
                    setActiveTab(tab.id as any);
                    if (tab.id === "ai" && !aiAnalysis && !isAnalyzingAI) {
                      handleRunAIAnalysis();
                    }
                  }}
                  className={`flex-1 flex items-center justify-center gap-1 py-2 px-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap ${activeTab === tab.id ? "bg-white text-blue-600 shadow-xs" : "text-slate-500 hover:text-slate-800"}`}
                >
                  <tab.icon className={`w-3.5 h-3.5 ${tab.id === "ai" ? "text-amber-500 animate-pulse" : ""}`} />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Tab Body Contents */}
            <div className="p-4 flex-1 overflow-y-auto max-h-[460px] text-xs">
              
              {/* TAB 1: Chronological Timeline */}
              {activeTab === "timeline" && (
                <div id="tab-content-timeline" className="space-y-4">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-slate-800">ไทม์ไลน์บันทึกขั้นตอนการติดต่อ</span>
                    <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">ล่าสุด</span>
                  </div>

                  <div className="relative pl-4 border-l-2 border-slate-200 space-y-4 ml-2">
                    {(lead.timeline || []).slice().reverse().map(item => (
                      <div key={item.id} className="relative">
                        {/* Dot indicator */}
                        <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-blue-600 border-2 border-white" />
                        
                        <div className="space-y-0.5">
                          <span className="text-[10px] text-gray-400 font-mono block">
                            {new Date(item.date).toLocaleDateString("th-TH")} | {new Date(item.date).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                          <h4 className="font-bold text-gray-800 leading-tight">{item.title}</h4>
                          <p className="text-[11px] text-gray-500 mt-0.5">{item.description}</p>
                        </div>
                      </div>
                    ))}
                    {(lead.timeline || []).length === 0 && (
                      <div className="py-12 text-center text-gray-400">ยังไม่มีประวัติบันทึกในไทม์ไลน์</div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: Phone Call Recording Outcomes logger */}
              {activeTab === "calls" && (
                <div id="tab-content-calls" className="space-y-4">
                  <div className="bg-white p-3.5 rounded-xl border border-gray-200 space-y-3">
                    <span className="font-bold text-gray-800 block">📞 รายงานผลการโทรศัพท์</span>
                    
                    <form onSubmit={submitCall} className="space-y-2.5">
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-gray-700">
                          <input 
                            id="call-answered-yes"
                            type="radio" 
                            checked={callAnswered === true} 
                            onChange={() => setCallAnswered(true)} 
                          />
                          รับสาย
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-gray-700">
                          <input 
                            id="call-answered-no"
                            type="radio" 
                            checked={callAnswered === false} 
                            onChange={() => setCallAnswered(false)} 
                          />
                          ไม่รับสาย / ติดต่อไม่ได้
                        </label>
                      </div>

                      {callAnswered && (
                        <div className="space-y-1">
                          <label className="text-gray-400 text-[10px] block">คะแนนความสนใจจากเสียงสนทนา</label>
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map(star => (
                              <button 
                                key={star} 
                                id={`call-star-${star}`}
                                type="button" 
                                onClick={() => setCallInterest(star)}
                                className="p-0.5"
                              >
                                <Star className={`w-5 h-5 ${star <= callInterest ? "text-amber-400 fill-amber-400" : "text-gray-200"}`} />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-2">
                        <div className="col-span-2">
                          <label className="text-gray-400 text-[10px] block mb-0.5">สรุปผลการพูดคุย (Note การโทร)</label>
                          <textarea
                            id="call-notes-textarea"
                            rows={2}
                            placeholder={callAnswered ? "ลูกค้าตอบรับว่าอย่างไรบ้าง..." : "เช่น โทรแล้วตัดสาย หรือไม่มีผู้รับสาย..."}
                            value={callNotes}
                            onChange={(e) => setCallNotes(e.target.value)}
                            className="w-full bg-slate-50 border p-2 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                        
                        <div className="col-span-2 space-y-2">
                          <div>
                            <label className="text-gray-400 text-[10px] block mb-0.5 font-bold">นัดโทรอีกครั้ง</label>
                            <select
                              id="call-followup-days-select"
                              value={callFollowDays}
                              onChange={(e) => setCallFollowDays(e.target.value)}
                              className="w-full bg-slate-50 border p-2 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                              <option value="1">พรุ่งนี้ (1 วัน)</option>
                              <option value="3">3 วันถัดไป</option>
                              <option value="7">สัปดาห์หน้า (7 วัน)</option>
                              <option value="30">เดือนหน้า (30 วัน)</option>
                              <option value="custom">ระบุวันที่เอง (กำหนดเอง)</option>
                              <option value="0">ไม่ต้องตั้งติดตามใหม่</option>
                            </select>
                          </div>

                          {callFollowDays === "custom" && (
                            <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                              <label className="text-gray-400 text-[10px] block mb-0.5 font-bold">เลือกวันที่ติดต่อกลับ</label>
                              <input
                                id="call-custom-date-input"
                                type="date"
                                required
                                value={customCallDate}
                                onChange={(e) => setCustomCallDate(e.target.value)}
                                min={new Date().toISOString().split("T")[0]}
                                className="w-full bg-slate-50 border p-2 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      <button
                        id="submit-call-log-btn"
                        type="submit"
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold p-2 rounded transition-colors cursor-pointer text-center"
                      >
                        บันทึกสายสนทนา
                      </button>
                    </form>
                  </div>

                  {/* Previous call list */}
                  <div className="space-y-2 pt-2">
                    <span className="font-bold text-gray-700 block text-[10px] uppercase">ประวัติการโทรครั้งก่อน</span>
                    {(lead.calls || []).slice().reverse().map(c => (
                      <div key={c.id} className="bg-white p-2.5 rounded-lg border border-gray-100 flex justify-between items-start">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${c.answered ? "bg-emerald-500" : "bg-rose-500"}`} />
                            <span className="font-semibold text-gray-800">{c.answered ? "รับสาย" : "ไม่รับสาย"}</span>
                            {c.answered && <span className="text-[10px] text-amber-500">{"⭐".repeat(c.interestLevel)}</span>}
                          </div>
                          <p className="text-[11px] text-gray-600">{c.notes}</p>
                          <span className="text-[9px] text-gray-400 font-mono block">{new Date(c.date).toLocaleDateString("th-TH")}</span>
                        </div>
                        {c.nextFollowUpInDays && c.nextFollowUpInDays > 0 && (
                          <span className="text-[9px] bg-amber-50 border border-amber-200 text-amber-800 px-1.5 py-0.5 rounded shrink-0">นัด {c.nextFollowUpInDays} วัน</span>
                        )}
                      </div>
                    ))}
                    {(lead.calls || []).length === 0 && (
                      <div className="py-6 text-center text-gray-400 text-xs">ยังไม่มีบันทึกข้อมูลสายโทรเข้าออก</div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: Continuous note logging */}
              {activeTab === "notes" && (
                <div id="tab-content-notes" className="space-y-4">
                  <div className="bg-white p-3 rounded-xl border border-gray-200">
                    <form onSubmit={submitNote} className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-gray-800">📝 เขียนบันทึกช่วยจำ</span>
                        <select 
                          id="note-author-select"
                          value={noteAuthor} 
                          onChange={(e) => setNoteAuthor(e.target.value)}
                          className="bg-gray-50 border rounded px-1.5 py-0.5 text-[10px] text-gray-600 font-medium"
                        >
                          {(salespersons.length > 0 ? salespersons : ["Phere", "Nalin", "Beer"]).map((sp) => (
                            <option key={sp} value={sp}>{sp}</option>
                          ))}
                        </select>
                      </div>
                      
                      <div className="relative">
                        <textarea
                          id="new-note-text"
                          rows={3}
                          placeholder="พิมพ์ข้อความบันทึกช่วยจำสำหรับแชร์ในทีม... เช่น 'ลูกค้าชอบคุยทางโทรศัพท์มากกว่า Line'"
                          value={noteText}
                          onChange={(e) => setNoteText(e.target.value)}
                          className="w-full bg-slate-50 border p-2 rounded focus:outline-none text-xs"
                        />
                        <button
                          id="submit-new-note-btn"
                          type="submit"
                          className="absolute right-2 bottom-3 p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors cursor-pointer"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Notes Feed */}
                  <div className="space-y-2.5">
                    {(lead.notes || []).slice().reverse().map(note => (
                      <div key={note.id} className="bg-white p-3 rounded-xl border border-gray-100 space-y-1 shadow-2xs">
                        <div className="flex justify-between items-center text-[10px] text-gray-400">
                          <span className="font-bold text-indigo-700">{note.author}</span>
                          <span className="font-mono">
                            {new Date(note.createdAt).toLocaleDateString("th-TH")} {new Date(note.createdAt).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-700 leading-relaxed font-medium">{note.text}</p>
                      </div>
                    ))}
                    {(lead.notes || []).length === 0 && (
                      <div className="py-12 text-center text-gray-400">ยังไม่มีบันทึกข้อความเสริมเขียนเก็บไว้</div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: CRM Files storage */}
              {activeTab === "files" && (
                <div id="tab-content-files" className="space-y-4">
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                        <Paperclip className="w-4 h-4 text-blue-600" /> แนบไฟล์และรูปภาพเอกสาร
                      </span>
                      <span className="text-[10px] text-slate-400">รองรับรูปภาพ, PDF, Excel, Word</span>
                    </div>

                    <form onSubmit={submitFile} className="space-y-3">
                      {/* Hidden File Input */}
                      <input
                        ref={fileInputRef}
                        type="file"
                        onChange={handleFileInputChange}
                        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.zip"
                        className="hidden"
                      />

                      {/* Dropzone / File Picker */}
                      <div
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={handleDrop}
                        onClick={() => !selectedFile && fileInputRef.current?.click()}
                        className={`border-2 border-dashed rounded-xl p-4 text-center transition-all ${
                          selectedFile 
                            ? "border-blue-300 bg-blue-50/40" 
                            : "border-slate-300 hover:border-blue-400 hover:bg-slate-50 cursor-pointer"
                        }`}
                      >
                        {selectedFile ? (
                          <div className="flex items-center justify-between gap-3 text-left">
                            <div className="flex items-center gap-3 overflow-hidden">
                              {filePreview ? (
                                <img 
                                  src={filePreview} 
                                  alt="Preview" 
                                  className="w-12 h-12 object-cover rounded-lg border border-slate-200 shrink-0 shadow-2xs" 
                                />
                              ) : (
                                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 shrink-0">
                                  <FileText className="w-6 h-6" />
                                </div>
                              )}
                              <div className="truncate">
                                <span className="font-bold text-slate-800 text-xs block truncate">{selectedFile.name}</span>
                                <span className="text-[10px] text-slate-500 font-mono">ขนาดไฟล์: {formatFileSize(selectedFile.size)}</span>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedFile(null);
                                setFilePreview(null);
                                setFileName("");
                                if (fileInputRef.current) fileInputRef.current.value = "";
                              }}
                              className="text-xs text-rose-600 hover:text-rose-800 font-bold underline px-2 py-1 shrink-0 cursor-pointer"
                            >
                              ยกเลิกไฟล์นี้
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            <UploadCloud className="w-8 h-8 text-blue-500 mx-auto" />
                            <p className="text-xs font-semibold text-slate-700">
                              ลากไฟล์มาวางที่นี่ หรือ <span className="text-blue-600 underline">คลิกเพื่อเลือกไฟล์จากเครื่อง</span>
                            </p>
                            <p className="text-[10px] text-slate-400">รูปภาพบัตรประชาชน, สำเนา Book Bank, สลิปโอนเงิน ฯลฯ</p>
                          </div>
                        )}
                      </div>

                      {/* File Details Inputs */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className="text-slate-500 text-[10px] font-bold block mb-1">ชื่อเรียกเอกสาร</label>
                          <input
                            id="new-file-name-input"
                            type="text"
                            placeholder="เช่น บัตรประชาชน_สมชาย.jpg"
                            value={fileName}
                            onChange={(e) => setFileName(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="text-slate-500 text-[10px] font-bold block mb-1">หมวดหมู่ไฟล์</label>
                          <select
                            id="new-file-type-select"
                            value={fileType}
                            onChange={(e) => setFileType(e.target.value as any)}
                            className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                          >
                            <option value="image">📷 รูปภาพเอกสาร (.jpg, .png)</option>
                            <option value="pdf">📄 เอกสาร PDF (.pdf)</option>
                            <option value="other">📦 ไฟล์อื่นๆ (.xlsx, .zip)</option>
                          </select>
                        </div>
                      </div>

                      <button
                        id="submit-file-upload-btn"
                        type="submit"
                        disabled={isUploading || (!selectedFile && !fileName.trim())}
                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold py-2.5 px-4 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2 text-xs shadow-xs"
                      >
                        {isUploading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>กำลังอัปโหลดไฟล์...</span>
                          </>
                        ) : (
                          <>
                            <UploadCloud className="w-4 h-4" />
                            <span>อัปโหลดและบันทึกไฟล์</span>
                          </>
                        )}
                      </button>
                    </form>
                  </div>

                  {/* List of uploaded files */}
                  <div className="space-y-2">
                    <span className="font-bold text-slate-700 block text-[11px] uppercase tracking-wider">
                      รายการไฟล์แนบทั้งหมด ({(lead.files || []).length} ไฟล์)
                    </span>
                    
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                      {(lead.files || []).slice().reverse().map(f => {
                        const isImage = f.type === "image" || (f.url && f.url.startsWith("data:image/"));
                        return (
                          <div key={f.id} className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between gap-3 shadow-2xs hover:border-blue-200 transition-all">
                            <div className="flex items-center gap-3 overflow-hidden">
                              {isImage && f.url && f.url !== "#" ? (
                                <img 
                                  src={f.url} 
                                  alt={f.name} 
                                  onClick={() => setLightboxUrl(f.url)}
                                  className="w-10 h-10 object-cover rounded-lg border border-slate-200 shrink-0 cursor-pointer hover:opacity-80 transition-opacity" 
                                />
                              ) : (
                                <div className="w-10 h-10 bg-slate-100 text-slate-600 rounded-lg flex items-center justify-center shrink-0">
                                  {f.type === "pdf" ? <FileText className="w-5 h-5 text-rose-500" /> : <Paperclip className="w-5 h-5 text-blue-500" />}
                                </div>
                              )}
                              <div className="truncate">
                                <span className="font-bold block text-slate-800 text-xs truncate">{f.name}</span>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {f.size} | {new Date(f.uploadedAt).toLocaleDateString("th-TH")} {new Date(f.uploadedAt).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {isImage && f.url && f.url !== "#" && (
                                <button
                                  type="button"
                                  onClick={() => setLightboxUrl(f.url)}
                                  className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors flex items-center gap-1 text-[11px] font-semibold cursor-pointer"
                                  title="ดูรูปภาพขนาดใหญ่"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span className="hidden sm:inline">ดูรูป</span>
                                </button>
                              )}

                              {f.url && f.url !== "#" && (
                                <a
                                  href={f.url}
                                  download={f.name}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors flex items-center gap-1 text-[11px] font-semibold cursor-pointer"
                                  title="ดาวน์โหลดไฟล์ลงเครื่อง"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                  <span className="hidden sm:inline">ดาวน์โหลด</span>
                                </a>
                              )}

                              <button
                                type="button"
                                onClick={() => handleDeleteFile(f.id)}
                                className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                                title="ลบไฟล์นี้"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}

                      {(lead.files || []).length === 0 && (
                        <div className="py-10 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-1.5 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                          <UploadCloud className="w-8 h-8 text-slate-300" />
                          <span className="font-medium text-slate-600">ยังไม่มีไฟล์เอกสารแนบ</span>
                          <span className="text-[10px] text-slate-400">อัปโหลดรูปภาพ บัตรประชาชน หรือไฟล์สำคัญเพื่อแนบไว้กับ Lead นี้</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: AI Sales Intelligence */}
              {activeTab === "ai" && (
                <div id="tab-content-ai" className="space-y-3">
                  <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 text-white p-3.5 rounded-xl shadow-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-white/10 rounded-lg backdrop-blur-xs">
                          <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                        </div>
                        <div>
                          <h4 className="font-bold text-xs">AI Sales Intelligence (Gemini AI)</h4>
                          <p className="text-[10px] text-indigo-200">ประมวลผลข้อมูลลูกค้า & แนะนำกลยุทธ์ปิดการขาย</p>
                        </div>
                      </div>
                      <button
                        id="trigger-ai-analysis-btn"
                        onClick={handleRunAIAnalysis}
                        disabled={isAnalyzingAI}
                        className="px-3 py-1.5 bg-white/20 hover:bg-white/30 active:scale-95 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer backdrop-blur-xs disabled:opacity-50 shrink-0"
                      >
                        {isAnalyzingAI ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-300" />
                            <span>กำลังวิเคราะห์...</span>
                          </>
                        ) : (
                          <>
                            <Zap className="w-3.5 h-3.5 text-amber-300" />
                            <span>{aiAnalysis ? "วิเคราะห์ใหม่" : "เริ่มวิเคราะห์ AI"}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {aiError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                      <span>{aiError}</span>
                    </div>
                  )}

                  {!aiAnalysis && !isAnalyzingAI && !aiError && (
                    <div className="text-center py-8 bg-slate-50 border border-dashed border-slate-200 rounded-xl space-y-3">
                      <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto">
                        <Sparkles className="w-6 h-6 text-indigo-600 animate-bounce" />
                      </div>
                      <div className="max-w-xs mx-auto">
                        <h4 className="font-bold text-slate-800 text-xs">วิเคราะห์ศักยภาพและแนวโน้มลูกค้า</h4>
                        <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                          ระบบ AI จะช่วยวิเคราะห์ประวัติการโทร โน้ต ปริมาณพัสดุ และสถานะ เพื่อคำนวณโอกาสปิดการขายพร้อมสคริปต์เสนอขาย
                        </p>
                      </div>
                      <button
                        id="start-ai-analysis-center-btn"
                        onClick={handleRunAIAnalysis}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs transition-all shadow-xs cursor-pointer inline-flex items-center gap-2"
                      >
                        <Sparkles className="w-4 h-4 text-amber-300" />
                        <span>วิเคราะห์ด้วย AI ทันที</span>
                      </button>
                    </div>
                  )}

                  {isAnalyzingAI && (
                    <div className="text-center py-12 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-3">
                      <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
                      <p className="text-xs font-bold text-indigo-900">กำลังประมวลผลข้อมูลด้วย Gemini AI...</p>
                      <p className="text-[10px] text-indigo-600">ประมวลผลพฤติกรรม ประวัติการโทร และประเมินโอกาสปิดการขาย</p>
                    </div>
                  )}

                  {aiAnalysis && !isAnalyzingAI && (
                    <div className="space-y-3">
                      {/* Win Probability gauge */}
                      <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                            <TrendingUp className="w-4 h-4 text-indigo-600" />
                            โอกาสปิดการขาย (Win Probability)
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            aiAnalysis.dealUrgency === "high" ? "bg-emerald-100 text-emerald-800" :
                            aiAnalysis.dealUrgency === "medium" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-700"
                          }`}>
                            {aiAnalysis.dealUrgency === "high" ? "🔥 โอกาสปิดยอดสูง" : aiAnalysis.dealUrgency === "medium" ? "⚡ โอกาสปานกลาง" : "⏳ ติดตามระยะยาว"}
                          </span>
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between text-xs font-bold font-mono">
                            <span className="text-indigo-600">{aiAnalysis.winProbability}%</span>
                            <span className="text-slate-400">100%</span>
                          </div>
                          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all duration-700 ${
                                aiAnalysis.winProbability >= 70 ? "bg-emerald-500" :
                                aiAnalysis.winProbability >= 40 ? "bg-amber-500" : "bg-blue-500"
                              }`}
                              style={{ width: `${aiAnalysis.winProbability}%` }}
                            />
                          </div>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-relaxed pt-1 border-t border-slate-100">
                          {aiAnalysis.summary}
                        </p>
                      </div>

                      {/* Persona */}
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">โปรไฟล์ลูกค้า (Customer Persona)</span>
                        <p className="text-xs text-slate-800 leading-relaxed font-medium">{aiAnalysis.customerPersona}</p>
                      </div>

                      {/* Strengths and Challenges */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div className="p-2.5 bg-emerald-50/70 border border-emerald-100 rounded-xl space-y-1.5">
                          <span className="font-bold text-emerald-800 text-[11px] flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            จุดเด่น / โอกาสเปิดขาย
                          </span>
                          <ul className="space-y-1">
                            {aiAnalysis.strengths.map((item, i) => (
                              <li key={i} className="text-[11px] text-emerald-950 flex items-start gap-1">
                                <span className="text-emerald-500 font-bold">•</span>
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="p-2.5 bg-amber-50/70 border border-amber-100 rounded-xl space-y-1.5">
                          <span className="font-bold text-amber-800 text-[11px] flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                            ข้อควรระวัง / อุปสรรค
                          </span>
                          <ul className="space-y-1">
                            {aiAnalysis.challenges.map((item, i) => (
                              <li key={i} className="text-[11px] text-amber-950 flex items-start gap-1">
                                <span className="text-amber-500 font-bold">•</span>
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {/* Recommended Action */}
                      <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl space-y-1">
                        <span className="text-[11px] font-bold text-indigo-900 flex items-center gap-1.5">
                          <Lightbulb className="w-4 h-4 text-indigo-600 shrink-0" />
                          ขั้นตอนถัดไปที่แนะนำ (Recommended Action)
                        </span>
                        <p className="text-xs text-indigo-950 leading-relaxed font-medium">{aiAnalysis.recommendedAction}</p>
                      </div>

                      {/* Script */}
                      <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-700">📞 บทพูดแนะนำในการโทร/ทักแชต (Script)</span>
                          <button
                            id="copy-ai-script-btn"
                            onClick={() => {
                              navigator.clipboard.writeText(aiAnalysis.salesPitchScript);
                              setCopiedScript(true);
                              setTimeout(() => setCopiedScript(false), 2000);
                            }}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-bold transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            {copiedScript ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedScript ? "คัดลอกแล้ว" : "คัดลอกสคริปต์"}</span>
                          </button>
                        </div>
                        <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs italic text-slate-800 leading-relaxed font-sans">
                          {aiAnalysis.salesPitchScript}
                        </div>
                      </div>

                      {/* Suggested Offers */}
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                        <span className="text-[11px] font-bold text-slate-700 block">🎁 สิทธิประโยชน์/ข้อเสนอที่ควรนำเสนอ</span>
                        <div className="flex flex-wrap gap-1.5">
                          {aiAnalysis.suggestedOffers.map((offer, idx) => (
                            <span key={idx} className="bg-white border border-slate-200 text-slate-800 px-2.5 py-1 rounded-lg text-[11px] font-medium shadow-2xs">
                              {offer}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>

        </div>

        {/* Modal Footer actions */}
        <div className="border-t border-slate-200 pt-3 flex flex-wrap justify-between items-center gap-2 text-xs text-slate-500">
          <div className="flex items-center gap-3">
            <span>รหัสระบบของลูกค้า: <span className="font-mono font-bold text-slate-700">{lead.id}</span></span>
            
            {/* Danger Zone: Discrete delete button to prevent accidental clicks */}
            {onDeleteLead && (
              <button
                id="details-delete-lead-btn"
                type="button"
                onClick={() => setShowDeleteModal(true)}
                className="text-[11px] text-slate-400 hover:text-rose-600 font-bold flex items-center gap-1 transition-all cursor-pointer border border-slate-200 hover:border-rose-200 hover:bg-rose-50 px-2.5 py-1 rounded-lg"
                title="ลบข้อมูล Lead รายนี้ออกจากระบบ"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                <span>ลบ Lead รายนี้</span>
              </button>
            )}
          </div>

          <button 
            id="details-close-btn"
            onClick={onClose} 
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold transition-all cursor-pointer shadow-xs"
          >
            ปิดหน้าจอนี้
          </button>
        </div>
      </motion.div>

      {/* Delete Confirmation Modal (ป้องกันมือลั่น) */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-[110] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 text-slate-800"
          >
            <div className="flex items-start gap-3">
              <div className="p-3 bg-rose-100 text-rose-600 rounded-full shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900">ยืนยันการลบข้อมูล Lead?</h3>
                <p className="text-xs text-slate-500">
                  คุณกำลังจะลบข้อมูลของร้าน <strong className="text-slate-900 font-bold">{lead.shopName}</strong> (ผู้ติดต่อ: {lead.contactName || "ไม่ระบุ"})
                </p>
              </div>
            </div>

            <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl text-xs text-rose-800 space-y-1">
              <p className="font-bold flex items-center gap-1">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                <span>คำเตือน: ข้อมูลจะถูกลบถาวร</span>
              </p>
              <p className="text-[11px] text-rose-700 leading-relaxed">
                ประวัติการติดต่อ บันทึกช่วยจำ รายการโทร และไฟล์แนบทั้งหมดจะถูกลบออกจากฐานข้อมูลและไม่สามารถกู้คืนได้
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                id="cancel-delete-lead-btn"
                type="button"
                disabled={isDeletingLead}
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all cursor-pointer"
              >
                ยกเลิก (ไม่ลบ)
              </button>

              <button
                id="confirm-delete-lead-btn"
                type="button"
                disabled={isDeletingLead}
                onClick={async () => {
                  if (!onDeleteLead) return;
                  setIsDeletingLead(true);
                  const res = await onDeleteLead(lead.id);
                  setIsDeletingLead(false);
                  if (res !== false) {
                    setShowDeleteModal(false);
                    onClose();
                  }
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isDeletingLead ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>กำลังลบ...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>ยืนยันลบข้อมูล</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Lightbox Modal for uploaded images */}
      {lightboxUrl && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={() => setLightboxUrl(null)}>
          <div className="relative max-w-4xl max-h-[90vh] bg-slate-900 p-2 rounded-2xl shadow-2xl flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setLightboxUrl(null)}
              className="absolute top-4 right-4 p-2 bg-black/60 hover:bg-black text-white rounded-full transition-colors cursor-pointer z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <img 
              src={lightboxUrl} 
              alt="Uploaded document full view" 
              className="max-w-full max-h-[80vh] object-contain rounded-xl" 
            />
            <div className="mt-2 text-center">
              <a
                href={lightboxUrl}
                download="uploaded_document"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-colors"
              >
                <Download className="w-4 h-4" /> ดาวน์โหลดรูปภาพนี้
              </a>
            </div>
          </div>
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
          onSelectCampaign={(name) => setEditCampaign(name)}
        />
      )}
    </div>
  );
}
