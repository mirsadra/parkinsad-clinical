import { useState, lazy, Suspense } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { usePortfolio } from "./hooks/usePortfolio";
import { useIdleTimeout } from "./hooks/useIdleTimeout";
import { PatientHeader } from "./components/PatientHeader";
import { TabNav } from "./components/TabNav";
import { TableSkeleton } from "./components/shared/LoadingSkeleton";
import { ErrorState } from "./components/shared/ErrorState";
import type { TabId } from "./types/fhir";

const OverviewPanel = lazy(() =>
  import("./components/panels/OverviewPanel").then((m) => ({ default: m.OverviewPanel }))
);
const MedicationsPanel = lazy(() =>
  import("./components/panels/MedicationsPanel").then((m) => ({ default: m.MedicationsPanel }))
);
const AllergiesPanel = lazy(() =>
  import("./components/panels/AllergiesPanel").then((m) => ({ default: m.AllergiesPanel }))
);
const VitalsPanel = lazy(() =>
  import("./components/panels/VitalsPanel").then((m) => ({ default: m.VitalsPanel }))
);
const LabsPanel = lazy(() =>
  import("./components/panels/LabsPanel").then((m) => ({ default: m.LabsPanel }))
);
const EncountersPanel = lazy(() =>
  import("./components/panels/EncountersPanel").then((m) => ({ default: m.EncountersPanel }))
);
const ConditionsPanel = lazy(() =>
  import("./components/panels/ConditionsPanel").then((m) => ({ default: m.ConditionsPanel }))
);
const ProceduresPanel = lazy(() =>
  import("./components/panels/ProceduresPanel").then((m) => ({ default: m.ProceduresPanel }))
);
const ImmunisationsPanel = lazy(() =>
  import("./components/panels/ImmunisationsPanel").then((m) => ({
    default: m.ImmunisationsPanel,
  }))
);

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const portfolio = usePortfolio();
  const queryClient = useQueryClient();

  useIdleTimeout(() => {
    queryClient.clear();
  });

  const counts: Partial<Record<TabId, number>> = {
    medications: portfolio.medicationRequests.length,
    allergies: portfolio.allergies.length,
    conditions: portfolio.conditions.length,
    encounters: portfolio.encounters.length,
    procedures: portfolio.procedures.length,
    immunisations: portfolio.immunizations.length,
    labs: portfolio.labs.length,
    vitals: portfolio.vitals.length,
  };

  function renderPanel() {
    if (portfolio.isError) return <ErrorState />;
    switch (activeTab) {
      case "overview":
        return <OverviewPanel data={portfolio} />;
      case "medications":
        return (
          <MedicationsPanel
            requests={portfolio.medicationRequests}
            administrations={portfolio.medicationAdmins}
            dispenses={portfolio.medicationDispenses}
            isLoading={portfolio.isLoading}
          />
        );
      case "allergies":
        return (
          <AllergiesPanel
            allergies={portfolio.allergies}
            isLoading={portfolio.isLoading}
          />
        );
      case "vitals":
        return (
          <VitalsPanel
            vitals={portfolio.vitals}
            isLoading={portfolio.isLoading}
          />
        );
      case "labs":
        return (
          <LabsPanel labs={portfolio.labs} isLoading={portfolio.isLoading} />
        );
      case "encounters":
        return (
          <EncountersPanel
            encounters={portfolio.encounters}
            isLoading={portfolio.isLoading}
          />
        );
      case "conditions":
        return (
          <ConditionsPanel
            conditions={portfolio.conditions}
            isLoading={portfolio.isLoading}
          />
        );
      case "procedures":
        return (
          <ProceduresPanel
            procedures={portfolio.procedures}
            isLoading={portfolio.isLoading}
          />
        );
      case "immunisations":
        return (
          <ImmunisationsPanel
            immunizations={portfolio.immunizations}
            isLoading={portfolio.isLoading}
          />
        );
    }
  }

  return (
    <div className="flex flex-col h-screen bg-[#0F1117] overflow-hidden">
      <PatientHeader
        patient={portfolio.patient}
        allergies={portfolio.allergies}
        loading={portfolio.isLoading && !portfolio.patient}
      />
      <div className="flex flex-1 overflow-hidden">
        <TabNav
          activeTab={activeTab}
          onTabChange={setActiveTab}
          counts={counts}
        />
        <main className="flex-1 overflow-hidden">
          <Suspense
            fallback={
              <div className="panel-content">
                <TableSkeleton rows={6} />
              </div>
            }
          >
            {renderPanel()}
          </Suspense>
        </main>
      </div>
    </div>
  );
}
