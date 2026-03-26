import type { Condition } from "../../types/fhir";
import { getConditionDisplay, formatDate } from "../../lib/formatters";
import { StatusBadge } from "../shared/StatusBadge";
import { TableSkeleton } from "../shared/LoadingSkeleton";

interface ConditionsPanelProps {
  conditions: Condition[];
  isLoading: boolean;
}

function getConditionStatus(condition: Condition): string {
  return condition.clinicalStatus?.coding?.[0]?.code ?? "unknown";
}

export function ConditionsPanel({ conditions, isLoading }: ConditionsPanelProps) {
  if (isLoading) {
    return <div className="panel-content"><TableSkeleton rows={5} /></div>;
  }

  if (conditions.length === 0) {
    return (
      <div className="panel-content p-6 text-center text-[#6B7280]">
        No conditions recorded
      </div>
    );
  }

  const active = conditions.filter((c) => getConditionStatus(c) === "active");
  const resolved = conditions.filter((c) =>
    ["resolved", "remission", "inactive"].includes(getConditionStatus(c))
  );
  const other = conditions.filter(
    (c) => !["active", "resolved", "remission", "inactive"].includes(getConditionStatus(c))
  );

  const sections: Array<{ title: string; items: Condition[]; accentColor: string }> = [
    { title: "Active", items: active, accentColor: "#F59E0B" },
    { title: "Resolved", items: resolved, accentColor: "#22C55E" },
    { title: "Other", items: other, accentColor: "#6B7280" },
  ].filter((s) => s.items.length > 0);

  return (
    <div className="panel-content p-6 space-y-6">
      {sections.map(({ title, items, accentColor }) => (
        <div key={title}>
          <h2
            className="text-xs uppercase tracking-wider font-medium mb-3"
            style={{ color: accentColor }}
          >
            {title} ({items.length})
          </h2>
          <div className="space-y-2">
            {items.map((condition) => (
              <div
                key={condition.id}
                className="flex items-start justify-between gap-4 p-3 bg-[#171B26] border border-[#2A3044] rounded-lg hover:border-[#3B3D52] transition-colors duration-150"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[#F1F3F7] text-sm font-medium">
                    {getConditionDisplay(condition)}
                  </p>
                  {condition.onsetDateTime && (
                    <p className="text-xs text-[#6B7280] mt-0.5">
                      Onset: {formatDate(condition.onsetDateTime)}
                    </p>
                  )}
                </div>
                <StatusBadge status={getConditionStatus(condition)} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
