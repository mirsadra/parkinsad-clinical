import { useState, useEffect, useRef, useMemo } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { PortfolioData } from "../../hooks/usePortfolio";
import type { Observation } from "../../types/fhir";

interface CalculatorsPanelProps {
  patient: PortfolioData["patient"];
  vitals: PortfolioData["vitals"];
  labs: PortfolioData["labs"];
}

// ─── Pure calculation types & logic ───────────────────────────────────────────

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
      originalCrCl,
      bmi,
      ibwKg,
      weightCategory: "normal",
      ibwCrCl,
      rangeLow: Math.min(originalCrCl, ibwCrCl),
      rangeHigh: Math.max(originalCrCl, ibwCrCl),
    };
  }

  // Overweight / obese
  const abwKg = ibwKg + 0.4 * (weightKg - ibwKg);
  const abwCrCl = cgWith(abwKg);
  const ibwCrCl = cgWith(ibwKg);
  return {
    originalCrCl,
    bmi,
    ibwKg,
    abwKg,
    weightCategory: "overweight",
    ibwCrCl,
    abwCrCl,
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

function getLatestByLoinc(
  observations: Observation[],
  codes: string[]
): Observation | undefined {
  return observations
    .filter((o) => o.code?.coding?.some((c) => codes.includes(c.code ?? "")))
    .sort((a, b) =>
      (b.effectiveDateTime ?? "").localeCompare(a.effectiveDateTime ?? "")
    )[0];
}

function creatinineToUmol(obs: Observation): number | undefined {
  const val = obs.valueQuantity?.value;
  if (val == null) return undefined;
  const unit = (obs.valueQuantity?.unit ?? "").toLowerCase();
  return unit.includes("mg") || unit === "mg/dl" ? val * 88.4 : val;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

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
        primary
          ? "bg-[#171B26] border-[#2A3044]"
          : "bg-[#0F1117] border-[#2A3044]",
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

function InfoSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
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

export function CalculatorsPanel({ patient, vitals, labs }: CalculatorsPanelProps) {
  const [sex, setSex] = useState<"female" | "male">("female");
  const [ageStr, setAgeStr] = useState("");
  const [weightStr, setWeightStr] = useState("");
  const [creatinineStr, setCreatinineStr] = useState("");
  const [heightStr, setHeightStr] = useState("");
  const autoPopulated = useRef(false);

  // Pre-populate from FHIR data once available
  useEffect(() => {
    if (autoPopulated.current || !patient) return;

    if (patient.gender === "female" || patient.gender === "male") {
      setSex(patient.gender);
    }
    if (patient.birthDate) {
      const age = getAge(patient.birthDate);
      if (age > 0) setAgeStr(String(age));
    }

    const weightObs = getLatestByLoinc(vitals, ["29463-7"]);
    if (weightObs?.valueQuantity?.value != null) {
      setWeightStr(String(Math.round(weightObs.valueQuantity.value)));
    }

    const heightObs = getLatestByLoinc(vitals, ["8302-2"]);
    if (heightObs?.valueQuantity?.value != null) {
      setHeightStr(String(Math.round(heightObs.valueQuantity.value)));
    }

    const creatObs = getLatestByLoinc(labs, ["2160-0", "14682-9", "38483-4"]);
    if (creatObs) {
      const umol = creatinineToUmol(creatObs);
      if (umol != null) setCreatinineStr(String(Math.round(umol)));
    }

    autoPopulated.current = true;
  }, [patient, vitals, labs]);

  // Parse inputs
  const age = parseFloat(ageStr);
  const weightKg = parseFloat(weightStr);
  const creatinineUmol = parseFloat(creatinineStr);
  const heightCm = heightStr ? parseFloat(heightStr) : undefined;

  const canCalculate =
    isFinite(age) && age > 0 &&
    isFinite(weightKg) && weightKg > 0 &&
    isFinite(creatinineUmol) && creatinineUmol > 0;

  const result = useMemo<CgResults | null>(() => {
    if (!canCalculate) return null;
    return calcCg({ sex, age, weightKg, creatinineUmol, heightCm });
  }, [sex, age, weightKg, creatinineUmol, heightCm, canCalculate]);

  return (
    <div className="panel-content p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-sm font-semibold text-[#F1F3F7]">
          Creatinine Clearance (Cockcroft-Gault)
        </h2>
        <p className="text-xs text-[#6B7280] mt-0.5">
          For patients with stable renal function. Provide height for weight-adjusted estimates.
        </p>
      </div>

      {/* Inputs + Results */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Inputs ── */}
        <div className="space-y-4">
          {/* Sex */}
          <div>
            <span className="block text-xs font-medium text-[#9CA3AF] uppercase tracking-wider mb-2">
              Sex
            </span>
            <div className="inline-flex rounded-md overflow-hidden border border-[#2A3044]">
              {(["female", "male"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSex(s)}
                  className={[
                    "px-5 py-2 text-sm font-medium transition-colors duration-150",
                    sex === s
                      ? "bg-[#3B82F6] text-white"
                      : "bg-[#171B26] text-[#9CA3AF] hover:text-[#F1F3F7] hover:bg-[#1A1F2E]",
                  ].join(" ")}
                >
                  {s === "female" ? "Female" : "Male"}
                </button>
              ))}
            </div>
          </div>

          {/* Age */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-[#9CA3AF] uppercase tracking-wider">
                Age
              </label>
              <span className="text-xs text-[#6B7280]">years</span>
            </div>
            <input
              type="number"
              min={1}
              max={130}
              value={ageStr}
              onChange={(e) => setAgeStr(e.target.value)}
              placeholder="e.g. 65"
              className={INPUT_CLS}
            />
          </div>

          {/* Weight */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-[#9CA3AF] uppercase tracking-wider">
                Weight
              </label>
              <span className="text-xs text-[#6B7280]">kg · Norm: 1–150</span>
            </div>
            <input
              type="number"
              min={1}
              max={300}
              step={0.1}
              value={weightStr}
              onChange={(e) => setWeightStr(e.target.value)}
              placeholder="e.g. 70"
              className={INPUT_CLS}
            />
          </div>

          {/* Creatinine */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-[#9CA3AF] uppercase tracking-wider">
                Creatinine
              </label>
              <span className="text-xs text-[#6B7280]">µmol/L · Norm: 62–115</span>
            </div>
            <input
              type="number"
              min={1}
              step={1}
              value={creatinineStr}
              onChange={(e) => setCreatinineStr(e.target.value)}
              placeholder="e.g. 90"
              className={INPUT_CLS}
            />
          </div>

          {/* Height (optional) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-[#9CA3AF] uppercase tracking-wider">
                Height{" "}
                <span className="normal-case font-normal text-[#6B7280]">(optional)</span>
              </label>
              <span className="text-xs text-[#6B7280]">cm · Norm: 152–213</span>
            </div>
            <input
              type="number"
              min={100}
              max={250}
              step={0.5}
              value={heightStr}
              onChange={(e) => setHeightStr(e.target.value)}
              placeholder="e.g. 170"
              className={INPUT_CLS}
            />
            <p className="text-xs text-[#6B7280] mt-1">
              Enables BMI-based weight adjustment
            </p>
          </div>
        </div>

        {/* ── Results ── */}
        <div className="space-y-3">
          {!canCalculate ? (
            <div className="flex items-center justify-center h-40 rounded-lg border border-dashed border-[#2A3044]">
              <p className="text-sm text-[#6B7280]">
                Fill in sex, age, weight, and creatinine to calculate
              </p>
            </div>
          ) : result === null ? (
            <div className="p-4 bg-[#171B26] border border-[#2A3044] rounded-lg text-xs text-[#E8403A]">
              Invalid inputs — check that age &lt; 140 and all values are positive.
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
                    Add height to calculate BMI and provide weight-adjusted estimates.
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
                    label={`Creatinine clearance for overweight/obese patient (BMI ${result.bmi!.toFixed(1)} kg/m²), using adjusted body weight of ${Math.round(result.abwKg!)} kg (ABW).`}
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

      {/* ── Collapsible info sections ── */}
      <div className="space-y-2">
        <InfoSection title="Advice">
          <p>
            The relationship between creatinine and kidney function is curvilinear — a greater decline
            in kidney function occurs as serum creatinine rises from 1 to 2 mg/dL compared to
            4 to 5 mg/dL.
          </p>
          <p>
            Patients with decreased eGFR have kidney disease and are at higher risk of acute kidney
            injury and progressive kidney disease. Management of modifiable risk factors such as blood
            sugar and blood pressure control is critical to slowing progression.
          </p>
          <p>
            Medications should be dose-adjusted for the most recent available estimate of kidney
            function. Common cutoffs: &lt;60, &lt;45, and &lt;30 mL/min/1.73m², plus adjustments for
            dialysis patients.
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
          <p className="font-mono-data">
            IBW male = 50 + 2.3 × (height, inches – 60)
          </p>
          <p className="font-mono-data">
            IBW female = 45.5 + 2.3 × (height, inches – 60)
          </p>
          <p className="font-mono-data mt-1">
            ABW = IBW + 0.4 × (actual weight – IBW)
          </p>
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
