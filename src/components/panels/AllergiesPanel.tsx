import { ShieldCheck, AlertTriangle } from "lucide-react";
import type { AllergyIntolerance } from "../../types/fhir";
import { formatDate } from "../../lib/formatters";
import { CardSkeleton } from "../shared/LoadingSkeleton";

interface AllergiesPanelProps {
  allergies: AllergyIntolerance[];
  isLoading: boolean;
}

const severityColour: Record<string, string> = {
  severe: "text-[#E8403A]",
  moderate: "text-[#F59E0B]",
  mild: "text-[#22C55E]",
};

export function AllergiesPanel({ allergies, isLoading }: AllergiesPanelProps) {
  if (isLoading) {
    return (
      <div className="panel-content p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[1, 2, 3].map((i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (allergies.length === 0) {
    return (
      <div className="panel-content p-6">
        <div className="flex items-center gap-3 p-4 bg-green-900/20 border border-green-800 rounded-lg">
          <ShieldCheck className="w-6 h-6 text-[#22C55E]" aria-hidden="true" />
          <span className="text-[#22C55E] font-medium">
            No known allergies or intolerances recorded
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="panel-content p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
      {allergies.map((allergy) => {
        const isHighCriticality = allergy.criticality === "high";
        const name =
          allergy.code?.text ??
          allergy.code?.coding?.[0]?.display ??
          "Unknown allergen";
        const reaction = allergy.reaction?.[0];
        const severity = reaction?.severity ?? "unknown";
        const type = allergy.type ?? "allergy";

        return (
          <div
            key={allergy.id}
            className={[
              "bg-[#171B26] rounded-lg p-4 border-l-4",
              isHighCriticality
                ? "border-[#E8403A] allergy-critical"
                : "border-[#2A3044]",
            ].join(" ")}
            role="article"
            aria-label={name}
          >
            <div className="flex items-start justify-between mb-2 gap-2">
              <span className="text-[#F1F3F7] font-medium leading-tight">
                {name}
              </span>
              {isHighCriticality && (
                <AlertTriangle
                  className="w-4 h-4 text-[#E8403A] flex-shrink-0 mt-0.5"
                  aria-label="High criticality"
                />
              )}
            </div>

            {reaction?.description && (
              <p className="text-sm text-[#9CA3AF] mb-2">
                {reaction.description}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
              <span
                className={`text-xs font-medium capitalize ${
                  severityColour[severity] ?? "text-[#9CA3AF]"
                }`}
              >
                {severity}
              </span>
              <span className="text-[#2A3044] select-none">·</span>
              <span className="text-xs text-[#6B7280] capitalize">{type}</span>
              {allergy.criticality && (
                <>
                  <span className="text-[#2A3044] select-none">·</span>
                  <span className="text-xs text-[#6B7280]">
                    Criticality:{" "}
                    <span className="capitalize">{allergy.criticality}</span>
                  </span>
                </>
              )}
              {allergy.recordedDate && (
                <>
                  <span className="text-[#2A3044] select-none">·</span>
                  <span className="text-xs text-[#6B7280]">
                    Recorded {formatDate(allergy.recordedDate)}
                  </span>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
