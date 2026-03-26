import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AllergiesPanel } from "../AllergiesPanel";
import allergiesFixture from "../../../fixtures/allergies.json";
import type { AllergyIntolerance } from "../../../types/fhir";

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
);

describe("AllergiesPanel", () => {
  it("renders allergy entries", () => {
    render(
      <AllergiesPanel
        allergies={allergiesFixture as AllergyIntolerance[]}
        isLoading={false}
      />,
      { wrapper }
    );
    expect(screen.getByText("Penicillin")).toBeInTheDocument();
    expect(screen.getByText("Ibuprofen")).toBeInTheDocument();
  });

  it("shows NKA banner when allergies array is empty", () => {
    render(<AllergiesPanel allergies={[]} isLoading={false} />, { wrapper });
    expect(
      screen.getByText(/No known allergies or intolerances/i)
    ).toBeInTheDocument();
  });

  it("shows loading skeletons when isLoading is true", () => {
    const { container } = render(
      <AllergiesPanel allergies={[]} isLoading={true} />,
      { wrapper }
    );
    expect(container.querySelectorAll(".skeleton").length).toBeGreaterThan(0);
  });
});
