import type { Patient, Condition, MedicationRequest } from "../types/fhir";

export function formatNhsNumber(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length !== 10) return raw;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export function findNhsNumber(patient: Patient): string | undefined {
  return patient.identifier?.find(
    (id) =>
      id.system?.includes("nhs-number") ||
      id.system?.includes("patient-identifier")
  )?.value;
}

export function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return "Unknown";
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(dateStr: string | undefined): string {
  if (!dateStr) return "Unknown";
  return new Date(dateStr).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatAge(birthDate: string | undefined): string {
  if (!birthDate) return "Unknown";
  const dob = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return String(age);
}

export function formatPatientName(patient: Patient): string {
  const name = patient.name?.[0];
  if (!name) return "Unknown Patient";
  const given = name.given?.join(" ") ?? "";
  const family = name.family ?? "";
  return `${given} ${family}`.trim();
}

export function getConditionDisplay(condition: Condition): string {
  const snomedCoding = condition.code?.coding?.find(
    (c) => c.system === "http://snomed.info/sct"
  );
  return snomedCoding?.display ?? condition.code?.text ?? "Unknown condition";
}

export function getMedicationDisplay(med: MedicationRequest): string {
  const concept = med.medicationCodeableConcept;
  if (!concept) return "Unknown medication";
  const snomedCoding = concept.coding?.find(
    (c) => c.system === "http://snomed.info/sct"
  );
  return snomedCoding?.display ?? concept.text ?? "Unknown medication";
}

export function formatDuration(startStr: string, endStr?: string): string {
  const start = new Date(startStr);
  const end = endStr ? new Date(endStr) : new Date();
  const diffMs = end.getTime() - start.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days === 0) return "< 1 day";
  if (days === 1) return "1 day";
  return `${days} days`;
}
