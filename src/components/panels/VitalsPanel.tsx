import { useState } from "react";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import type { Observation } from "../../types/fhir";
import { formatDateTime } from "../../lib/formatters";
import { calculateNews2Score, getNews2Color, getNews2Severity } from "../../lib/news2";
import { Sparkline } from "../shared/Sparkline";
import { TableSkeleton } from "../shared/LoadingSkeleton";

interface VitalsPanelProps {
  vitals: Observation[];
  isLoading: boolean;
}

interface VitalConfig {
  code: string;
  label: string;
  unit: string;
}

const VITAL_CONFIGS: VitalConfig[] = [
  { code: "55284-4", label: "Blood Pressure", unit: "mmHg" },
  { code: "59408-5", label: "SpO₂", unit: "%" },
  { code: "8867-4", label: "Heart Rate", unit: "bpm" },
  { code: "8310-5", label: "Temperature", unit: "°C" },
  { code: "9279-1", label: "Respiratory Rate", unit: "breaths/min" },
  { code: "29463-7", label: "Weight", unit: "kg" },
  { code: "8302-2", label: "Height", unit: "cm" },
];

// ─── Data utilities ───────────────────────────────────────────────────────────

function groupByCode(observations: Observation[]): Record<string, Observation[]> {
  const groups: Record<string, Observation[]> = {};
  for (const obs of observations) {
    for (const coding of obs.code?.coding ?? []) {
      if (coding.code) {
        groups[coding.code] ??= [];
        groups[coding.code]!.push(obs);
      }
    }
  }
  for (const code of Object.keys(groups)) {
    groups[code]!.sort((a, b) =>
      (b.effectiveDateTime ?? "").localeCompare(a.effectiveDateTime ?? "")
    );
  }
  return groups;
}

function getBPValues(obs: Observation): { sys: number; dia: number } | null {
  const sys = obs.component?.find((c) =>
    c.code?.coding?.some((cd) => cd.code === "8480-6")
  )?.valueQuantity?.value;
  const dia = obs.component?.find((c) =>
    c.code?.coding?.some((cd) => cd.code === "8462-4")
  )?.valueQuantity?.value;
  if (sys !== undefined && dia !== undefined) return { sys, dia };
  return null;
}

function getObsDisplay(obs: Observation, code: string): string {
  if (code === "55284-4") {
    const bp = getBPValues(obs);
    return bp ? `${bp.sys}/${bp.dia}` : "—";
  }
  const val = obs.valueQuantity?.value;
  return val !== undefined ? String(val) : "—";
}

function getSparklineData(observations: Observation[], code: string): number[] {
  const raw =
    code === "55284-4"
      ? observations.map(
          (o) =>
            o.component?.find((c) =>
              c.code?.coding?.some((cd) => cd.code === "8480-6")
            )?.valueQuantity?.value ?? null
        )
      : observations.map((o) => o.valueQuantity?.value ?? null);

  return raw
    .filter((v): v is number => v !== null)
    .slice(0, 15)
    .reverse();
}

// ─── Clinical status functions ────────────────────────────────────────────────

interface ClinicalStatus { label: string; color: string }

function getBPStatus(sys: number, dia: number): ClinicalStatus {
  if (sys > 180 || dia > 120) return { label: "Hypertensive crisis", color: "#DC2626" };
  if (sys >= 140 || dia >= 90) return { label: "Stage 2 HT", color: "#E8403A" };
  if (sys >= 130 || dia >= 80) return { label: "Stage 1 HT", color: "#F97316" };
  if (sys >= 120) return { label: "Elevated", color: "#F59E0B" };
  return { label: "Normal", color: "#22C55E" };
}

function getTempStatus(celsius: number): ClinicalStatus {
  if (celsius >= 39.0) return { label: "High fever", color: "#E8403A" };
  if (celsius >= 38.0) return { label: "Fever", color: "#F97316" };
  if (celsius >= 37.3) return { label: "Low-grade", color: "#F59E0B" };
  if (celsius < 36.0) return { label: "Hypothermia", color: "#3B82F6" };
  return { label: "Normal", color: "#22C55E" };
}

function getHRStatus(bpm: number): ClinicalStatus {
  if (bpm > 150) return { label: "Severe tachy", color: "#E8403A" };
  if (bpm > 100) return { label: "Tachycardia", color: "#F97316" };
  if (bpm < 40) return { label: "Severe brady", color: "#E8403A" };
  if (bpm < 60) return { label: "Bradycardia", color: "#3B82F6" };
  return { label: "Normal", color: "#22C55E" };
}

