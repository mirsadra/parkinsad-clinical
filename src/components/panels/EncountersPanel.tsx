import type { Encounter } from "../../types/fhir";
import { formatDate, formatDateTime, formatDuration } from "../../lib/formatters";
import { StatusBadge } from "../shared/StatusBadge";
import { TableSkeleton } from "../shared/LoadingSkeleton";

interface EncountersPanelProps {
  encounters: Encounter[];
  isLoading: boolean;
}

function getEncounterClass(enc: Encounter): string {
  const code = enc.class?.code;
  if (code === "IMP") return "Inpatient";
  if (code === "AMB") return "Outpatient";
  if (code === "EMER") return "Emergency";
  if (code === "VR") return "Virtual";
  return code ?? "Unknown";
}

export function EncountersPanel({ encounters, isLoading }: EncountersPanelProps) {
  if (isLoading) {
    return <div className="panel-content"><TableSkeleton rows={5} /></div>;
  }

  if (encounters.length === 0) {
    return (
      <div className="panel-content p-6 text-center text-[#6B7280]">
        No encounters recorded
      </div>
    );
  }

  return (
    <div className="panel-content">
      <div className="divide-y divide-[#1A1F2E]">
        {encounters.map((enc) => {
          const isInpatient = enc.class?.code === "IMP";
          const type = enc.type?.[0]?.text ?? enc.type?.[0]?.coding?.[0]?.display ?? "Encounter";
          const location = enc.location?.[0]?.location?.display;
          const period = enc.period;
          const duration =
            isInpatient && period?.start
              ? formatDuration(period.start, period.end)
              : null;

          return (
            <div key={enc.id} className="px-6 py-4 hover:bg-[#1A1F2E] transition-colors duration-150">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-[#F1F3F7] font-medium text-sm">
                      {type}
                    </span>
                    <span className="text-xs px-1.5 py-0.5 bg-[#1E2333] text-[#9CA3AF] rounded">
                      {getEncounterClass(enc)}
                    </span>
                    <StatusBadge status={enc.status} />
                  </div>
                  {location && (
                    <p className="text-sm text-[#9CA3AF]">{location}</p>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-mono-data text-[#9CA3AF]">
                    {period?.start ? formatDate(period.start) : "Unknown date"}
                  </p>
                  {period?.end && (
                    <p className="text-xs text-[#6B7280]">
                      to {formatDate(period.end)}
                    </p>
                  )}
                  {duration && (
                    <p className="text-xs text-[#6B7280] mt-0.5">{duration}</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
