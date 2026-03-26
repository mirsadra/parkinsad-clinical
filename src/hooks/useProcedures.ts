import { useQuery } from "@tanstack/react-query";
import { useFhir } from "../context/FhirContext";
import { unwrapBundle } from "../lib/pagination";
import type { Procedure, Bundle } from "../types/fhir";

export function useProcedures() {
  const { client, patientId } = useFhir();
  return useQuery<Procedure[]>({
    queryKey: ["procedure", patientId],
    queryFn: async () => {
      const bundle = await client.request<Bundle>(
        `Procedure?patient=${patientId}&_sort=-date&_count=50`
      );
      return unwrapBundle<Procedure>(bundle);
    },
  });
}
