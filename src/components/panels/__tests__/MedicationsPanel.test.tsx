import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MedicationsPanel } from "../MedicationsPanel";
import medicationsFixture from "../../../fixtures/medications.json";
import type { MedicationRequest } from "../../../types/fhir";

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
);

describe("MedicationsPanel", () => {
  it("renders medication names", () => {
    render(
      <MedicationsPanel
        requests={medicationsFixture as MedicationRequest[]}
        administrations={[]}
        dispenses={[]}
        isLoading={false}
      />,
      { wrapper }
    );
    expect(
      screen.getByText("Aspirin 75mg dispersible tablet")
    ).toBeInTheDocument();
    expect(screen.getByText("Bisoprolol 5mg tablet")).toBeInTheDocument();
  });

  it("filters medications by search input", () => {
    render(
      <MedicationsPanel
        requests={medicationsFixture as MedicationRequest[]}
        administrations={[]}
        dispenses={[]}
        isLoading={false}
      />,
      { wrapper }
    );
    const search = screen.getByPlaceholderText(/Search medications/i);
    fireEvent.change(search, { target: { value: "Aspirin" } });
    expect(
      screen.getByText("Aspirin 75mg dispersible tablet")
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Bisoprolol 5mg tablet")
    ).not.toBeInTheDocument();
  });

  it("shows no medications message when search has no results", () => {
    render(
      <MedicationsPanel
        requests={medicationsFixture as MedicationRequest[]}
        administrations={[]}
        dispenses={[]}
        isLoading={false}
      />,
      { wrapper }
    );
    const search = screen.getByPlaceholderText(/Search medications/i);
    fireEvent.change(search, { target: { value: "Vancomycin" } });
    expect(screen.getByText("No medications found")).toBeInTheDocument();
  });
});
