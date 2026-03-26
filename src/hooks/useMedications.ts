import { useQueries } from "@tanstack/react-query";
import { useFhir } from "../context/FhirContext";
import { unwrapBundle } from "../lib/pagination";
import type { MedicationRequest, MedicationAdministration, MedicationDispense, Bundle } from "../types/fhir";

export function useMedications() {
  const { client, patientId } = useFhir();

  const [requestsQuery, adminQuery, dispenseQuery] = useQueries({
    queries: [
      {
        queryKey: ["medicationRequest", patientId],
        queryFn: async () => {
          const bundle = await client.request<Bundle>(
            `MedicationRequest?patient=${patientId}&status=active&_count=100`
          );
          return unwrapBundle<MedicationRequest>(bundle);
        },
      },
      {
        queryKey: ["medicationAdministration", patientId],
        queryFn: async () => {
          const bundle = await client.request<Bundle>(
            `MedicationAdministration?patient=${patientId}&_count=100`
          );
          return unwrapBundle<MedicationAdministration>(bundle);
        },
      },
      {
        queryKey: ["medicationDispense", patientId],
        queryFn: async () => {
          const bundle = await client.request<Bundle>(
            `MedicationDispense?patient=${patientId}&_count=100`
          );
          return unwrapBundle<MedicationDispense>(bundle);
        },
      },
    ],
  });

  return {
    requests: requestsQuery.data ?? [],
    administrations: adminQuery.data ?? [],
    dispenses: dispenseQuery.data ?? [],
    isLoading: requestsQuery.isLoading || adminQuery.isLoading || dispenseQuery.isLoading,
    isError: requestsQuery.isError || adminQuery.isError || dispenseQuery.isError,
  };
}
