import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PatientHeader } from "../PatientHeader";
import patientFixture from "../../fixtures/patient.json";
import allergiesFixture from "../../fixtures/allergies.json";
import type { Patient, AllergyIntolerance } from "../../types/fhir";

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
);

describe("PatientHeader", () => {
  it("renders patient name", () => {
    render(
      <PatientHeader
        patient={patientFixture as Patient}
        allergies={[]}
        loading={false}
      />,
      { wrapper }
    );
    expect(screen.getByText(/Smith/)).toBeInTheDocument();
    expect(screen.getByText(/James/)).toBeInTheDocument();
  });

  it("formats NHS number with dashes", () => {
    render(
      <PatientHeader
        patient={patientFixture as Patient}
        allergies={[]}
        loading={false}
      />,
      { wrapper }
    );
    expect(screen.getByText("944-930-4106")).toBeInTheDocument();
  });

  it("shows SEVERE ALLERGY badge for high criticality allergy", () => {
    render(
      <PatientHeader
        patient={patientFixture as Patient}
        allergies={allergiesFixture as AllergyIntolerance[]}
        loading={false}
      />,
      { wrapper }
    );
    expect(screen.getByText("SEVERE ALLERGY")).toBeInTheDocument();
  });

  it("does not show SEVERE ALLERGY badge when no high-criticality allergies", () => {
    const lowOnly = allergiesFixture.filter((a) => a.criticality !== "high");
    render(
      <PatientHeader
        patient={patientFixture as Patient}
        allergies={lowOnly as AllergyIntolerance[]}
        loading={false}
      />,
      { wrapper }
    );
    expect(screen.queryByText("SEVERE ALLERGY")).not.toBeInTheDocument();
  });

  it("shows skeleton when loading", () => {
    const { container } = render(
      <PatientHeader patient={undefined} allergies={[]} loading={true} />,
      { wrapper }
    );
    expect(container.querySelectorAll(".skeleton").length).toBeGreaterThan(0);
  });
});
