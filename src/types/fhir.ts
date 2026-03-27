export type {
  Patient,
  AllergyIntolerance,
  MedicationRequest,
  MedicationAdministration,
  MedicationDispense,
  Condition,
  Observation,
  Encounter,
  Immunization,
  Procedure,
  DiagnosticReport,
  DocumentReference,
  ServiceRequest,
  Bundle,
  BundleEntry,
  Coding,
  CodeableConcept,
  Identifier,
  Quantity,
  Reference,
} from "fhir/r4";

export type TabId =
  | "overview"
  | "medications"
  | "allergies"
  | "vitals"
  | "labs"
  | "encounters"
  | "conditions"
  | "procedures"
  | "immunisations"
  | "calculators";
