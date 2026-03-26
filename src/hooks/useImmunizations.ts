import { useQuery } from "@tanstack/react-query";
import { useFhir } from "../context/FhirContext";
import { unwrapBundle } from "../lib/pagination";
import type { Immunization, Bundle } from "../types/fhir";

export function useImmunizations() {
  const { client, patientId } = useFhir();
  return useQuery<Immunization[]>({
    queryKey: ["immunization", patientId],
    queryFn: async () => {
      const bundle = await client.request<Bundle>(
        `Immunization?patient=${patientId}&_count=100`
      );
      return unwrapBundle<Immunization>(bundle);
    },
  });
}
