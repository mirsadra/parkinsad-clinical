import { useQuery } from "@tanstack/react-query";
import { useFhir } from "../context/FhirContext";
import { unwrapBundle } from "../lib/pagination";
import type { Encounter, Bundle } from "../types/fhir";

export function useEncounters() {
  const { client, patientId } = useFhir();
  return useQuery<Encounter[]>({
    queryKey: ["encounter", patientId],
    queryFn: async () => {
      const bundle = await client.request<Bundle>(
        `Encounter?patient=${patientId}&_sort=-date&_count=20`
      );
      return unwrapBundle<Encounter>(bundle);
    },
  });
}
