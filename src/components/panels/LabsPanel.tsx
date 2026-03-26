import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { Observation } from "../../types/fhir";
import { formatDate } from "../../lib/formatters";
import { TableSkeleton } from "../shared/LoadingSkeleton";

interface LabsPanelProps {
  labs: Observation[];
  isLoading: boolean;
}

type AbnormalFlag = "HH" | "H" | "L" | "LL" | null;

function getFlag(obs: Observation): AbnormalFlag {
  const code = obs.interpretation?.[0]?.coding?.[0]?.code;
  if (code === "HH" || code === "H" || code === "L" || code === "LL") return code as AbnormalFlag;
  return null;
}

function getFlagDisplay(flag: AbnormalFlag): { symbol: string; color: string } | null {
  if (!flag) return null;
  if (flag === "HH") return { symbol: "▲▲", color: "#E8403A" };
  if (flag === "H") return { symbol: "▲", color: "#F59E0B" };
  if (flag === "L") return { symbol: "▽", color: "#3B82F6" };
  if (flag === "LL") return { symbol: "▽▽", color: "#E8403A" };
  return null;
}

function getTestName(obs: Observation): string {
  return obs.code?.text ?? obs.code?.coding?.[0]?.display ?? "Unknown test";
}

function groupByTestName(labs: Observation[]): Record<string, Observation[]> {
  const groups: Record<string, Observation[]> = {};
  for (const obs of labs) {
    const name = getTestName(obs);
    groups[name] ??= [];
    groups[name]!.push(obs);
  }
  // Sort each group newest first
  for (const name of Object.keys(groups)) {
    groups[name]!.sort((a, b) =>
      (b.effectiveDateTime ?? "").localeCompare(a.effectiveDateTime ?? "")
    );
  }
  return groups;
}

export function LabsPanel({ labs, isLoading }: LabsPanelProps) {
  const [expandedTest, setExpandedTest] = useState<string | null>(null);

  if (isLoading) {
    return <div className="panel-content"><TableSkeleton rows={10} /></div>;
  }

  if (labs.length === 0) {
    return (
      <div className="panel-content p-6 text-center text-[#6B7280]">
        No laboratory results recorded
      </div>
    );
  }

  const grouped = groupByTestName(labs);
  const testNames = Object.keys(grouped);

  return (
    <div className="panel-content">
      <table className="data-table w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-[#6B7280] uppercase tracking-wider">
            <th className="px-4 py-3 font-medium">Test</th>
            <th className="px-4 py-3 font-medium text-right">Result</th>
            <th className="px-4 py-3 font-medium hidden sm:table-cell">Reference range</th>
            <th className="px-4 py-3 font-medium hidden md:table-cell">Date</th>
            <th className="px-4 py-3 font-medium w-8"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#1A1F2E]">
          {testNames.map((testName) => {
            const observations = grouped[testName]!;
            const latest = observations[0]!;
            const flag = getFlag(latest);
            const flagDisplay = getFlagDisplay(flag);
            const isExpanded = expandedTest === testName;
            const hasHistory = observations.length > 1;
            const refRange = latest.referenceRange?.[0];
            const refText =
              refRange?.text ??
              [
                refRange?.low?.value !== undefined
                  ? `${refRange.low.value}`
                  : null,
                refRange?.high?.value !== undefined
                  ? `${refRange.high.value}`
                  : null,
              ]
                .filter(Boolean)
                .join(" – ");

            return (
              <>
                <tr
                  key={testName}
                  onClick={() =>
                    hasHistory
                      ? setExpandedTest(isExpanded ? null : testName)
                      : undefined
                  }
                  className={hasHistory ? "cursor-pointer hover:bg-[#1A1F2E] transition-colors duration-150" : ""}
                >
                  <td className="px-4 py-3 text-[#F1F3F7]">{testName}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {flagDisplay && (
                        <span
                          className="text-xs font-bold"
                          style={{ color: flagDisplay.color }}
                          aria-label={flag ?? undefined}
                        >
                          {flagDisplay.symbol}
                        </span>
                      )}
                      <span
                        className="font-mono-data font-medium"
                        style={{
                          color: flagDisplay
                            ? flagDisplay.color
                            : "#F1F3F7",
                        }}
                      >
                        {latest.valueQuantity?.value ?? "—"}
                      </span>
                      {latest.valueQuantity?.unit && (
                        <span className="text-xs text-[#6B7280]">
                          {latest.valueQuantity.unit}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[#6B7280] text-xs hidden sm:table-cell">
                    {refText || "—"}
                  </td>
                  <td className="px-4 py-3 text-[#6B7280] text-xs hidden md:table-cell font-mono-data">
                    {formatDate(latest.effectiveDateTime)}
                  </td>
                  <td className="px-4 py-3">
                    {hasHistory &&
                      (isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5 text-[#6B7280]" aria-hidden="true" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-[#6B7280]" aria-hidden="true" />
                      ))}
                  </td>
                </tr>
                {isExpanded &&
                  observations.slice(1, 6).map((obs, idx) => {
                    const histFlag = getFlag(obs);
                    const histFlagDisplay = getFlagDisplay(histFlag);
                    return (
                      <tr
                        key={`${testName}-history-${idx}`}
                        className="bg-[#0F1117]"
                      >
                        <td className="px-4 py-2 pl-8 text-[#6B7280] text-xs">
                          Previous
                        </td>
                        <td className="px-4 py-2 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {histFlagDisplay && (
                              <span
                                className="text-xs"
                                style={{ color: histFlagDisplay.color }}
                              >
                                {histFlagDisplay.symbol}
                              </span>
                            )}
                            <span
                              className="font-mono-data text-sm"
                              style={{
                                color: histFlagDisplay
                                  ? histFlagDisplay.color
                                  : "#9CA3AF",
                              }}
                            >
                              {obs.valueQuantity?.value ?? "—"}
                            </span>
                            {obs.valueQuantity?.unit && (
                              <span className="text-xs text-[#6B7280]">
                                {obs.valueQuantity.unit}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-2 text-[#6B7280] text-xs hidden sm:table-cell">
                          {obs.referenceRange?.[0]?.text ?? "—"}
                        </td>
                        <td className="px-4 py-2 text-[#6B7280] text-xs hidden md:table-cell font-mono-data">
                          {formatDate(obs.effectiveDateTime)}
                        </td>
                        <td />
                      </tr>
                    );
                  })}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
