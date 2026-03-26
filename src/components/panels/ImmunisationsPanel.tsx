import type { Immunization } from "../../types/fhir";
import { formatDate } from "../../lib/formatters";
import { StatusBadge } from "../shared/StatusBadge";
import { TableSkeleton } from "../shared/LoadingSkeleton";

interface ImmunisationsPanelProps {
  immunizations: Immunization[];
  isLoading: boolean;
}

export function ImmunisationsPanel({
  immunizations,
  isLoading,
}: ImmunisationsPanelProps) {
  if (isLoading) {
    return <div className="panel-content"><TableSkeleton rows={5} /></div>;
  }

  if (immunizations.length === 0) {
    return (
      <div className="panel-content p-6 text-center text-[#6B7280]">
        No immunisations recorded
      </div>
    );
  }

  const sorted = [...immunizations].sort((a, b) => {
    const dateA = a.occurrenceDateTime ?? "";
    const dateB = b.occurrenceDateTime ?? "";
    return dateB.localeCompare(dateA);
  });

  return (
    <div className="panel-content">
      <table className="data-table w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-[#6B7280] uppercase tracking-wider">
            <th className="px-4 py-3 font-medium">Vaccine</th>
            <th className="px-4 py-3 font-medium hidden sm:table-cell">Date given</th>
            <th className="px-4 py-3 font-medium hidden md:table-cell">Site</th>
            <th className="px-4 py-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#1A1F2E]">
          {sorted.map((imm) => {
            const name =
              imm.vaccineCode?.text ??
              imm.vaccineCode?.coding?.[0]?.display ??
              "Unknown vaccine";
            const date =
              typeof imm.occurrenceDateTime === "string"
                ? imm.occurrenceDateTime
                : undefined;
            const site =
              imm.site?.coding?.[0]?.display ?? imm.site?.text;

            return (
              <tr
                key={imm.id}
                className="hover:bg-[#1A1F2E] transition-colors duration-150"
              >
                <td className="px-4 py-3">
                  <p className="text-[#F1F3F7] font-medium">{name}</p>
                  {imm.lotNumber && (
                    <p className="text-xs text-[#6B7280] font-mono-data mt-0.5">
                      Lot: {imm.lotNumber}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3 text-[#9CA3AF] font-mono-data text-sm hidden sm:table-cell">
                  {date ? formatDate(date) : "—"}
                </td>
                <td className="px-4 py-3 text-[#9CA3AF] text-sm hidden md:table-cell">
                  {site ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={imm.status} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
