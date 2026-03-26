import type { LucideIcon } from "lucide-react";

interface SummaryCardProps {
  icon: LucideIcon;
  value: string | number;
  label: string;
  accentColor?: string;
  alert?: boolean;
  subtitle?: string;
}

export function SummaryCard({
  icon: Icon,
  value,
  label,
  accentColor = "#3B82F6",
  alert = false,
  subtitle,
}: SummaryCardProps) {
  return (
    <div className="relative bg-[#171B26] border border-[#2A3044] rounded-lg p-4 transition-shadow duration-150 hover:shadow-lg cursor-default">
      {alert && (
        <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#E8403A] animate-pulse" />
      )}
      <div className="flex items-start gap-3">
        <div
          className="p-2 rounded-md flex-shrink-0"
          style={{ backgroundColor: `${accentColor}20` }}
        >
          <Icon className="w-4 h-4" style={{ color: accentColor }} />
        </div>
        <div className="min-w-0">
          <div className="text-2xl font-semibold font-mono-data text-[#F1F3F7] leading-none mb-1 truncate">
            {value}
          </div>
          <div className="text-xs text-[#9CA3AF]">{label}</div>
          {subtitle && (
            <div className="text-xs text-[#6B7280] mt-0.5 truncate">{subtitle}</div>
          )}
        </div>
      </div>
    </div>
  );
}
