import { useQuery } from "@tanstack/react-query";
import { useFhir } from "../context/FhirContext";
import { unwrapBundle } from "../lib/pagination";
import type { AllergyIntolerance, Bundle } from "../types/fhir";

export function useAllergyIntolerances() {
  const { client, patientId } = useFhir();
  return useQuery<AllergyIntolerance[]>({
    queryKey: ["allergyIntolerance", patientId],
    queryFn: async () => {
      const bundle = await client.request<Bundle>(
        `AllergyIntolerance?patient=${patientId}&_count=100`
      );
      return unwrapBundle<AllergyIntolerance>(bundle);
    },
  });
}
