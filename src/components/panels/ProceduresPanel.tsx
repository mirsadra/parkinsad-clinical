import type { Procedure } from "../../types/fhir";
import { formatDate } from "../../lib/formatters";
import { StatusBadge } from "../shared/StatusBadge";
import { TableSkeleton } from "../shared/LoadingSkeleton";

interface ProceduresPanelProps {
  procedures: Procedure[];
  isLoading: boolean;
}

export function ProceduresPanel({ procedures, isLoading }: ProceduresPanelProps) {
  if (isLoading) {
    return <div className="panel-content"><TableSkeleton rows={5} /></div>;
  }

  if (procedures.length === 0) {
    return (
      <div className="panel-content p-6 text-center text-[#6B7280]">
        No procedures recorded
      </div>
    );
  }

  return (
    <div className="panel-content">
      <table className="data-table w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-[#6B7280] uppercase tracking-wider">
            <th className="px-4 py-3 font-medium">Procedure</th>
            <th className="px-4 py-3 font-medium hidden sm:table-cell">Date</th>
            <th className="px-4 py-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#1A1F2E]">
          {procedures.map((proc) => {
            const name =
              proc.code?.text ??
              proc.code?.coding?.[0]?.display ??
              "Unknown procedure";
            const date =
              proc.performedDateTime ??
              (typeof proc.performedPeriod === "object"
                ? proc.performedPeriod?.start
                : undefined);
            const note = proc.note?.[0]?.text;

            return (
              <tr
                key={proc.id}
                className="hover:bg-[#1A1F2E] transition-colors duration-150"
              >
                <td className="px-4 py-3">
                  <p className="text-[#F1F3F7] font-medium">{name}</p>
                  {note && (
                    <p className="text-xs text-[#9CA3AF] mt-0.5 max-w-md">
                      {note}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3 text-[#9CA3AF] text-sm font-mono-data hidden sm:table-cell">
                  {date ? formatDate(date) : "—"}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={proc.status} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
