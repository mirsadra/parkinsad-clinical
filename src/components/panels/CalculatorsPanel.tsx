import { useState, useEffect, useRef, useMemo } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { PortfolioData } from "../../hooks/usePortfolio";
import type { Observation } from "../../types/fhir";

interface CalculatorsPanelProps {
  patient: PortfolioData["patient"];
  vitals: PortfolioData["vitals"];
  labs: PortfolioData["labs"];
}

// ─── Pure calculation logic ───────────────────────────────────────────────────

interface CgInputs {
  sex: "female" | "male";
  age: number;
  weightKg: number;
  creatinineUmol: number;
  heightCm?: number;
}

interface CgResults {
  originalCrCl: number;
  bmi?: number;
  ibwKg?: number;
  abwKg?: number;
  weightCategory?: "underweight" | "normal" | "overweight";
  ibwCrCl?: number;
  abwCrCl?: number;
  rangeLow?: number;
  rangeHigh?: number;
}

function calcCg({ sex, age, weightKg, creatinineUmol, heightCm }: CgInputs): CgResults | null {
  const crMgdl = creatinineUmol / 88.4;
  if (crMgdl <= 0 || age <= 0 || age >= 140 || weightKg <= 0) return null;

  const sexFactor = sex === "female" ? 0.85 : 1.0;
  const cgWith = (w: number) => ((140 - age) * w * sexFactor) / (72 * crMgdl);
  const originalCrCl = cgWith(weightKg);
  if (!isFinite(originalCrCl) || originalCrCl <= 0) return null;

  if (heightCm == null) return { originalCrCl };

  const heightM = heightCm / 100;
  const bmi = weightKg / (heightM * heightM);
  const heightInch = heightCm / 2.54;
  const ibwKg = (sex === "female" ? 45.5 : 50.0) + 2.3 * (heightInch - 60);

  if (bmi < 18.5) {
    return { originalCrCl, bmi, ibwKg, weightCategory: "underweight" };
  }

  if (bmi < 25) {
    const ibwCrCl = cgWith(ibwKg);
    return {
      originalCrCl, bmi, ibwKg, weightCategory: "normal", ibwCrCl,
      rangeLow: Math.min(originalCrCl, ibwCrCl),
      rangeHigh: Math.max(originalCrCl, ibwCrCl),
    };
  }

  const abwKg = ibwKg + 0.4 * (weightKg - ibwKg);
  const abwCrCl = cgWith(abwKg);
  const ibwCrCl = cgWith(ibwKg);
  return {
    originalCrCl, bmi, ibwKg, abwKg, weightCategory: "overweight",
    ibwCrCl, abwCrCl,
    rangeLow: Math.min(abwCrCl, ibwCrCl),
    rangeHigh: Math.max(abwCrCl, ibwCrCl),
  };
}

function getCrClColor(crcl: number): string {
  if (crcl >= 90) return "#22C55E";
  if (crcl >= 60) return "#F59E0B";
  if (crcl >= 30) return "#F97316";
  if (crcl >= 15) return "#E8403A";
  return "#DC2626";
}

function getCrClStage(crcl: number): string {
  if (crcl >= 90) return "Normal / mildly decreased";
  if (crcl >= 60) return "Mild-moderate decrease";
  if (crcl >= 30) return "Moderate-severe decrease";
  if (crcl >= 15) return "Severe decrease";
  return "Kidney failure";
}

// ─── FHIR helpers ─────────────────────────────────────────────────────────────

