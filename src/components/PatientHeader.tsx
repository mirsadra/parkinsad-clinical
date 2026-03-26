import { AlertTriangle } from "lucide-react";
import type { Patient, AllergyIntolerance } from "../types/fhir";
import {
  formatNhsNumber,
  findNhsNumber,
  formatDate,
  formatAge,
  formatPatientName,
} from "../lib/formatters";
import { Skeleton } from "./shared/LoadingSkeleton";

interface PatientHeaderProps {
  patient: Patient | undefined;
  allergies: AllergyIntolerance[];
  loading: boolean;
}

export function PatientHeader({
  patient,
  allergies,
  loading,
}: PatientHeaderProps) {
  const hasSevereAllergy = allergies.some((a) => a.criticality === "high");

  if (loading || !patient) {
    return (
      <header className="sticky top-0 z-20 bg-[#171B26] border-b border-[#2A3044] px-6 py-4">
        <div className="flex items-center gap-4">
          <div className="border-l-4 border-[#3B82F6] pl-4 space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-72" />
          </div>
        </div>
      </header>
    );
  }

  const nhsNumber = findNhsNumber(patient);

  return (
    <header className="sticky top-0 z-20 bg-[#171B26] border-b border-[#2A3044] px-6 py-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <div className="border-l-4 border-[#3B82F6] pl-4 min-w-0">
            <h1 className="text-xl font-semibold text-[#F1F3F7] leading-tight">
              {formatPatientName(patient)}
            </h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-[#9CA3AF]">
              <span>DOB: {formatDate(patient.birthDate)}</span>
              <span className="text-[#2A3044] select-none">·</span>
              <span>Age: {formatAge(patient.birthDate)}</span>
              {patient.gender && (
                <>
                  <span className="text-[#2A3044] select-none">·</span>
                  <span className="capitalize">{patient.gender}</span>
                </>
              )}
              {nhsNumber && (
                <>
                  <span className="text-[#2A3044] select-none">·</span>
                  <span>
                    NHS:{" "}
                    <span className="font-mono-data text-[#F1F3F7]">
                      {formatNhsNumber(nhsNumber)}
                    </span>
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
        {hasSevereAllergy && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-red-900/20 border border-[#E8403A] rounded-md allergy-critical flex-shrink-0">
            <AlertTriangle className="w-4 h-4 text-[#E8403A]" aria-hidden="true" />
            <span
              className="text-[#E8403A] text-sm font-semibold tracking-wide"
              role="alert"
            >
              SEVERE ALLERGY
            </span>
          </div>
        )}
      </div>
    </header>
  );
}
