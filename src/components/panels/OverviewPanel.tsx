import {
  Pill,
  AlertTriangle,
  Activity,
  Heart,
  CalendarDays,
  Scissors,
  Syringe,
  Droplets,
} from "lucide-react";
import { SummaryCard } from "../shared/SummaryCard";
import { TableSkeleton } from "../shared/LoadingSkeleton";
import type { PortfolioData } from "../../hooks/usePortfolio";
import { formatDate } from "../../lib/formatters";
import { getNews2Color, calculateNews2Score } from "../../lib/news2";

interface OverviewPanelProps {
  data: PortfolioData;
}

function getLatestObsValue(
  vitals: PortfolioData["vitals"],
  loincCode: string
): number | undefined {
  const obs = vitals
    .filter((v) => v.code?.coding?.some((c) => c.code === loincCode))
    .sort((a, b) =>
      (b.effectiveDateTime ?? "").localeCompare(a.effectiveDateTime ?? "")
    )[0];
  return obs?.valueQuantity?.value ?? undefined;
}

function getLatestBP(
  vitals: PortfolioData["vitals"]
): string | undefined {
  const bpObs = vitals
    .filter((v) =>
      v.code?.coding?.some(
        (c) => c.code === "55284-4" || c.code === "85354-9"
      ) || v.component != null
    )
    .sort((a, b) =>
      (b.effectiveDateTime ?? "").localeCompare(a.effectiveDateTime ?? "")
    )[0];

  if (!bpObs?.component) return undefined;
  const sys = bpObs.component.find((c) =>
    c.code?.coding?.some((cd) => cd.code === "8480-6")
  )?.valueQuantity?.value;
  const dia = bpObs.component.find((c) =>
    c.code?.coding?.some((cd) => cd.code === "8462-4")
  )?.valueQuantity?.value;
  if (sys && dia) return `${sys}/${dia}`;
  return undefined;
}

export function OverviewPanel({ data }: OverviewPanelProps) {
  if (data.isLoading && !data.patient) {
    return <div className="panel-content"><TableSkeleton rows={6} /></div>;
  }

  const severeAllergies = data.allergies.filter(
    (a) => a.criticality === "high"
  ).length;
  const spO2 = getLatestObsValue(data.vitals, "59408-5");
  const hr = getLatestObsValue(data.vitals, "8867-4");
  const bp = getLatestBP(data.vitals);
  const weight = getLatestObsValue(data.vitals, "29463-7");

  const mostRecentEncounter = data.encounters[0];
  const activeConditions = data.conditions.filter(
    (c) =>
      c.clinicalStatus?.coding?.some((s) => s.code === "active") ?? true
  ).length;

  // Simple NEWS2 from available vitals
  const rr = getLatestObsValue(data.vitals, "9279-1");
  const temp = getLatestObsValue(data.vitals, "8310-5");
  const sbpVal = bp ? parseInt(bp.split("/")[0] ?? "0") : undefined;
  const news2Score =
    spO2 !== undefined || sbpVal !== undefined || rr !== undefined
      ? calculateNews2Score({
          spO2,
          systolicBP: sbpVal,
          heartRate: hr,
          respiratoryRate: rr,
          temperature: temp,
        })
      : undefined;

  return (
    <div className="panel-content p-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <SummaryCard
          icon={Pill}
          value={data.medicationRequests.length}
          label="Active medications"
          accentColor="#3B82F6"
        />
        <SummaryCard
          icon={AlertTriangle}
          value={data.allergies.length}
          label={`Allerg${data.allergies.length !== 1 ? "ies" : "y"} / intolerance${data.allergies.length !== 1 ? "s" : ""}`}
          accentColor={severeAllergies > 0 ? "#E8403A" : "#F59E0B"}
          alert={severeAllergies > 0}
          subtitle={severeAllergies > 0 ? `${severeAllergies} high criticality` : undefined}
        />
        {bp && (
          <SummaryCard
            icon={Activity}
            value={bp}
            label="Latest BP (mmHg)"
            accentColor="#3B82F6"
          />
        )}
        {spO2 !== undefined && (
          <SummaryCard
            icon={Droplets}
            value={`${spO2}%`}
            label="Latest SpO₂"
            accentColor={spO2 < 95 ? "#E8403A" : "#22C55E"}
            alert={spO2 < 95}
          />
        )}
        {hr !== undefined && (
          <SummaryCard
            icon={Activity}
            value={hr}
            label="Heart rate (bpm)"
            accentColor="#3B82F6"
          />
        )}
        {news2Score !== undefined && (
          <SummaryCard
            icon={Activity}
            value={`NEWS2: ${news2Score}`}
            label="Early warning score"
            accentColor={getNews2Color(news2Score)}
            alert={news2Score >= 5}
          />
        )}
        <SummaryCard
          icon={Heart}
          value={activeConditions}
          label="Active conditions"
          accentColor="#F59E0B"
        />
        {mostRecentEncounter && (
          <SummaryCard
            icon={CalendarDays}
            value={formatDate(
              mostRecentEncounter.period?.start ??
                mostRecentEncounter.period?.end
            )}
            label={mostRecentEncounter.type?.[0]?.text ?? "Recent encounter"}
            accentColor="#6B7280"
          />
        )}
        {weight !== undefined && (
          <SummaryCard
            icon={Activity}
            value={`${weight} kg`}
            label="Weight"
            accentColor="#6B7280"
          />
        )}
        <SummaryCard
          icon={Scissors}
          value={data.procedures.length}
          label="Procedures"
          accentColor="#6B7280"
        />
        <SummaryCard
          icon={Syringe}
          value={data.immunizations.length}
          label="Immunisations"
          accentColor="#22C55E"
        />
      </div>
    </div>
  );
}
