import { useQuery } from "@tanstack/react-query";
import { useFhir } from "../context/FhirContext";
import { unwrapBundle } from "../lib/pagination";
import type { Condition, Bundle } from "../types/fhir";

export function useConditions() {
  const { client, patientId } = useFhir();
  return useQuery<Condition[]>({
    queryKey: ["condition", patientId],
    queryFn: async () => {
      const bundle = await client.request<Bundle>(
        `Condition?patient=${patientId}&_count=100`
      );
      return unwrapBundle<Condition>(bundle);
    },
  });
}