/** Detect temperature spike: a reading ≥38°C whose immediate neighbours are both ≤37.5°C */
function buildSpikeSet(observations: Observation[]): Set<string> {
  const sorted = [...observations].reverse(); // oldest → newest
  const spikes = new Set<string>();
  for (let i = 0; i < sorted.length; i++) {
    const val = sorted[i]!.valueQuantity?.value;
    if (val == null || val < 38.0) continue;
    const prev = sorted[i - 1]?.valueQuantity?.value;
    const next = sorted[i + 1]?.valueQuantity?.value;
    if ((prev == null || prev <= 37.5) && (next == null || next <= 37.5)) {
      spikes.add(sorted[i]!.id ?? String(i));
    }
  }
  return spikes;
}

// ─── History table ─────────────────────────────────────────────────────────────

function HistoryTable({
  config,
  observations,
  onClose,
}: {
  config: VitalConfig;
  observations: Observation[];
  onClose: () => void;
}) {
  const rows = observations.slice(0, 20);
  const spikeSet = config.code === "8310-5" ? buildSpikeSet(observations) : null;

  return (
    <div className="bg-[#171B26] border border-[#3B82F6] rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#2A3044]">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#F1F3F7]">
            {config.label}
          </span>
          <span className="text-xs text-[#6B7280]">
            · {rows.length} of {observations.length} recordings
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-[#6B7280] hover:text-[#F1F3F7] transition-colors"
          aria-label="Close history"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-[#6B7280] uppercase tracking-wider border-b border-[#2A3044]">
              <th className="px-4 py-2 font-medium">Date / Time</th>
              <th className="px-4 py-2 font-medium text-right">
                {config.code === "55284-4" ? "Systolic / Diastolic" : "Value"}
              </th>
              {(config.code === "55284-4" || config.code === "8310-5" || config.code === "8867-4") && (
                <th className="px-4 py-2 font-medium">Status</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1A1F2E]">
            {rows.map((obs, idx) => {
              const obsId = obs.id ?? String(idx);
              const isSpike = spikeSet?.has(obsId) ?? false;

              // Per-vital row rendering
              if (config.code === "55284-4") {
                const bp = getBPValues(obs);
                if (!bp) return null;
                const status = getBPStatus(bp.sys, bp.dia);
                return (
                  <tr key={obsId} className="hover:bg-[#1A1F2E] transition-colors">
                    <td className="px-4 py-2 text-[#6B7280] font-mono-data whitespace-nowrap">
                      {formatDateTime(obs.effectiveDateTime)}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <span
                        className="font-mono-data font-semibold"
                        style={{ color: status.color }}
                      >
                        {bp.sys}/{bp.dia}
                      </span>
                      <span className="text-[#6B7280] ml-1">mmHg</span>
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                        style={{
                          color: status.color,
                          backgroundColor: `${status.color}18`,
                        }}
                      >
                        {status.label}
                      </span>
                    </td>
                  </tr>
                );
              }

              if (config.code === "8310-5") {
                const val = obs.valueQuantity?.value;
                if (val == null) return null;
                const status = getTempStatus(val);
                return (
                  <tr key={obsId} className="hover:bg-[#1A1F2E] transition-colors">
                    <td className="px-4 py-2 text-[#6B7280] font-mono-data whitespace-nowrap">
                      {formatDateTime(obs.effectiveDateTime)}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <span
                        className="font-mono-data font-semibold"
                        style={{ color: status.color }}
                      >
                        {val}
                      </span>
                      <span className="text-[#6B7280] ml-1">°C</span>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                          style={{
                            color: status.color,
                            backgroundColor: `${status.color}18`,
                          }}
                        >
                          {status.label}
                        </span>
                        {isSpike && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#F97316]18 text-[#F97316] border border-[#F97316]40">
                            ↑ Spike
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              }

              if (config.code === "8867-4") {
                const val = obs.valueQuantity?.value;
                if (val == null) return null;
                const status = getHRStatus(val);
                return (
                  <tr key={obsId} className="hover:bg-[#1A1F2E] transition-colors">
                    <td className="px-4 py-2 text-[#6B7280] font-mono-data whitespace-nowrap">
                      {formatDateTime(obs.effectiveDateTime)}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <span
                        className="font-mono-data font-semibold"
                        style={{ color: status.color }}
                      >
                        {val}
                      </span>
                      <span className="text-[#6B7280] ml-1">bpm</span>
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                        style={{
                          color: status.color,
                          backgroundColor: `${status.color}18`,
                        }}
                      >
                        {status.label}
                      </span>
                    </td>
                  </tr>
                );
              }

              // Generic vitals (SpO2, RR, Weight, Height)
              const val = obs.valueQuantity?.value;
              return (
                <tr key={obsId} className="hover:bg-[#1A1F2E] transition-colors">
                  <td className="px-4 py-2 text-[#6B7280] font-mono-data whitespace-nowrap">
                    {formatDateTime(obs.effectiveDateTime)}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <span className="font-mono-data font-semibold text-[#F1F3F7]">
                      {val ?? "—"}
                    </span>
                    <span className="text-[#6B7280] ml-1">{config.unit}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export function VitalsPanel({ vitals, isLoading }: VitalsPanelProps) {
  const [expandedCode, setExpandedCode] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="panel-content">
        <TableSkeleton rows={6} />
      </div>
    );
  }

  const grouped = groupByCode(vitals);

  // NEWS2 from latest readings
  const spO2 = grouped["59408-5"]?.[0]?.valueQuantity?.value;
  const hr = grouped["8867-4"]?.[0]?.valueQuantity?.value;
  const rr = grouped["9279-1"]?.[0]?.valueQuantity?.value;
  const temp = grouped["8310-5"]?.[0]?.valueQuantity?.value;
  const bpObs = grouped["55284-4"]?.[0];
  const sbp = bpObs?.component?.find((c) =>
    c.code?.coding?.some((cd) => cd.code === "8480-6")
  )?.valueQuantity?.value;

  const hasAnyVital = spO2 !== undefined || sbp !== undefined || hr !== undefined;
  const news2Score = hasAnyVital
    ? calculateNews2Score({ spO2, systolicBP: sbp, heartRate: hr, respiratoryRate: rr, temperature: temp })
    : undefined;

  function toggleExpand(code: string) {
    setExpandedCode((prev) => (prev === code ? null : code));
  }

  const expandedConfig = VITAL_CONFIGS.find((c) => c.code === expandedCode);

  return (
    <div className="panel-content p-6 space-y-6">
      {/* NEWS2 score */}
      {news2Score !== undefined && (
        <div
          className="flex items-center gap-4 p-4 bg-[#171B26] border border-[#2A3044] rounded-lg"
          aria-label={`NEWS2 score: ${news2Score}`}
        >
          <div>
            <p className="text-xs text-[#6B7280] uppercase tracking-wider mb-1">
              NEWS2 Early Warning Score
            </p>
            <div className="flex items-center gap-3">
              <span
                className="text-3xl font-bold font-mono-data"
                style={{ color: getNews2Color(news2Score) }}
              >
                {news2Score}
              </span>
              <span
                className="px-2 py-0.5 rounded-full text-xs font-medium capitalize"
                style={{
                  backgroundColor: `${getNews2Color(news2Score)}20`,
                  color: getNews2Color(news2Score),
                }}
              >
                {getNews2Severity(news2Score)}
              </span>
            </div>
          </div>
          <p className="text-xs text-[#6B7280] ml-auto">Calculated from available vitals</p>
        </div>
      )}

      {/* Vitals grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {VITAL_CONFIGS.map((config) => {
          const observations = grouped[config.code] ?? [];
          if (observations.length === 0) return null;

          const latest = observations[0]!;
          const display = getObsDisplay(latest, config.code);
          const sparkData = getSparklineData(observations, config.code);
          const isExpanded = expandedCode === config.code;
          const count = observations.length;

          return (
            <button
              key={config.code}
              type="button"
              onClick={() => toggleExpand(config.code)}
              className={[
                "text-left bg-[#171B26] rounded-lg p-4 transition-colors duration-150",
                "border",
                isExpanded
                  ? "border-[#3B82F6]"
                  : "border-[#2A3044] hover:border-[#3B4055]",
              ].join(" ")}
            >
              <div className="flex items-start justify-between mb-2">
                <p className="text-xs text-[#6B7280] uppercase tracking-wider">
                  {config.label}
                </p>
                <div className="flex items-center gap-2">
                  <Sparkline data={sparkData} color={isExpanded ? "#3B82F6" : "#3B82F6"} />
                  {count > 1 &&
                    (isExpanded ? (
                      <ChevronUp className="w-3.5 h-3.5 text-[#3B82F6] flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-[#6B7280] flex-shrink-0" />
                    ))}
                </div>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-semibold font-mono-data text-[#F1F3F7]">
                  {display}
                </span>
                <span className="text-sm text-[#6B7280]">{config.unit}</span>
              </div>
              <div className="flex items-center justify-between mt-1.5">
                <p className="text-xs text-[#6B7280]">
                  {formatDateTime(latest.effectiveDateTime)}
                </p>
                {count > 1 && (
                  <span className="text-[10px] text-[#6B7280]">{count} recordings</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Expanded history */}
      {expandedConfig && (
        <HistoryTable
          config={expandedConfig}
          observations={grouped[expandedCode!] ?? []}
          onClose={() => setExpandedCode(null)}
        />
      )}

      {vitals.length === 0 && (
        <p className="text-center text-[#6B7280] py-8">No vital signs recorded</p>
      )}
    </div>
  );
}
