import { describe, it, expect } from "vitest";
import {
  formatNhsNumber,
  findNhsNumber,
  formatAge,
  getConditionDisplay,
  getMedicationDisplay,
} from "../formatters";
import type { Patient, Condition, MedicationRequest } from "../../types/fhir";

describe("formatNhsNumber", () => {
  it("formats 10 digits as XXX-XXX-XXXX", () => {
    expect(formatNhsNumber("1234567890")).toBe("123-456-7890");
  });
  it("returns raw value if not 10 digits", () => {
    expect(formatNhsNumber("123")).toBe("123");
  });
  it("strips non-digits before formatting", () => {
    expect(formatNhsNumber("123 456 7890")).toBe("123-456-7890");
  });
});

describe("findNhsNumber", () => {
  it("finds identifier with nhs-number in system", () => {
    const patient = {
      resourceType: "Patient",
      identifier: [
        { system: "https://fhir.nhs.uk/Id/nhs-number", value: "1234567890" },
      ],
    } as Patient;
    expect(findNhsNumber(patient)).toBe("1234567890");
  });
  it("returns undefined when no NHS number present", () => {
    const patient = { resourceType: "Patient", identifier: [] } as Patient;
    expect(findNhsNumber(patient)).toBeUndefined();
  });
});

describe("formatAge", () => {
  it("calculates age in years from birthDate", () => {
    const age = formatAge("1980-01-01");
    expect(age).toMatch(/^\d+$/);
    expect(parseInt(age)).toBeGreaterThan(40);
  });
  it("returns Unknown for undefined", () => {
    expect(formatAge(undefined)).toBe("Unknown");
  });
});

describe("getConditionDisplay", () => {
  it("prefers SNOMED display text", () => {
    const condition = {
      code: {
        coding: [{ system: "http://snomed.info/sct", display: "Heart failure" }],
      },
    } as Condition;
    expect(getConditionDisplay(condition)).toBe("Heart failure");
  });
  it("falls back to code.text", () => {
    const condition = {
      code: { coding: [], text: "Heart failure" },
    } as unknown as Condition;
    expect(getConditionDisplay(condition)).toBe("Heart failure");
  });
  it("falls back to Unknown condition", () => {
    expect(getConditionDisplay({} as Condition)).toBe("Unknown condition");
  });
});

describe("getMedicationDisplay", () => {
  it("returns SNOMED display name", () => {
    const med = {
      resourceType: "MedicationRequest",
      medicationCodeableConcept: {
        coding: [{ system: "http://snomed.info/sct", display: "Aspirin 75mg" }],
      },
    } as unknown as MedicationRequest;
    expect(getMedicationDisplay(med)).toBe("Aspirin 75mg");
  });
  it("falls back to text", () => {
    const med = {
      resourceType: "MedicationRequest",
      medicationCodeableConcept: { coding: [], text: "Aspirin 75mg" },
    } as unknown as MedicationRequest;
    expect(getMedicationDisplay(med)).toBe("Aspirin 75mg");
  });
  it("returns Unknown medication when no concept", () => {
    expect(getMedicationDisplay({ resourceType: "MedicationRequest" } as unknown as MedicationRequest)).toBe(
      "Unknown medication"
    );
  });
});
