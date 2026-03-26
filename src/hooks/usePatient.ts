import { useQuery } from "@tanstack/react-query";
import { useFhir } from "../context/FhirContext";
import type { Patient } from "../types/fhir";

export function usePatient() {
  const { client, patientId } = useFhir();
  return useQuery<Patient>({
    queryKey: ["patient", patientId],
    queryFn: () => client.request<Patient>(`Patient/${patientId}`),
    staleTime: 5 * 60 * 1000,
  });
}
