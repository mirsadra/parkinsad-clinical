import {
  LayoutDashboard,
  Pill,
  AlertTriangle,
  Activity,
  FlaskConical,
  CalendarDays,
  Heart,
  Scissors,
  Syringe,
} from "lucide-react";
import type { TabId } from "../types/fhir";

interface TabConfig {
  id: TabId;
  label: string;
  icon: typeof LayoutDashboard;
}

const TABS: TabConfig[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "medications", label: "Medications", icon: Pill },
  { id: "allergies", label: "Allergies", icon: AlertTriangle },
  { id: "vitals", label: "Vitals", icon: Activity },
  { id: "labs", label: "Labs", icon: FlaskConical },
  { id: "encounters", label: "Encounters", icon: CalendarDays },
  { id: "conditions", label: "Conditions", icon: Heart },
  { id: "procedures", label: "Procedures", icon: Scissors },
  { id: "immunisations", label: "Immunisations", icon: Syringe },
];

interface TabNavProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  counts?: Partial<Record<TabId, number>>;
}

export function TabNav({ activeTab, onTabChange, counts = {} }: TabNavProps) {
  return (
    <nav
      className="tab-nav flex-shrink-0 w-52 bg-[#171B26] border-r border-[#2A3044] flex flex-col py-2 overflow-y-auto"
      aria-label="Clinical data sections"
    >
      {TABS.map(({ id, label, icon: Icon }) => {
        const isActive = id === activeTab;
        const count = counts[id];
        return (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            aria-selected={isActive}
            role="tab"
            className={[
              "flex items-center gap-3 px-4 py-2.5 text-sm transition-colors duration-150",
              "border-l-4 text-left w-full",
              isActive
                ? "border-[#3B82F6] bg-[#1E2333] text-[#F1F3F7]"
                : "border-transparent text-[#9CA3AF] hover:text-[#F1F3F7] hover:bg-[#1A1F2E]",
            ].join(" ")}
          >
            <Icon className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
            <span className="tab-nav-label flex-1 text-left">{label}</span>
            {count !== undefined && count > 0 && (
              <span
                className={[
                  "ml-auto text-xs px-1.5 py-0.5 rounded-full tabular-nums",
                  isActive
                    ? "bg-[#3B82F6] text-white"
                    : "bg-[#2A3044] text-[#9CA3AF]",
                ].join(" ")}
                aria-label={`${count} items`}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
