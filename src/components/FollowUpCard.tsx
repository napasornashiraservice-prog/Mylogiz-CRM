import React from "react";
import { Lead, StatusLabels, StatusColors } from "../types";
import { getFollowUpStatus, getPriorityBadgeInfo, getTagInfo } from "../utils/crmHelpers";
import { 
  PhoneCall, Clock, CheckCircle2, AlertTriangle, Calendar, 
  ExternalLink, User, Tag, Sparkles, PhoneForwarded, MessageSquare
} from "lucide-react";

interface FollowUpCardProps {
  key?: React.Key;
  lead: Lead;
  onSelectLead: (lead: Lead) => void;
  onOpenOutcomeModal: (lead: Lead) => void;
  onOpenSnoozeModal: (lead: Lead) => void;
}

export default function FollowUpCard({
  lead,
  onSelectLead,
  onOpenOutcomeModal,
  onOpenSnoozeModal
}: FollowUpCardProps) {
  const statusInfo = getFollowUpStatus(lead.followUp);
  const priorityInfo = getPriorityBadgeInfo(lead.followUp?.priority);
  const statusColorClass = StatusColors[lead.status] || "bg-slate-100 text-slate-700";

  return (
    <div
      id={`followup-card-${lead.id}`}
      onClick={() => onSelectLead(lead)}
      className={`p-3.5 rounded-2xl border transition-all bg-white hover:shadow-md cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 group relative overflow-hidden ${
        statusInfo.status === "overdue"
          ? "border-rose-200 hover:border-rose-300 bg-rose-50/20"
          : statusInfo.status === "today"
            ? "border-amber-200 hover:border-amber-300 bg-amber-50/20"
            : statusInfo.status === "completed"
              ? "border-emerald-200 bg-emerald-50/10"
              : "border-slate-200 hover:border-blue-200"
      }`}
    >
      {/* Left side color accent indicator */}
      <div 
        className={`absolute left-0 top-0 bottom-0 w-1.5 ${
          statusInfo.status === "overdue"
            ? "bg-rose-500"
            : statusInfo.status === "today"
              ? "bg-amber-500"
              : statusInfo.status === "completed"
                ? "bg-emerald-500"
                : "bg-blue-500"
        }`} 
      />

      {/* Main Info Section */}
      <div className="space-y-1.5 min-w-0 flex-1 pl-1">
        {/* Row 1: Shop Name, Pipeline Badge, Priority Badge, Timing Badge */}
        <div className="flex items-center gap-2 flex-wrap">
          <span 
            className="font-bold text-slate-900 text-sm group-hover:text-blue-700 transition-colors truncate max-w-xs cursor-pointer"
            title={lead.shopName}
          >
            {lead.shopName || "ไม่ระบุชื่อร้าน"}
          </span>

          {/* Pipeline Status Badge */}
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusColorClass}`}>
            {StatusLabels[lead.status] || lead.status}
          </span>

          {/* Follow-up Status Timing Badge */}
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${statusInfo.badgeClass}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dotColor}`} />
            <span>{statusInfo.label}</span>
          </span>

          {/* Priority Badge */}
          {lead.followUp?.priority && (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${priorityInfo.badgeClass}`}>
              <span>{priorityInfo.iconText}</span>
              <span>{priorityInfo.label}</span>
            </span>
          )}
        </div>

        {/* Row 2: Contact, Phone, Time, Assigned Sales */}
        <div className="flex items-center gap-x-3 gap-y-1 text-xs text-slate-500 flex-wrap">
          {lead.contactName && (
            <span className="flex items-center gap-1">
              <User className="w-3 h-3 text-slate-400" />
              <strong className="text-slate-700 font-semibold">{lead.contactName}</strong>
            </span>
          )}

          {lead.phone && (
            <span className="font-mono font-semibold text-slate-700 flex items-center gap-1">
              📞 {lead.phone}
            </span>
          )}

          <span className="text-slate-600 font-medium flex items-center gap-1">
            <Clock className="w-3 h-3 text-slate-400" />
            <span>นัด: {lead.followUp?.date} {lead.followUp?.time || "10:00"} น.</span>
          </span>

          {lead.salesPerson && (
            <span className="text-[11px] text-slate-400 font-medium bg-slate-100 px-2 py-0.2 rounded-md">
              ผู้ดูแล: <strong className="text-slate-700">{lead.salesPerson}</strong>
            </span>
          )}
        </div>

        {/* Row 3: Tags */}
        {lead.tags && lead.tags.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap pt-0.5">
            {lead.tags.slice(0, 4).map((tag) => {
              const info = getTagInfo(tag);
              return (
                <span
                  key={tag}
                  className={`text-[10px] px-1.5 py-0.2 rounded font-medium border ${info.pillClass}`}
                >
                  #{tag}
                </span>
              );
            })}
            {lead.tags.length > 4 && (
              <span className="text-[10px] text-slate-400 font-semibold">
                +{lead.tags.length - 4}
              </span>
            )}
          </div>
        )}

        {/* Row 4: Note / Topic / Last Outcome Preview */}
        {(lead.followUp?.topic || lead.followUp?.note || lead.followUp?.detail || lead.followUp?.lastOutcome) && (
          <div className="text-xs text-slate-600 bg-slate-50 p-2 rounded-xl border border-slate-100/80 mt-1 space-y-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              {lead.followUp.topic && (
                <span className="font-bold text-amber-900 bg-amber-100/80 px-2 py-0.2 rounded text-[10px]">
                  📌 {lead.followUp.topic}
                </span>
              )}
              {lead.followUp.lastOutcome && (
                <span className="font-bold text-blue-900 bg-blue-100/80 px-2 py-0.2 rounded text-[10px]">
                  ผลล่าสุด: {lead.followUp.lastOutcome}
                </span>
              )}
            </div>
            {(lead.followUp.note || lead.followUp.detail) && (
              <p className="line-clamp-2 text-slate-700 text-[11px] leading-relaxed">
                {lead.followUp.note || lead.followUp.detail}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Right Side Action Buttons */}
      <div 
        className="flex items-center gap-1.5 shrink-0 self-end sm:self-center pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 w-full sm:w-auto justify-end" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Call Button */}
        {lead.phone && (
          <a
            href={`tel:${lead.phone}`}
            id={`call-btn-${lead.id}`}
            className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            title={`โทรหา ${lead.shopName || lead.phone}`}
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">โทร</span>
          </a>
        )}

        {/* Log Outcome (บันทึกผล) Button */}
        <button
          type="button"
          id={`log-outcome-btn-${lead.id}`}
          onClick={() => onOpenOutcomeModal(lead)}
          className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          title="บันทึกผลการติดตาม / บันทึกผลโทร"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>บันทึกผล</span>
        </button>

        {/* Quick Snooze (เลื่อนนัด) Button */}
        {!lead.followUp?.isCompleted && (
          <button
            type="button"
            id={`snooze-btn-${lead.id}`}
            onClick={() => onOpenSnoozeModal(lead)}
            className="px-2.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
            title="เลื่อนนัดหมาย"
          >
            <Clock className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">เลื่อนนัด</span>
          </button>
        )}

        {/* View Lead Button */}
        <button
          type="button"
          id={`view-lead-btn-${lead.id}`}
          onClick={() => onSelectLead(lead)}
          className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          title="เปิดดูข้อมูล Lead ทั้งหมด"
        >
          <ExternalLink className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
