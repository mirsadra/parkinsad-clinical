import { useQueries } from "@tanstack/react-query";
import { useFhir } from "../context/FhirContext";
import { unwrapBundle } from "../lib/pagination";
import type {
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
  Bundle,
} from "../types/fhir";

// Don't retry on 4xx — Cerner returns 403 for scope/auth problems and
// hammering the endpoint won't help.
function noRetryOn4xx(failureCount: number, error: unknown): boolean {
  if (error && typeof error === "object" && "status" in error) {
    const status = (error as { status: number }).status;
    if (status >= 400 && status < 500) return false;
  }
  return failureCount < 2;
}

export function usePortfolio() {
  const { client, patientId } = useFhir();

  const results = useQueries({
    queries: [
      {
        queryKey: ["patient", patientId],
        queryFn: async () => {
          try {
            return await client.request<Patient>(`Patient/${patientId}`);
          } catch (err: unknown) {
            // Log full error so we can diagnose 403 in production (console.warn is not suppressed)
            console.warn("[FHIR] Patient request failed", {
              patientId,
              error: err,
              status: err && typeof err === "object" && "status" in err
                ? (err as { status: number }).status
                : "unknown",
              message: err instanceof Error ? err.message : String(err),
            });
            throw err;
          }
        },
        staleTime: 5 * 60 * 1000,
        retry: noRetryOn4xx,
      },
      {
        queryKey: ["allergyIntolerance", patientId],
        queryFn: async () =>
          unwrapBundle<AllergyIntolerance>(
            await client.request<Bundle>(
              `AllergyIntolerance?patient=${patientId}&_count=100`
            )
          ),
        retry: noRetryOn4xx,
      },
      {
        queryKey: ["medicationRequest", patientId],
        queryFn: async () =>
          unwrapBundle<MedicationRequest>(
            await client.request<Bundle>(
              `MedicationRequest?patient=${patientId}&status=active&_count=100`
            )
          ),
        retry: noRetryOn4xx,
      },
      {
        queryKey: ["medicationAdministration", patientId],
        queryFn: async () =>
          unwrapBundle<MedicationAdministration>(
            await client.request<Bundle>(
              `MedicationAdministration?patient=${patientId}&_count=100`
            )
          ),
        retry: noRetryOn4xx,
      },
      {
        queryKey: ["medicationDispense", patientId],
        queryFn: async () =>
          unwrapBundle<MedicationDispense>(
            await client.request<Bundle>(
              `MedicationDispense?patient=${patientId}&_count=100`
            )
          ),
        retry: noRetryOn4xx,
      },
      {
        queryKey: ["condition", patientId],
        queryFn: async () =>
          unwrapBundle<Condition>(
            await client.request<Bundle>(
              `Condition?patient=${patientId}&_count=100`
            )
          ),
        retry: noRetryOn4xx,
      },
      {
        queryKey: ["observation-vitals", patientId],
        queryFn: async () =>
          unwrapBundle<Observation>(
            await client.request<Bundle>(
              `Observation?patient=${patientId}&category=vital-signs&_sort=-date&_count=200`
            )
          ),
        staleTime: 60 * 1000,
        retry: noRetryOn4xx,
      },
      {
        queryKey: ["observation-labs", patientId],
        queryFn: async () =>
          unwrapBundle<Observation>(
            await client.request<Bundle>(
              `Observation?patient=${patientId}&category=laboratory&_sort=-date&_count=200`
            )
          ),
        staleTime: 2 * 60 * 1000,
        retry: noRetryOn4xx,
      },
      {
        queryKey: ["encounter", patientId],
        queryFn: async () =>
          unwrapBundle<Encounter>(
            await client.request<Bundle>(
              `Encounter?patient=${patientId}&_sort=-date&_count=20`
            )
          ),
        retry: noRetryOn4xx,
      },
      {
        queryKey: ["immunization", patientId],
        queryFn: async () =>
          unwrapBundle<Immunization>(
            await client.request<Bundle>(
              `Immunization?patient=${patientId}&_count=100`
            )
          ),
        retry: noRetryOn4xx,
      },
      {
        queryKey: ["procedure", patientId],
        queryFn: async () =>
          unwrapBundle<Procedure>(
            await client.request<Bundle>(
              `Procedure?patient=${patientId}&_sort=-date&_count=50`
            )
          ),
        retry: noRetryOn4xx,
      },
    ],
  });

  const [
    patientQ,
    allergiesQ,
    medRequestsQ,
    medAdminsQ,
    medDispensesQ,
    conditionsQ,
    vitalsQ,
    labsQ,
    encountersQ,
    immunizationsQ,
    proceduresQ,
  ] = results;

  const loadingCount = results.filter((r) => r.isLoading).length;

  return {
    patient: patientQ.data as Patient | undefined,
    allergies: (allergiesQ.data ?? []) as AllergyIntolerance[],
    medicationRequests: (medRequestsQ.data ?? []) as MedicationRequest[],
    medicationAdmins: (medAdminsQ.data ?? []) as MedicationAdministration[],
    medicationDispenses: (medDispensesQ.data ?? []) as MedicationDispense[],
    conditions: (conditionsQ.data ?? []) as Condition[],
    vitals: (vitalsQ.data ?? []) as Observation[],
    labs: (labsQ.data ?? []) as Observation[],
    encounters: (encountersQ.data ?? []) as Encounter[],
    immunizations: (immunizationsQ.data ?? []) as Immunization[],
    procedures: (proceduresQ.data ?? []) as Procedure[],
    isLoading: loadingCount > 0,
    isError: results.some((r) => r.isError),
    loadingCount,
  };
}

export type PortfolioData = ReturnType<typeof usePortfolio>;
