import React, { createContext, useContext, useEffect, useState } from "react";
import type Client from "fhirclient/lib/Client";
import { getClient } from "../lib/fhir";

interface FhirContextValue {
  client: Client;
  patientId: string;
}

const FhirContext = createContext<FhirContextValue | null>(null);

export function FhirProvider({ children }: { children: React.ReactNode }) {
  const [value, setValue] = useState<FhirContextValue | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getClient()
      .then((client) => {
        // Debug: log token state so we can confirm the token is present
        const token = client.getState("tokenResponse.access_token");
        const patientId = client.getPatientId();
        // console.warn survives the production console suppression in security.ts
        const grantedScope = client.getState("tokenResponse.scope") as string | undefined;
        console.warn("[FHIR] ready() resolved", {
          hasToken: Boolean(token),
          tokenPrefix: typeof token === "string" ? token.slice(0, 8) + "…" : null,
          patientId,
          serverUrl: client.getState("serverUrl"),
          grantedScope,
        });
        if (!patientId) throw new Error("No patient in context — please relaunch from PowerChart.");
        setValue({ client, patientId });
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : "Authentication failed";
        setError(msg);
      });
  }, []);

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0F1117]">
        <div className="text-center max-w-md p-8 bg-[#171B26] rounded-lg border border-[#2A3044]">
          <div className="text-[#E8403A] text-4xl mb-4">⚠</div>
          <h1 className="text-[#F1F3F7] text-xl font-semibold mb-2">
            Authentication Failed
          </h1>
          <p className="text-[#9CA3AF] text-sm mb-4">{error}</p>
          <p className="text-[#6B7280] text-xs">
            Please close this window and relaunch from PowerChart.
          </p>
        </div>
      </div>
    );
  }

  if (!value) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0F1117]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#3B82F6] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#9CA3AF] text-sm font-medium">
            Connecting to clinical records…
          </p>
        </div>
      </div>
    );
  }

  return <FhirContext.Provider value={value}>{children}</FhirContext.Provider>;
}

export function useFhir(): FhirContextValue {
  const ctx = useContext(FhirContext);
  if (!ctx) throw new Error("useFhir must be used within FhirProvider");
  return ctx;
}
