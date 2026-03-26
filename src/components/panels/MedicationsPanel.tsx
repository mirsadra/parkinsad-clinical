import React, { useState } from "react";
import { Search, ChevronDown, ChevronUp } from "lucide-react";
import type { MedicationRequest, MedicationAdministration, MedicationDispense } from "../../types/fhir";
import { getMedicationDisplay, formatDate, formatDateTime } from "../../lib/formatters";
import { StatusBadge } from "../shared/StatusBadge";
import { TableSkeleton } from "../shared/LoadingSkeleton";

interface MedicationsPanelProps {
  requests: MedicationRequest[];
  administrations: MedicationAdministration[];
  dispenses: MedicationDispense[];
  isLoading: boolean;
}

type FilterStatus = "active" | "all";

export function MedicationsPanel({
  requests,
  administrations,
  dispenses,
  isLoading,
}: MedicationsPanelProps) {
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("active");

  if (isLoading) return <div className="panel-content"><TableSkeleton rows={6} /></div>;

  const filtered = requests
    .filter((r) => statusFilter === "all" || r.status === "active")
    .filter((r) =>
      getMedicationDisplay(r).toLowerCase().includes(search.toLowerCase())
    );

  // Find most recent administration for a given medication request
  function lastAdministered(med: MedicationRequest): string | undefined {
    const ref = `MedicationRequest/${med.id}`;
    const admin = administrations
      .filter(
        (a) =>
          a.request?.reference === ref ||
          a.medicationCodeableConcept?.text === med.medicationCodeableConcept?.text
      )
      .sort((a, b) => {
        const dateA = a.effectiveDateTime ?? a.effectivePeriod?.start ?? "";
        const dateB = b.effectiveDateTime ?? b.effectivePeriod?.start ?? "";
        return dateB.localeCompare(dateA);
      });
    return admin[0]?.effectiveDateTime ?? admin[0]?.effectivePeriod?.start;
  }

  return (
    <div className="panel-content flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[#2A3044] flex-wrap">
        <div className="flex gap-1">
          {(["active", "all"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={[
                "px-3 py-1 rounded text-xs font-medium capitalize transition-colors duration-150",
                statusFilter === f
                  ? "bg-[#3B82F6] text-white"
                  : "bg-[#1E2333] text-[#9CA3AF] hover:text-[#F1F3F7]",
              ].join(" ")}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search
            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#6B7280]"
            aria-hidden="true"
          />
          <input
            type="search"
            placeholder="Search medications…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search medications"
            className="w-full pl-8 pr-3 py-1.5 bg-[#1E2333] border border-[#2A3044] rounded text-sm text-[#F1F3F7] placeholder-[#6B7280] focus:outline-none focus:border-[#3B82F6] transition-colors duration-150"
          />
        </div>
        <span className="text-xs text-[#6B7280] ml-auto tabular-nums">
          {filtered.length} medication{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      <table className="data-table w-full text-sm" role="table">
        <thead>
          <tr className="text-left text-xs text-[#6B7280] uppercase tracking-wider">
            <th className="px-4 py-3 font-medium">Drug</th>
            <th className="px-4 py-3 font-medium hidden md:table-cell">Dose / Route</th>
            <th className="px-4 py-3 font-medium hidden md:table-cell">Frequency</th>
            <th className="px-4 py-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#1A1F2E]">
          {filtered.map((med) => {
            const name = getMedicationDisplay(med);
            const dosage = med.dosageInstruction?.[0];
            const isExpanded = expandedId === med.id;
            const lastAdmin = lastAdministered(med);

            return (
              <React.Fragment key={med.id}>
                <tr
                  onClick={() =>
                    setExpandedId(isExpanded ? null : (med.id ?? null))
                  }
                  className="cursor-pointer hover:bg-[#1A1F2E] transition-colors duration-150"
                  aria-expanded={isExpanded}
                >
                  <td className="px-4 py-3 text-[#F1F3F7] font-medium">
                    {name}
                  </td>
                  <td className="px-4 py-3 text-[#9CA3AF] hidden md:table-cell font-mono-data text-xs">
                    {dosage?.text
                      ? dosage.text.split("—")[0]?.trim()
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-[#9CA3AF] hidden md:table-cell text-xs">
                    {dosage?.timing?.code?.text ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <StatusBadge status={med.status ?? "unknown"} />
                      {isExpanded ? (
                        <ChevronUp
                          className="w-3.5 h-3.5 text-[#6B7280]"
                          aria-hidden="true"
                        />
                      ) : (
                        <ChevronDown
                          className="w-3.5 h-3.5 text-[#6B7280]"
                          aria-hidden="true"
                        />
                      )}
                    </div>
                  </td>
                </tr>
                {isExpanded && (
                  <tr className="bg-[#0F1117]">
                    <td colSpan={4} className="px-6 py-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-[#6B7280] text-xs uppercase tracking-wider mb-1">
                            Full instructions
                          </p>
                          <p className="text-[#9CA3AF]">
                            {dosage?.text ?? "No instructions recorded"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[#6B7280] text-xs uppercase tracking-wider mb-1">
                            Indication
                          </p>
                          <p className="text-[#9CA3AF]">
                            {med.reasonCode?.[0]?.coding?.[0]?.display ??
                              med.reasonCode?.[0]?.text ??
                              "Not recorded"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[#6B7280] text-xs uppercase tracking-wider mb-1">
                            Prescribed
                          </p>
                          <p className="text-[#9CA3AF]">
                            {formatDate(med.authoredOn)}
                          </p>
                        </div>
                        {lastAdmin && (
                          <div>
                            <p className="text-[#6B7280] text-xs uppercase tracking-wider mb-1">
                              Last administered
                            </p>
                            <p className="text-[#9CA3AF] font-mono-data text-xs">
                              {formatDateTime(lastAdmin)}
                            </p>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
          {filtered.length === 0 && (
            <tr>
              <td
                colSpan={4}
                className="px-4 py-8 text-center text-[#6B7280]"
              >
                No medications found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
