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

export function usePortfolio() {
  const { client, patientId } = useFhir();

  const results = useQueries({
    queries: [
      {
        queryKey: ["patient", patientId],
        queryFn: () => client.request<Patient>(`Patient/${patientId}`),
        staleTime: 5 * 60 * 1000,
      },
      {
        queryKey: ["allergyIntolerance", patientId],
        queryFn: async () =>
          unwrapBundle<AllergyIntolerance>(
            await client.request<Bundle>(
              `AllergyIntolerance?patient=${patientId}&_count=100`
            )
          ),
      },
      {
        queryKey: ["medicationRequest", patientId],
        queryFn: async () =>
          unwrapBundle<MedicationRequest>(
            await client.request<Bundle>(
              `MedicationRequest?patient=${patientId}&status=active&_count=100`
            )
          ),
      },
      {
        queryKey: ["medicationAdministration", patientId],
        queryFn: async () =>
          unwrapBundle<MedicationAdministration>(
            await client.request<Bundle>(
              `MedicationAdministration?patient=${patientId}&_count=100`
            )
          ),
      },
      {
        queryKey: ["medicationDispense", patientId],
        queryFn: async () =>
          unwrapBundle<MedicationDispense>(
            await client.request<Bundle>(
              `MedicationDispense?patient=${patientId}&_count=100`
            )
          ),
      },
      {
        queryKey: ["condition", patientId],
        queryFn: async () =>
          unwrapBundle<Condition>(
            await client.request<Bundle>(
              `Condition?patient=${patientId}&_count=100`
            )
          ),
      },
      {
        queryKey: ["observation-vitals", patientId],
        queryFn: async () =>
          unwrapBundle<Observation>(
            await client.request<Bundle>(
              `Observation?patient=${patientId}&category=vital-signs&_sort=-date&_count=50`
            )
          ),
        staleTime: 60 * 1000,
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
      },
      {
        queryKey: ["encounter", patientId],
        queryFn: async () =>
          unwrapBundle<Encounter>(
            await client.request<Bundle>(
              `Encounter?patient=${patientId}&_sort=-date&_count=20`
            )
          ),
      },
      {
        queryKey: ["immunization", patientId],
        queryFn: async () =>
          unwrapBundle<Immunization>(
            await client.request<Bundle>(
              `Immunization?patient=${patientId}&_count=100`
            )
          ),
      },
      {
        queryKey: ["procedure", patientId],
        queryFn: async () =>
          unwrapBundle<Procedure>(
            await client.request<Bundle>(
              `Procedure?patient=${patientId}&_sort=-date&_count=50`
            )
          ),
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
