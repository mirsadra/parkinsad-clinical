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

function groupByCode(observations: Observation[]): Record<string, Observation[]> {
  const groups: Record<string, Observation[]> = {};
  for (const obs of observations) {
    for (const coding of obs.code?.coding ?? []) {
      if (coding.code) {
        groups[coding.code] ??= [];
        groups[coding.code]!.push(obs);
      }
    }
    // Also group BP by component presence
    if (obs.component && !obs.code?.coding?.some(c => c.code)) {
      groups["55284-4"] ??= [];
      groups["55284-4"]!.push(obs);
    }
  }
  // Sort each group newest first
  for (const code of Object.keys(groups)) {
    groups[code]!.sort((a, b) =>
      (b.effectiveDateTime ?? "").localeCompare(a.effectiveDateTime ?? "")
    );
  }
  return groups;
}

function getBPDisplay(obs: Observation): string {
  const sys = obs.component?.find((c) =>
    c.code?.coding?.some((cd) => cd.code === "8480-6")
  )?.valueQuantity?.value;
  const dia = obs.component?.find((c) =>
    c.code?.coding?.some((cd) => cd.code === "8462-4")
  )?.valueQuantity?.value;
  if (sys !== undefined && dia !== undefined) return `${sys}/${dia}`;
  return obs.valueQuantity?.value?.toString() ?? "—";
}

function getObsDisplay(obs: Observation, config: VitalConfig): string {
  if (config.code === "55284-4") return getBPDisplay(obs);
  const val = obs.valueQuantity?.value;
  if (val === undefined) return "—";
  return `${val}`;
}

function getSparklineData(observations: Observation[], code: string): number[] {
  if (code === "55284-4") {
    return observations
      .map((o) =>
        o.component?.find((c) =>
          c.code?.coding?.some((cd) => cd.code === "8480-6")
        )?.valueQuantity?.value ?? null
      )
      .filter((v): v is number => v !== null)
      .slice(0, 7)
      .reverse();
  }
  return observations
    .map((o) => o.valueQuantity?.value ?? null)
    .filter((v): v is number => v !== null)
    .slice(0, 7)
    .reverse();
}

export function VitalsPanel({ vitals, isLoading }: VitalsPanelProps) {
  if (isLoading) {
    return <div className="panel-content"><TableSkeleton rows={6} /></div>;
  }

  const grouped = groupByCode(vitals);

  // Calculate NEWS2
  const spO2 = grouped["59408-5"]?.[0]?.valueQuantity?.value;
  const hr = grouped["8867-4"]?.[0]?.valueQuantity?.value;
  const rr = grouped["9279-1"]?.[0]?.valueQuantity?.value;
  const temp = grouped["8310-5"]?.[0]?.valueQuantity?.value;
  const bpObs = grouped["55284-4"]?.[0];
  const sbp = bpObs?.component?.find((c) =>
    c.code?.coding?.some((cd) => cd.code === "8480-6")
  )?.valueQuantity?.value;

  const hasAnyVital =
    spO2 !== undefined || sbp !== undefined || hr !== undefined;
  const news2Score = hasAnyVital
    ? calculateNews2Score({ spO2, systolicBP: sbp, heartRate: hr, respiratoryRate: rr, temperature: temp })
    : undefined;

  return (
    <div className="panel-content p-6 space-y-6">
      {/* NEWS2 Score */}
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
          <p className="text-xs text-[#6B7280] ml-auto">
            Calculated from available vitals
          </p>
        </div>
      )}

      {/* Vitals grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {VITAL_CONFIGS.map((config) => {
          const observations = grouped[config.code] ?? [];
          if (observations.length === 0) return null;

          const latest = observations[0]!;
          const display = getObsDisplay(latest, config);
          const sparkData = getSparklineData(observations, config.code);
          const timestamp = latest.effectiveDateTime;

          return (
            <div
              key={config.code}
              className="bg-[#171B26] border border-[#2A3044] rounded-lg p-4"
            >
              <div className="flex items-start justify-between mb-2">
                <p className="text-xs text-[#6B7280] uppercase tracking-wider">
                  {config.label}
                </p>
                <Sparkline data={sparkData} color="#3B82F6" />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-semibold font-mono-data text-[#F1F3F7]">
                  {display}
                </span>
                <span className="text-sm text-[#6B7280]">{config.unit}</span>
              </div>
              {timestamp && (
                <p className="text-xs text-[#6B7280] mt-1.5">
                  {formatDateTime(timestamp)}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {vitals.length === 0 && (
        <p className="text-center text-[#6B7280] py-8">
          No vital signs recorded
        </p>
      )}
    </div>
  );
}
