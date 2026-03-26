import { useQueries } from "@tanstack/react-query";
import { useFhir } from "../context/FhirContext";
import { unwrapBundle } from "../lib/pagination";
import type { Observation, Bundle } from "../types/fhir";

export function useObservations() {
  const { client, patientId } = useFhir();

  const [vitalsQuery, labsQuery] = useQueries({
    queries: [
      {
        queryKey: ["observation-vitals", patientId],
        queryFn: async () => {
          const bundle = await client.request<Bundle>(
            `Observation?patient=${patientId}&category=vital-signs&_sort=-date&_count=50`
          );
          return unwrapBundle<Observation>(bundle);
        },
        staleTime: 60 * 1000,
      },
      {
        queryKey: ["observation-labs", patientId],
        queryFn: async () => {
          const bundle = await client.request<Bundle>(
            `Observation?patient=${patientId}&category=laboratory&_sort=-date&_count=200`
          );
          return unwrapBundle<Observation>(bundle);
        },
        staleTime: 2 * 60 * 1000,
      },
    ],
  });

  return {
    vitals: vitalsQuery.data ?? [],
    labs: labsQuery.data ?? [],
    isLoading: vitalsQuery.isLoading || labsQuery.isLoading,
    isError: vitalsQuery.isError || labsQuery.isError,
  };
}
