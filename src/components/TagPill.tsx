import React from "react";
import { 
  Store, Package, Building2, Handshake, Crown, 
  Boxes, Layers, Sparkles, Rocket, TrendingUp, 
  AlertTriangle, Scale, Clock, Hammer, Flame, Tag as TagIcon, X 
} from "lucide-react";
import { getTagInfo } from "../utils/crmHelpers";

export interface TagPillProps extends React.HTMLAttributes<HTMLSpanElement> {
  key?: React.Key;
  tag: string;
  size?: "xs" | "sm" | "md";
  showIcon?: boolean;
  onRemove?: (e: React.MouseEvent) => void;
  onClick?: (e: React.MouseEvent) => void;
  isSelected?: boolean;
  className?: string;
  id?: string;
}

export function renderTagIcon(iconName: string, className: string = "w-3 h-3") {
  switch (iconName) {
    case "Store":
      return <Store className={className} />;
    case "Package":
      return <Package className={className} />;
    case "Building2":
      return <Building2 className={className} />;
    case "Handshake":
      return <Handshake className={className} />;
    case "Crown":
      return <Crown className={className} />;
    case "Boxes":
      return <Boxes className={className} />;
    case "Layers":
      return <Layers className={className} />;
    case "Sparkles":
      return <Sparkles className={className} />;
    case "Rocket":
      return <Rocket className={className} />;
    case "TrendingUp":
      return <TrendingUp className={className} />;
    case "AlertTriangle":
      return <AlertTriangle className={className} />;
    case "Scale":
      return <Scale className={className} />;
    case "Clock":
      return <Clock className={className} />;
    case "Hammer":
      return <Hammer className={className} />;
    case "Flame":
      return <Flame className={className} />;
    default:
      return <TagIcon className={className} />;
  }
}

export default function TagPill({
  tag,
  size = "sm",
  showIcon = true,
  onRemove,
  onClick,
  isSelected,
  className = "",
  id
}: TagPillProps) {
  const tagInfo = getTagInfo(tag);

  // Size specifications: Compact Label / Small Pill
  const sizeClasses = {
    xs: "text-[10px] h-[22px] px-2 gap-1 font-medium",
    sm: "text-[11px] h-[25px] px-2.5 gap-1.5 font-medium leading-none",
    md: "text-xs h-[28px] px-3 gap-1.5 font-semibold"
  };

  const iconSizes = {
    xs: "w-2.5 h-2.5 shrink-0 opacity-80",
    sm: "w-3 h-3 shrink-0 opacity-85",
    md: "w-3.5 h-3.5 shrink-0 opacity-90"
  };

  // If selected in multi-select mode
  const selectedClasses = isSelected
    ? "ring-2 ring-blue-500 shadow-2xs font-semibold"
    : "";

  const clickableClasses = onClick ? "cursor-pointer hover:shadow-2xs active:scale-[0.98] transition-all" : "";

  return (
    <span
      id={id || `tag-pill-${tag.replace(/\s+/g, "-")}`}
      onClick={onClick}
      className={`inline-flex items-center rounded-full border transition-all select-none whitespace-nowrap ${sizeClasses[size]} ${tagInfo.badgeClass} ${selectedClasses} ${clickableClasses} ${className}`}
      title={tag}
    >
      {showIcon && renderTagIcon(tagInfo.iconName, iconSizes[size])}
      <span className="truncate max-w-[170px]">{tag}</span>
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(e);
          }}
          className="p-0.5 ml-0.5 rounded-full hover:bg-black/10 text-current transition-colors cursor-pointer"
          title={`ลบป้าย ${tag}`}
          aria-label={`ลบ ${tag}`}
        >
          <X className={size === "xs" ? "w-2.5 h-2.5" : "w-3 h-3"} />
        </button>
      )}
    </span>
  );
}