function getAge(birthDate: string): number {
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function getLatestByLoinc(observations: Observation[], codes: string[]): Observation | undefined {
  return observations
    .filter((o) => o.code?.coding?.some((c) => codes.includes(c.code ?? "")))
    .sort((a, b) => (b.effectiveDateTime ?? "").localeCompare(a.effectiveDateTime ?? ""))[0];
}

/** Convert a quantity to cm, handling common UCUM units. Returns undefined if unreasonable. */
function parseHeightToCm(obs: Observation): number | undefined {
  const val = obs.valueQuantity?.value;
  if (val == null) return undefined;

  const unit = (obs.valueQuantity?.unit ?? obs.valueQuantity?.code ?? "").toLowerCase().trim();

  let cm: number;
  if (unit === "[in_i]" || unit === "in" || unit === "[in_us]" || unit === "inches") {
    cm = val * 2.54;
  } else if (unit === "m") {
    cm = val * 100;
  } else if (unit === "mm") {
    cm = val / 10;
  } else {
    cm = val; // assume cm
  }

  // Sanity check — reject values outside plausible human range
  if (cm < 100 || cm > 250) return undefined;
  return cm;
}

function creatinineToUmol(obs: Observation): number | undefined {
  const val = obs.valueQuantity?.value;
  if (val == null) return undefined;
  const unit = (obs.valueQuantity?.unit ?? "").toLowerCase();
  return unit.includes("mg") || unit === "mg/dl" ? val * 88.4 : val;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** A single read-only chart value row */
function ChartParam({
  label,
  value,
  unit,
  loading,
}: {
  label: string;
  value?: string | number;
  unit?: string;
  loading?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between py-2.5 border-b border-[#2A3044] last:border-0">
      <span className="text-xs font-medium text-[#6B7280] uppercase tracking-wider">{label}</span>
      <div className="flex items-baseline gap-1.5">
        {loading ? (
          <span className="inline-block w-16 h-3.5 rounded skeleton" />
        ) : value == null ? (
          <span className="text-xs text-[#6B7280] italic">Not in chart</span>
        ) : (
          <>
            <span className="text-sm font-mono-data font-medium text-[#F1F3F7] tabular-nums">
              {value}
            </span>
            {unit && <span className="text-xs text-[#6B7280]">{unit}</span>}
          </>
        )}
      </div>
    </div>
  );
}

function ResultCard({
  value,
  label,
  primary = false,
}: {
  value: number;
  label: string;
  primary?: boolean;
}) {
  const color = getCrClColor(value);
  return (
    <div
      className={[
        "p-4 rounded-lg border",
        primary ? "bg-[#171B26] border-[#2A3044]" : "bg-[#0F1117] border-[#2A3044]",
      ].join(" ")}
    >
      <div className="flex items-baseline gap-2 flex-wrap">
        <span
          className={`font-mono-data font-bold tabular-nums ${primary ? "text-4xl" : "text-2xl"}`}
          style={{ color }}
        >
          {Math.round(value)}
        </span>
        <span className="text-sm text-[#9CA3AF]">mL/min</span>
        {primary && (
          <span
            className="ml-auto text-xs px-2 py-0.5 rounded-full border whitespace-nowrap"
            style={{ color, borderColor: `${color}40` }}
          >
            {getCrClStage(value)}
          </span>
        )}
      </div>
      <p className="text-xs text-[#9CA3AF] mt-1.5 leading-relaxed">{label}</p>
    </div>
  );
}

function RangeCard({ low, high, note }: { low: number; high: number; note: string }) {
  return (
    <div className="p-4 bg-[#0F1117] border border-[#2A3044] border-l-2 border-l-[#6B7280] rounded-lg">
      <div className="flex items-baseline gap-2">
        <span className="text-xl font-mono-data font-bold tabular-nums text-[#F1F3F7]">
          {low.toFixed(1)}–{high.toFixed(1)}
        </span>
        <span className="text-sm text-[#9CA3AF]">mL/min</span>
      </div>
      <p className="text-xs text-[#6B7280] mt-1.5 italic leading-relaxed">{note}</p>
    </div>
  );
}

function InfoSection({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-[#2A3044] rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-[#171B26] hover:bg-[#1A1F2E] transition-colors duration-150 text-left"
      >
        <span className="text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">
          {title}
        </span>
        {open ? (
          <ChevronUp className="w-4 h-4 text-[#6B7280]" aria-hidden="true" />
        ) : (
          <ChevronDown className="w-4 h-4 text-[#6B7280]" aria-hidden="true" />
        )}
      </button>
      {open && (
        <div className="px-4 py-3 text-xs text-[#9CA3AF] space-y-2 bg-[#0F1117] leading-relaxed">
          {children}
        </div>
      )}
    </div>
  );
}

const INPUT_CLS =
  "w-full bg-[#0F1117] border border-[#2A3044] rounded-md px-3 py-2 text-[#F1F3F7] text-sm font-mono-data tabular-nums focus:outline-none focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6] placeholder:text-[#3B4055] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

// ─── Main component ───────────────────────────────────────────────────────────

// LOINC codes that may carry a patient height (measured, stated, lying, standing)
const HEIGHT_LOINCS = ["8302-2", "3137-7", "8306-3", "8308-9"];
// LOINC codes for serum / blood creatinine
const CREATININE_LOINCS = ["2160-0", "14682-9", "38483-4"];

export function CalculatorsPanel({ patient, vitals, labs }: CalculatorsPanelProps) {
  const [heightStr, setHeightStr] = useState("");
  const autoPopulated = useRef(false);

  // ── Derived chart values (read-only) ──────────────────────────────────────
  const sex: "female" | "male" = patient?.gender === "female" ? "female" : "male";
  const age = patient?.birthDate ? getAge(patient.birthDate) : undefined;

  const weightObs = getLatestByLoinc(vitals, ["29463-7"]);
  const weightKg = weightObs?.valueQuantity?.value ?? undefined;

  const creatObs = getLatestByLoinc(labs, CREATININE_LOINCS);
  const creatinineUmol = creatObs ? creatinineToUmol(creatObs) : undefined;

  // ── Auto-populate height once, from most recent valid observation ──────────
  useEffect(() => {
    if (autoPopulated.current) return;
    const obs = getLatestByLoinc(vitals, HEIGHT_LOINCS);
    if (!obs) return;
    const cm = parseHeightToCm(obs);
    if (cm != null) {
      setHeightStr(String(Math.round(cm)));
    }
    autoPopulated.current = true;
  }, [vitals]);

  // ── Calculation ────────────────────────────────────────────────────────────
  const heightCm = heightStr ? parseFloat(heightStr) : undefined;
  const isLoading = !patient;

  const canCalculate =
    age != null && age > 0 &&
    weightKg != null && weightKg > 0 &&
    creatinineUmol != null && creatinineUmol > 0;

  const result = useMemo<CgResults | null>(() => {
    if (!canCalculate || age == null || weightKg == null || creatinineUmol == null) return null;
    return calcCg({ sex, age, weightKg, creatinineUmol, heightCm });
  }, [sex, age, weightKg, creatinineUmol, heightCm, canCalculate]);

  return (
    <div className="panel-content p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-sm font-semibold text-[#F1F3F7]">Kidney Profile</h2>
        <p className="text-xs text-[#6B7280] mt-0.5">
          Creatinine clearance (Cockcroft-Gault) · For patients with stable renal function
        </p>
      </div>

      {/* Inputs + Results grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Left: parameters ── */}
        <div className="space-y-4">
          {/* Chart values (read-only) */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#6B7280] mb-1">
              From chart
            </p>
            <div className="bg-[#171B26] border border-[#2A3044] rounded-lg px-4">
              <ChartParam
                label="Sex"
                value={patient ? (patient.gender === "female" ? "Female" : "Male") : undefined}
                loading={isLoading}
              />
              <ChartParam label="Age" value={age} unit="years" loading={isLoading} />
              <ChartParam label="Weight" value={weightKg != null ? weightKg : undefined} unit="kg" loading={isLoading} />
              <ChartParam
                label="Creatinine"
                value={creatinineUmol != null ? Math.round(creatinineUmol) : undefined}
                unit="µmol/L"
                loading={isLoading}
              />
            </div>
          </div>

          {/* Height (editable) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label
                htmlFor="height-input"
                className="text-xs font-medium text-[#9CA3AF] uppercase tracking-wider"
              >
                Height{" "}
                <span className="normal-case font-normal text-[#6B7280]">(optional)</span>
              </label>
              <span className="text-xs text-[#6B7280]">cm · Norm: 152–213</span>
            </div>
            <input
              id="height-input"
              type="number"
              min={100}
              max={250}
              step={0.5}
              value={heightStr}
              onChange={(e) => setHeightStr(e.target.value)}
              placeholder="Enter or adjust height"
              className={INPUT_CLS}
            />
            <p className="text-xs text-[#6B7280] mt-1">
              Enter estimated or measured height. Enables BMI-based weight adjustment.
            </p>
          </div>
        </div>

        {/* ── Right: results ── */}
        <div className="space-y-3">
          {isLoading ? (
            <div className="space-y-3">
              <div className="h-24 rounded-lg skeleton" />
              <div className="h-16 rounded-lg skeleton" />
            </div>
          ) : !canCalculate ? (
            <div className="flex items-center justify-center h-40 rounded-lg border border-dashed border-[#2A3044]">
              <p className="text-sm text-[#6B7280] text-center px-4">
                {!patient
                  ? "Loading patient data…"
                  : "Weight and creatinine are required to calculate"}
              </p>
            </div>
          ) : result === null ? (
            <div className="p-4 bg-[#171B26] border border-[#2A3044] rounded-lg text-xs text-[#E8403A]">
              Unable to calculate — check that age &lt; 140 and all values are positive.
            </div>
          ) : (
            <>
              {/* No height → original CG only */}
              {result.weightCategory == null && (
                <>
                  <ResultCard
                    value={result.originalCrCl}
                    label="Creatinine clearance, original Cockcroft-Gault"
                    primary
                  />
                  <p className="text-xs text-[#6B7280] italic px-1">
                    Enter height to calculate BMI and provide weight-adjusted estimates.
                  </p>
                </>
              )}

              {/* Underweight */}
              {result.weightCategory === "underweight" && (
                <ResultCard
                  value={result.originalCrCl}
                  label={`Creatinine clearance for underweight patient (BMI ${result.bmi!.toFixed(1)} kg/m²), calculated using actual body weight (no adjustment).`}
                  primary
                />
              )}

              {/* Normal weight */}
              {result.weightCategory === "normal" && (
                <>
                  <ResultCard
                    value={result.originalCrCl}
                    label="Creatinine clearance, original Cockcroft-Gault"
                    primary
                  />
                  <ResultCard
                    value={result.ibwCrCl!}
                    label={`Creatinine clearance for normal weight patient (BMI ${result.bmi!.toFixed(1)} kg/m²), using ideal body weight of ${Math.round(result.ibwKg!)} kg (${Math.round(result.ibwKg! * 2.205)} lbs).`}
                  />
                  <RangeCard
                    low={result.rangeLow!}
                    high={result.rangeHigh!}
                    note="Note: This range uses IBW and actual body weight. Controversy exists over which form of weight to use."
                  />
                </>
              )}

              {/* Overweight / obese */}
              {result.weightCategory === "overweight" && (
                <>
                  <ResultCard
                    value={result.abwCrCl!}
                    label={`Creatinine clearance for overweight/obese patient (BMI ${result.bmi!.toFixed(1)} kg/m²), using adjusted body weight of ${Math.round(result.abwKg!)} kg.`}
                    primary
                  />
                  <RangeCard
                    low={result.rangeLow!}
                    high={result.rangeHigh!}
                    note="Note: This range uses IBW and ABW. Controversy exists over which form of weight to use."
                  />
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Collapsible reference sections */}
      <div className="space-y-2">
        <InfoSection title="Advice">
          <p>
            The relationship between creatinine and kidney function is curvilinear — a greater
            decline in kidney function occurs as serum creatinine rises from 1 to 2 mg/dL compared
            to 4 to 5 mg/dL.
          </p>
          <p>
            Patients with decreased eGFR have kidney disease and are at higher risk of acute kidney
            injury and progressive kidney disease. Management of modifiable risk factors such as
            blood sugar and blood pressure control is critical to slowing progression.
          </p>
          <p>
            Medications should be dose-adjusted for the most recent estimate of kidney function.
            Common cutoffs: &lt;60, &lt;45, and &lt;30 mL/min/1.73m², plus adjustments for dialysis
            patients.
          </p>
        </InfoSection>

        <InfoSection title="Management">
          <p>
            Classify patients into CKD stage by eGFR (MDRD or CKD-EPI) as well as urinary protein
            excretion. Patients with decreased eGFR, increased urinary albumin, or both are at high
            risk of progressive CKD and should be referred to nephrology.
          </p>
        </InfoSection>

        <InfoSection title="Formula">
          <p className="font-mono-data text-[#F1F3F7]">
            CrCl = (140 – age) × weight (kg) × (0.85 if female) / (72 × Cr, mg/dL)
          </p>
          <p className="text-[#6B7280] mt-1">Creatinine conversion: µmol/L ÷ 88.4 = mg/dL</p>
          <p className="font-semibold text-[#F1F3F7] mt-2">IBW (Devine equation)</p>
          <p className="font-mono-data">IBW male = 50 + 2.3 × (height, inches – 60)</p>
          <p className="font-mono-data">IBW female = 45.5 + 2.3 × (height, inches – 60)</p>
          <p className="font-mono-data mt-1">ABW = IBW + 0.4 × (actual weight – IBW)</p>
          <p className="font-semibold text-[#F1F3F7] mt-2">Weight adjustment by BMI</p>
          <table className="w-full text-[#9CA3AF] mt-1">
            <thead>
              <tr className="text-[#6B7280] text-left">
                <th className="py-1 font-medium">Category</th>
                <th className="py-1 font-medium">BMI</th>
                <th className="py-1 font-medium">Weight used</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="py-0.5">Underweight</td>
                <td className="py-0.5">&lt;18.5</td>
                <td className="py-0.5">Actual body weight</td>
              </tr>
              <tr>
                <td className="py-0.5">Normal</td>
                <td className="py-0.5">18.5–24.9</td>
                <td className="py-0.5">IBW (range: IBW → actual)</td>
              </tr>
              <tr>
                <td className="py-0.5">Overweight / obese</td>
                <td className="py-0.5">≥25</td>
                <td className="py-0.5">ABW (range: IBW → ABW)</td>
              </tr>
            </tbody>
          </table>
        </InfoSection>
      </div>
    </div>
  );
}
