# SMART on FHIR Patient Portfolio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a SMART on FHIR patient portfolio web app that launches from Cerner Millennium / PowerChart and displays a rich clinical data view across medications, allergies, observations, encounters, conditions, procedures, and immunisations.

**Architecture:** Vite + React 18 + TypeScript SPA with two HTML entry points (`launch.html` for EHR OAuth initiation, `index.html` as the app shell/callback). FHIR data is fetched via `fhirclient.js` with TanStack Query managing per-resource caching and parallel loading. All UI is a dark clinical dashboard optimised for 1024px+ iframe embedding in PowerChart MPages.

**Tech Stack:** Vite 5, React 18, TypeScript 5, fhirclient v2, @tanstack/react-query v5, Tailwind CSS v4, Lucide React, Vitest, @testing-library/react, msw

---

## File Map

### Config / Root
- Create: `package.json`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `tailwind.config.ts`
- Create: `postcss.config.js`
- Create: `.env.local` (gitignored)
- Create: `.env.example`
- Create: `vercel.json`
- Create: `.gitignore`

### Entry Points
- Create: `index.html` (app shell / OAuth callback)
- Create: `public/launch.html` (SMART EHR launch)

### Core Source
- Create: `src/main.tsx`
- Create: `src/App.tsx`

### Types
- Create: `src/types/fhir.ts` — extended local FHIR R4 types

### Lib (pure logic — fully testable)
- Create: `src/lib/fhir.ts` — `getClient()` singleton
- Create: `src/lib/formatters.ts` — NHS number, date, drug name, SNOMED display
- Create: `src/lib/pagination.ts` — `fetchAllPages()` bundle unwrapper
- Create: `src/lib/security.ts` — production log suppression
- Create: `src/lib/postMessageBridge.ts` — PowerChart context change listener
- Create: `src/lib/news2.ts` — NEWS2 score calculation from vitals

### Context
- Create: `src/context/FhirContext.tsx` — SMART client + patientId provider

### Hooks
- Create: `src/hooks/usePatient.ts`
- Create: `src/hooks/useAllergyIntolerances.ts`
- Create: `src/hooks/useMedications.ts`
- Create: `src/hooks/useConditions.ts`
- Create: `src/hooks/useObservations.ts`
- Create: `src/hooks/useEncounters.ts`
- Create: `src/hooks/useImmunizations.ts`
- Create: `src/hooks/useProcedures.ts`
- Create: `src/hooks/usePortfolio.ts` — aggregator
- Create: `src/hooks/useIdleTimeout.ts`

### Shared Components
- Create: `src/components/shared/LoadingSkeleton.tsx`
- Create: `src/components/shared/ErrorState.tsx`
- Create: `src/components/shared/SummaryCard.tsx`
- Create: `src/components/shared/StatusBadge.tsx`
- Create: `src/components/shared/Sparkline.tsx` — SVG mini chart

### Layout Components
- Create: `src/components/PatientHeader.tsx`
- Create: `src/components/TabNav.tsx`

### Panels
- Create: `src/components/panels/OverviewPanel.tsx`
- Create: `src/components/panels/MedicationsPanel.tsx`
- Create: `src/components/panels/AllergiesPanel.tsx`
- Create: `src/components/panels/VitalsPanel.tsx`
- Create: `src/components/panels/LabsPanel.tsx`
- Create: `src/components/panels/EncountersPanel.tsx`
- Create: `src/components/panels/ConditionsPanel.tsx`
- Create: `src/components/panels/ProceduresPanel.tsx`
- Create: `src/components/panels/ImmunisationsPanel.tsx`

### Styles
- Create: `src/styles/tokens.ts`
- Create: `src/styles/powerchart.css`
- Create: `src/styles/globals.css`

### Fixtures (synthetic test data)
- Create: `src/fixtures/patient.json`
- Create: `src/fixtures/allergies.json`
- Create: `src/fixtures/medications.json`
- Create: `src/fixtures/observations-vitals.json`
- Create: `src/fixtures/observations-labs.json`
- Create: `src/fixtures/encounters.json`
- Create: `src/fixtures/conditions.json`
- Create: `src/fixtures/immunizations.json`
- Create: `src/fixtures/procedures.json`

### Tests
- Create: `src/test/setup.ts`
- Create: `src/lib/__tests__/formatters.test.ts`
- Create: `src/lib/__tests__/pagination.test.ts`
- Create: `src/lib/__tests__/news2.test.ts`
- Create: `src/components/panels/__tests__/MedicationsPanel.test.tsx`
- Create: `src/components/panels/__tests__/AllergiesPanel.test.tsx`
- Create: `src/components/__tests__/PatientHeader.test.tsx`
- Create: `vitest.config.ts`

---

## Task 1: Project Scaffold

**Files:** `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `postcss.config.js`, `.gitignore`, `.env.example`, `index.html`, `public/launch.html`

- [ ] **Step 1: Initialise with pnpm**

```bash
cd /Users/sados/Developer/GitHub/parkinsad-clinical
pnpm create vite@latest . --template react-ts
# When prompted about existing files, choose to ignore/overwrite
```

- [ ] **Step 2: Install all dependencies**

```bash
pnpm add fhirclient @tanstack/react-query lucide-react
pnpm add -D tailwindcss@4 @tailwindcss/vite autoprefixer postcss
pnpm add -D vitest @vitest/coverage-v8 jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event msw
pnpm add -D @types/fhir
```

- [ ] **Step 3: Write `vite.config.ts`**

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    outDir: "dist",
    rollupOptions: {
      input: {
        main: "./index.html",
        launch: "./public/launch.html",
      },
    },
  },
  define: {
    __VITE_CLIENT_ID__: JSON.stringify(process.env.VITE_CLIENT_ID ?? ""),
  },
});
```

- [ ] **Step 4: Write `vitest.config.ts`**

```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    globals: true,
  },
});
```

- [ ] **Step 5: Write `src/test/setup.ts`**

```typescript
import "@testing-library/jest-dom";
```

- [ ] **Step 6: Write `index.html`** (app shell / OAuth callback)

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <title>WSH Patient Portfolio</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=DM+Mono:ital,wght@0,300;0,400;0,500;1,300;1,400;1,500&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,300;1,9..40,400&display=swap" rel="stylesheet" />
    <noscript>This application requires JavaScript. Please enable JavaScript in your browser settings.</noscript>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 7: Write `public/launch.html`** (SMART EHR launch entry point)

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <title>WSH Portfolio — Launching...</title>
    <script src="https://cdn.jsdelivr.net/npm/fhirclient/build/fhir-client.js"></script>
    <style>
      body { background: #0F1117; color: #F1F3F7; font-family: sans-serif;
             display: flex; align-items: center; justify-content: center;
             height: 100vh; margin: 0; }
    </style>
  </head>
  <body>
    <p>Connecting to clinical records…</p>
    <script>
      FHIR.oauth2.authorize({
        client_id: "__VITE_CLIENT_ID__",
        scope: [
          "launch", "openid", "fhirUser",
          "patient/Patient.read",
          "patient/AllergyIntolerance.read",
          "patient/MedicationRequest.read",
          "patient/MedicationAdministration.read",
          "patient/Condition.read",
          "patient/Observation.read",
          "patient/DiagnosticReport.read",
          "patient/Encounter.read",
          "patient/Immunization.read",
          "patient/Procedure.read",
          "patient/DocumentReference.read"
        ].join(" "),
        completeInTarget: true
      });
    </script>
  </body>
</html>
```

- [ ] **Step 8: Write `.env.example`**

```
VITE_CLIENT_ID=your_cerner_client_id_here
VITE_CERNER_ISS=https://fhir-ehr-code.cerner.com/r4/ec2458f2-1e24-41c8-b71b-0e701af7583d
```

- [ ] **Step 9: Ensure `.gitignore` includes `.env.local`**

Add to `.gitignore`:
```
.env.local
dist/
```

- [ ] **Step 10: Verify project builds**

```bash
pnpm build
```

Expected: Build completes with two entry points in `dist/`.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "feat: scaffold Vite + React + TS project with SMART launch entry points"
```

---

## Task 2: Types and Pure Lib — Formatters

**Files:** `src/types/fhir.ts`, `src/lib/formatters.ts`, `src/lib/__tests__/formatters.test.ts`

- [ ] **Step 1: Write `src/types/fhir.ts`**

```typescript
// Re-export fhir/r4 types and add local extensions
export type {
  Patient,
  AllergyIntolerance,
  MedicationRequest,
  MedicationAdministration,
  Condition,
  Observation,
  Encounter,
  Immunization,
  Procedure,
  Bundle,
  BundleEntry,
  Coding,
  CodeableConcept,
  Identifier,
} from "fhir/r4";

export type TabId =
  | "overview"
  | "medications"
  | "allergies"
  | "vitals"
  | "labs"
  | "encounters"
  | "conditions"
  | "procedures"
  | "immunisations";
```

- [ ] **Step 2: Write failing tests in `src/lib/__tests__/formatters.test.ts`**

```typescript
import { describe, it, expect } from "vitest";
import {
  formatNhsNumber,
  findNhsNumber,
  formatDate,
  formatAge,
  getConditionDisplay,
  getMedicationDisplay,
} from "../formatters";
import type { Patient, Condition, MedicationRequest } from "../../types/fhir";

describe("formatNhsNumber", () => {
  it("formats 10 digits as XXX-XXX-XXXX", () => {
    expect(formatNhsNumber("1234567890")).toBe("123-456-7890");
  });
  it("returns raw value if not 10 digits", () => {
    expect(formatNhsNumber("123")).toBe("123");
  });
  it("strips non-digits before formatting", () => {
    expect(formatNhsNumber("123 456 7890")).toBe("123-456-7890");
  });
});

describe("findNhsNumber", () => {
  it("finds identifier with nhs-number in system", () => {
    const patient: Partial<Patient> = {
      identifier: [
        { system: "https://fhir.nhs.uk/Id/nhs-number", value: "1234567890" },
      ],
    };
    expect(findNhsNumber(patient as Patient)).toBe("1234567890");
  });
  it("returns undefined when no NHS number present", () => {
    const patient: Partial<Patient> = { identifier: [] };
    expect(findNhsNumber(patient as Patient)).toBeUndefined();
  });
});

describe("formatAge", () => {
  it("calculates age in years from birthDate", () => {
    const age = formatAge("1980-01-01");
    expect(age).toMatch(/^\d+$/);
    expect(parseInt(age)).toBeGreaterThan(40);
  });
});

describe("getConditionDisplay", () => {
  it("prefers SNOMED display text", () => {
    const condition: Partial<Condition> = {
      code: {
        coding: [{ system: "http://snomed.info/sct", display: "Heart failure" }],
      },
    };
    expect(getConditionDisplay(condition as Condition)).toBe("Heart failure");
  });
  it("falls back to code.text", () => {
    const condition: Partial<Condition> = {
      code: { coding: [], text: "Heart failure" },
    };
    expect(getConditionDisplay(condition as Condition)).toBe("Heart failure");
  });
  it("falls back to Unknown condition", () => {
    expect(getConditionDisplay({} as Condition)).toBe("Unknown condition");
  });
});
```

- [ ] **Step 3: Run tests to confirm they fail**

```bash
pnpm vitest run src/lib/__tests__/formatters.test.ts
```

Expected: FAIL — `formatters` module not found.

- [ ] **Step 4: Write `src/lib/formatters.ts`**

```typescript
import type { Patient, Condition, MedicationRequest } from "../types/fhir";

export function formatNhsNumber(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length !== 10) return raw;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export function findNhsNumber(patient: Patient): string | undefined {
  return patient.identifier?.find(
    (id) =>
      id.system?.includes("nhs-number") ||
      id.system?.includes("patient-identifier")
  )?.value;
}

export function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return "Unknown";
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatAge(birthDate: string | undefined): string {
  if (!birthDate) return "Unknown";
  const dob = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return String(age);
}

export function formatPatientName(patient: Patient): string {
  const name = patient.name?.[0];
  if (!name) return "Unknown Patient";
  const given = name.given?.join(" ") ?? "";
  const family = name.family ?? "";
  return `${given} ${family}`.trim();
}

export function getConditionDisplay(condition: Condition): string {
  const snomedCoding = condition.code?.coding?.find(
    (c) => c.system === "http://snomed.info/sct"
  );
  return snomedCoding?.display ?? condition.code?.text ?? "Unknown condition";
}

export function getMedicationDisplay(med: MedicationRequest): string {
  const concept = med.medicationCodeableConcept;
  if (!concept) return "Unknown medication";
  const snomedCoding = concept.coding?.find(
    (c) => c.system === "http://snomed.info/sct"
  );
  return snomedCoding?.display ?? concept.text ?? "Unknown medication";
}
```

- [ ] **Step 5: Run tests — confirm pass**

```bash
pnpm vitest run src/lib/__tests__/formatters.test.ts
```

Expected: All PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/formatters.ts src/lib/__tests__/formatters.test.ts src/types/fhir.ts
git commit -m "feat: add FHIR formatters with NHS number and SNOMED display helpers"
```

---

## Task 3: Pagination and NEWS2 Lib

**Files:** `src/lib/pagination.ts`, `src/lib/news2.ts`, `src/lib/__tests__/pagination.test.ts`, `src/lib/__tests__/news2.test.ts`

- [ ] **Step 1: Write failing tests for pagination**

```typescript
// src/lib/__tests__/pagination.test.ts
import { describe, it, expect, vi } from "vitest";
import { unwrapBundle } from "../pagination";
import type { Bundle } from "../../types/fhir";

describe("unwrapBundle", () => {
  it("returns empty array for bundle with no entries", () => {
    const bundle: Bundle = { resourceType: "Bundle", type: "searchset" };
    expect(unwrapBundle(bundle)).toEqual([]);
  });
  it("extracts resources from entries", () => {
    const bundle: Bundle = {
      resourceType: "Bundle",
      type: "searchset",
      entry: [
        { resource: { resourceType: "Patient", id: "1" } as any },
        { resource: { resourceType: "Patient", id: "2" } as any },
      ],
    };
    expect(unwrapBundle(bundle)).toHaveLength(2);
  });
  it("skips entries without resources", () => {
    const bundle: Bundle = {
      resourceType: "Bundle",
      type: "searchset",
      entry: [{ fullUrl: "urn:foo" }],
    };
    expect(unwrapBundle(bundle)).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Write failing tests for NEWS2**

```typescript
// src/lib/__tests__/news2.test.ts
import { describe, it, expect } from "vitest";
import { calculateNews2Score, getNews2Severity } from "../news2";

describe("getNews2Severity", () => {
  it("returns low for score 0", () => {
    expect(getNews2Severity(0)).toBe("low");
  });
  it("returns medium for score 1-4", () => {
    expect(getNews2Severity(3)).toBe("medium");
  });
  it("returns high for score 5+", () => {
    expect(getNews2Severity(5)).toBe("high");
    expect(getNews2Severity(9)).toBe("high");
  });
});
```

- [ ] **Step 3: Run tests to confirm they fail**

```bash
pnpm vitest run src/lib/__tests__/pagination.test.ts src/lib/__tests__/news2.test.ts
```

- [ ] **Step 4: Write `src/lib/pagination.ts`**

```typescript
import type { Bundle } from "../types/fhir";

export function unwrapBundle<T = unknown>(bundle: Bundle): T[] {
  return (bundle.entry ?? [])
    .filter((e) => e.resource != null)
    .map((e) => e.resource as T);
}

export async function fetchAllPages<T>(
  clientRequest: (url: string) => Promise<Bundle>,
  url: string,
  maxPages = 5
): Promise<T[]> {
  let results: T[] = [];
  let nextUrl: string | undefined = url;
  let page = 0;

  while (nextUrl && page < maxPages) {
    const bundle = await clientRequest(nextUrl);
    results = [...results, ...unwrapBundle<T>(bundle)];
    const nextLink = bundle.link?.find((l) => l.relation === "next");
    nextUrl = nextLink?.url;
    page++;
  }

  return results;
}
```

- [ ] **Step 5: Write `src/lib/news2.ts`**

```typescript
export type News2Severity = "low" | "medium" | "high";

export function getNews2Severity(score: number): News2Severity {
  if (score === 0) return "low";
  if (score <= 4) return "medium";
  return "high";
}

export function getNews2Color(score: number): string {
  const severity = getNews2Severity(score);
  return severity === "low"
    ? "#22C55E"
    : severity === "medium"
    ? "#F59E0B"
    : "#E8403A";
}

// Returns score from 0-20 based on observation values
// This is a simplified scoring — full NEWS2 requires clinical validation
export function calculateNews2Score(vitals: {
  respiratoryRate?: number;
  spO2?: number;
  systolicBP?: number;
  heartRate?: number;
  temperature?: number;
  consciousnessAlert?: boolean; // true = alert
}): number {
  let score = 0;

  if (vitals.respiratoryRate !== undefined) {
    const rr = vitals.respiratoryRate;
    if (rr <= 8) score += 3;
    else if (rr <= 11) score += 1;
    else if (rr <= 20) score += 0;
    else if (rr <= 24) score += 2;
    else score += 3;
  }

  if (vitals.spO2 !== undefined) {
    const spo2 = vitals.spO2;
    if (spo2 <= 91) score += 3;
    else if (spo2 <= 93) score += 2;
    else if (spo2 <= 95) score += 1;
    else score += 0;
  }

  if (vitals.systolicBP !== undefined) {
    const sbp = vitals.systolicBP;
    if (sbp <= 90) score += 3;
    else if (sbp <= 100) score += 2;
    else if (sbp <= 110) score += 1;
    else if (sbp <= 219) score += 0;
    else score += 3;
  }

  if (vitals.heartRate !== undefined) {
    const hr = vitals.heartRate;
    if (hr <= 40) score += 3;
    else if (hr <= 50) score += 1;
    else if (hr <= 90) score += 0;
    else if (hr <= 110) score += 1;
    else if (hr <= 130) score += 2;
    else score += 3;
  }

  if (vitals.temperature !== undefined) {
    const t = vitals.temperature;
    if (t <= 35.0) score += 3;
    else if (t <= 36.0) score += 1;
    else if (t <= 38.0) score += 0;
    else if (t <= 39.0) score += 1;
    else score += 2;
  }

  if (vitals.consciousnessAlert === false) score += 3;

  return score;
}
```

- [ ] **Step 6: Run tests — confirm pass**

```bash
pnpm vitest run src/lib/__tests__/pagination.test.ts src/lib/__tests__/news2.test.ts
```

- [ ] **Step 7: Commit**

```bash
git add src/lib/pagination.ts src/lib/news2.ts src/lib/__tests__/
git commit -m "feat: add pagination bundle unwrapper and NEWS2 score calculator"
```

---

## Task 4: Security, PostMessage, and Style Tokens

**Files:** `src/lib/security.ts`, `src/lib/postMessageBridge.ts`, `src/styles/tokens.ts`, `src/styles/globals.css`, `src/styles/powerchart.css`

- [ ] **Step 1: Write `src/lib/security.ts`**

```typescript
// Suppress all patient data from production logs
if (import.meta.env.PROD) {
  console.log = () => {};
  console.debug = () => {};
  console.info = () => {};
}

export function sanitiseForLog(obj: unknown): unknown {
  if (import.meta.env.PROD) return "[redacted in production]";
  return obj;
}
```

- [ ] **Step 2: Write `src/lib/postMessageBridge.ts`**

```typescript
type ContextChangeHandler = (patientId: string) => void;

let _handler: ContextChangeHandler | null = null;

export function registerContextChangeHandler(fn: ContextChangeHandler): void {
  _handler = fn;
}

export function initPostMessageBridge(): () => void {
  function handleMessage(event: MessageEvent) {
    // Only accept messages from trusted parent frames
    // In production scope to Cerner domain
    if (event.data?.type === "PATIENT_CONTEXT_CHANGE" && event.data.patientId) {
      _handler?.(event.data.patientId);
    }
  }

  window.addEventListener("message", handleMessage);
  return () => window.removeEventListener("message", handleMessage);
}
```

- [ ] **Step 3: Write `src/styles/tokens.ts`**

```typescript
export const tokens = {
  bg: {
    base: "#0F1117",
    surface: "#171B26",
    elevated: "#1E2333",
    border: "#2A3044",
  },
  clinical: {
    critical: "#E8403A",
    warning: "#F59E0B",
    normal: "#22C55E",
    info: "#3B82F6",
    muted: "#6B7280",
  },
  text: {
    primary: "#F1F3F7",
    secondary: "#9CA3AF",
    tertiary: "#6B7280",
  },
} as const;
```

- [ ] **Step 4: Write `src/styles/globals.css`**

```css
@import "tailwindcss";

@layer base {
  :root {
    --font-body: "DM Sans", sans-serif;
    --font-mono: "DM Mono", monospace;
    --bg-base: #0F1117;
    --bg-surface: #171B26;
    --bg-elevated: #1E2333;
    --border: #2A3044;
    --text-primary: #F1F3F7;
    --text-secondary: #9CA3AF;
    --clinical-critical: #E8403A;
    --clinical-warning: #F59E0B;
    --clinical-normal: #22C55E;
    --clinical-info: #3B82F6;
  }

  body {
    background-color: var(--bg-base);
    color: var(--text-primary);
    font-family: var(--font-body);
  }

  * {
    box-sizing: border-box;
  }
}

@layer utilities {
  .font-mono-data {
    font-family: var(--font-mono);
  }

  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }

  .skeleton {
    background: linear-gradient(90deg, #1E2333 25%, #2A3044 50%, #1E2333 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s ease-in-out infinite;
    border-radius: 4px;
  }

  @keyframes pulse-border {
    0%, 100% { border-color: rgba(232, 64, 58, 0.5); }
    50% { border-color: rgba(232, 64, 58, 1); }
  }

  .allergy-critical {
    animation: pulse-border 2s ease-in-out infinite;
  }
}
```

- [ ] **Step 5: Write `src/styles/powerchart.css`**

```css
/* Required for PowerChart MPages iframe embedding */
html, body {
  height: 100%;
  overflow: hidden;
}

#root {
  height: 100vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  scroll-behavior: smooth;
}

/* Sticky table headers */
.data-table thead th {
  position: sticky;
  top: 0;
  z-index: 10;
  background-color: var(--bg-elevated);
}

/* Icon-only tab nav at narrow widths */
@media (max-width: 1280px) {
  .tab-nav-label {
    display: none;
  }
  .tab-nav {
    width: 48px !important;
  }
}
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/security.ts src/lib/postMessageBridge.ts src/styles/
git commit -m "feat: add security helpers, postMessage bridge, and design tokens"
```

---

## Task 5: FHIR Context and Client

**Files:** `src/lib/fhir.ts`, `src/context/FhirContext.tsx`, `src/main.tsx`

- [ ] **Step 1: Write `src/lib/fhir.ts`**

```typescript
import FHIR from "fhirclient";
import type Client from "fhirclient/lib/Client";

let _client: Client | null = null;

export async function getClient(): Promise<Client> {
  if (_client) return _client;
  _client = await FHIR.oauth2.ready();
  return _client;
}

export function clearClient(): void {
  _client = null;
}
```

- [ ] **Step 2: Write `src/context/FhirContext.tsx`**

```typescript
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
        const patientId = client.getPatientId();
        if (!patientId) throw new Error("No patient in context");
        setValue({ client, patientId });
      })
      .catch((err: Error) => setError(err.message));
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
          <p className="text-[#9CA3AF] text-sm">
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
```

- [ ] **Step 3: Write `src/main.tsx`**

```typescript
import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { FhirProvider } from "./context/FhirContext";
import App from "./App";
import "./lib/security";
import "./styles/globals.css";
import "./styles/powerchart.css";

// Global error boundary for uncaught errors
window.onerror = (message, source, lineno, colno, error) => {
  console.error("Unhandled error:", { message, source, lineno, colno, error });
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 60 * 1000,
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <FhirProvider>
        <App />
      </FhirProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
```

- [ ] **Step 4: Write placeholder `src/App.tsx`** (will be expanded in Task 11)

```typescript
export default function App() {
  return (
    <div className="h-screen bg-[#0F1117] flex items-center justify-center">
      <p className="text-[#9CA3AF]">App loading…</p>
    </div>
  );
}
```

- [ ] **Step 5: Verify project builds**

```bash
pnpm build
```

Expected: No TypeScript errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/fhir.ts src/context/FhirContext.tsx src/main.tsx src/App.tsx
git commit -m "feat: add FHIR client singleton and SMART auth context provider"
```

---

## Task 6: FHIR Resource Hooks

**Files:** All files in `src/hooks/`

- [ ] **Step 1: Write `src/hooks/usePatient.ts`**

```typescript
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
```

- [ ] **Step 2: Write `src/hooks/useAllergyIntolerances.ts`**

```typescript
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
```

- [ ] **Step 3: Write `src/hooks/useMedications.ts`**

```typescript
import { useQueries } from "@tanstack/react-query";
import { useFhir } from "../context/FhirContext";
import { unwrapBundle } from "../lib/pagination";
import type { MedicationRequest, MedicationAdministration, Bundle } from "../types/fhir";

export function useMedications() {
  const { client, patientId } = useFhir();

  const [requestsQuery, adminQuery] = useQueries({
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
    ],
  });

  return {
    requests: requestsQuery.data ?? [],
    administrations: adminQuery.data ?? [],
    isLoading: requestsQuery.isLoading || adminQuery.isLoading,
    isError: requestsQuery.isError || adminQuery.isError,
  };
}
```

- [ ] **Step 4: Write `src/hooks/useConditions.ts`**

```typescript
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
        `Condition?patient=${patientId}&clinical-status=active&_count=100`
      );
      return unwrapBundle<Condition>(bundle);
    },
  });
}
```

- [ ] **Step 5: Write `src/hooks/useObservations.ts`**

```typescript
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
            `Observation?patient=${patientId}&category=laboratory&_sort=-date&_count=100`
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
```

- [ ] **Step 6: Write `src/hooks/useEncounters.ts`**

```typescript
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
        `Encounter?patient=${patientId}&_sort=-date&_count=10`
      );
      return unwrapBundle<Encounter>(bundle);
    },
  });
}
```

- [ ] **Step 7: Write `src/hooks/useImmunizations.ts`**

```typescript
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
```

- [ ] **Step 8: Write `src/hooks/useProcedures.ts`**

```typescript
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
```

- [ ] **Step 9: Write `src/hooks/useIdleTimeout.ts`**

```typescript
import { useEffect, useRef, useCallback } from "react";

const IDLE_MS = 30 * 60 * 1000; // 30 minutes

export function useIdleTimeout(onTimeout: () => void): void {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reset = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(onTimeout, IDLE_MS);
  }, [onTimeout]);

  useEffect(() => {
    const events = ["mousemove", "keydown", "click", "touchstart"];
    events.forEach((e) => window.addEventListener(e, reset));
    reset();
    return () => {
      events.forEach((e) => window.removeEventListener(e, reset));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [reset]);
}
```

- [ ] **Step 10: Write `src/hooks/usePortfolio.ts`**

```typescript
import { useQueries } from "@tanstack/react-query";
import { useFhir } from "../context/FhirContext";
import { unwrapBundle } from "../lib/pagination";
import type {
  Patient, AllergyIntolerance, MedicationRequest, MedicationAdministration,
  Condition, Observation, Encounter, Immunization, Procedure, Bundle,
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
        queryFn: async () => unwrapBundle<AllergyIntolerance>(
          await client.request<Bundle>(`AllergyIntolerance?patient=${patientId}&_count=100`)
        ),
      },
      {
        queryKey: ["medicationRequest", patientId],
        queryFn: async () => unwrapBundle<MedicationRequest>(
          await client.request<Bundle>(`MedicationRequest?patient=${patientId}&status=active&_count=100`)
        ),
      },
      {
        queryKey: ["medicationAdministration", patientId],
        queryFn: async () => unwrapBundle<MedicationAdministration>(
          await client.request<Bundle>(`MedicationAdministration?patient=${patientId}&_count=100`)
        ),
      },
      {
        queryKey: ["condition", patientId],
        queryFn: async () => unwrapBundle<Condition>(
          await client.request<Bundle>(`Condition?patient=${patientId}&clinical-status=active&_count=100`)
        ),
      },
      {
        queryKey: ["observation-vitals", patientId],
        queryFn: async () => unwrapBundle<Observation>(
          await client.request<Bundle>(`Observation?patient=${patientId}&category=vital-signs&_sort=-date&_count=50`)
        ),
        staleTime: 60 * 1000,
      },
      {
        queryKey: ["observation-labs", patientId],
        queryFn: async () => unwrapBundle<Observation>(
          await client.request<Bundle>(`Observation?patient=${patientId}&category=laboratory&_sort=-date&_count=100`)
        ),
      },
      {
        queryKey: ["encounter", patientId],
        queryFn: async () => unwrapBundle<Encounter>(
          await client.request<Bundle>(`Encounter?patient=${patientId}&_sort=-date&_count=10`)
        ),
      },
      {
        queryKey: ["immunization", patientId],
        queryFn: async () => unwrapBundle<Immunization>(
          await client.request<Bundle>(`Immunization?patient=${patientId}&_count=100`)
        ),
      },
      {
        queryKey: ["procedure", patientId],
        queryFn: async () => unwrapBundle<Procedure>(
          await client.request<Bundle>(`Procedure?patient=${patientId}&_sort=-date&_count=50`)
        ),
      },
    ],
  });

  const loadingCount = results.filter((r) => r.isLoading).length;
  const isLoading = loadingCount > 0;
  const isError = results.some((r) => r.isError);

  const [patient, allergies, medicationRequests, medicationAdmins,
    conditions, vitals, labs, encounters, immunizations, procedures] = results;

  return {
    patient: patient.data as Patient | undefined,
    allergies: (allergies.data ?? []) as AllergyIntolerance[],
    medicationRequests: (medicationRequests.data ?? []) as MedicationRequest[],
    medicationAdmins: (medicationAdmins.data ?? []) as MedicationAdministration[],
    conditions: (conditions.data ?? []) as Condition[],
    vitals: (vitals.data ?? []) as Observation[],
    labs: (labs.data ?? []) as Observation[],
    encounters: (encounters.data ?? []) as Encounter[],
    immunizations: (immunizations.data ?? []) as Immunization[],
    procedures: (procedures.data ?? []) as Procedure[],
    isLoading,
    isError,
    loadingCount,
  };
}
```

- [ ] **Step 11: Build to check types**

```bash
pnpm build
```

Expected: Builds cleanly.

- [ ] **Step 12: Commit**

```bash
git add src/hooks/
git commit -m "feat: add all FHIR resource hooks with TanStack Query and portfolio aggregator"
```

---

## Task 7: Test Fixtures

**Files:** All `src/fixtures/*.json`

- [ ] **Step 1: Write `src/fixtures/patient.json`**

```json
{
  "resourceType": "Patient",
  "id": "12742400",
  "identifier": [
    {
      "system": "https://fhir.nhs.uk/Id/nhs-number",
      "value": "9449304106"
    }
  ],
  "name": [{ "family": "Smith", "given": ["James", "Robert"] }],
  "birthDate": "1956-08-14",
  "gender": "male"
}
```

- [ ] **Step 2: Write `src/fixtures/allergies.json`**

```json
[
  {
    "resourceType": "AllergyIntolerance",
    "id": "a1",
    "criticality": "high",
    "code": { "coding": [{ "system": "http://snomed.info/sct", "display": "Penicillin" }], "text": "Penicillin" },
    "reaction": [{ "description": "Anaphylaxis", "severity": "severe" }],
    "clinicalStatus": { "coding": [{ "code": "active" }] }
  },
  {
    "resourceType": "AllergyIntolerance",
    "id": "a2",
    "criticality": "low",
    "code": { "coding": [{ "system": "http://snomed.info/sct", "display": "Ibuprofen" }], "text": "Ibuprofen" },
    "reaction": [{ "description": "Rash", "severity": "mild" }],
    "clinicalStatus": { "coding": [{ "code": "active" }] }
  }
]
```

- [ ] **Step 3: Write `src/fixtures/medications.json`**

```json
[
  {
    "resourceType": "MedicationRequest",
    "id": "m1",
    "status": "active",
    "medicationCodeableConcept": {
      "coding": [{ "system": "http://snomed.info/sct", "code": "322280009", "display": "Aspirin 75mg dispersible tablet" }],
      "text": "Aspirin 75mg dispersible tablet"
    },
    "dosageInstruction": [{ "text": "75mg once daily", "route": { "text": "Oral" } }],
    "authoredOn": "2024-01-15"
  },
  {
    "resourceType": "MedicationRequest",
    "id": "m2",
    "status": "active",
    "medicationCodeableConcept": {
      "coding": [{ "system": "http://snomed.info/sct", "display": "Bisoprolol 5mg tablet" }],
      "text": "Bisoprolol 5mg tablet"
    },
    "dosageInstruction": [{ "text": "5mg once daily", "route": { "text": "Oral" } }],
    "authoredOn": "2024-02-20"
  }
]
```

- [ ] **Step 4: Write `src/fixtures/conditions.json`**

```json
[
  {
    "resourceType": "Condition",
    "id": "c1",
    "code": { "coding": [{ "system": "http://snomed.info/sct", "display": "Heart failure with reduced ejection fraction" }] },
    "clinicalStatus": { "coding": [{ "code": "active" }] },
    "onsetDateTime": "2022-03-01"
  },
  {
    "resourceType": "Condition",
    "id": "c2",
    "code": { "coding": [{ "system": "http://snomed.info/sct", "display": "Type 2 diabetes mellitus" }] },
    "clinicalStatus": { "coding": [{ "code": "active" }] },
    "onsetDateTime": "2018-06-10"
  },
  {
    "resourceType": "Condition",
    "id": "c3",
    "code": { "coding": [{ "system": "http://snomed.info/sct", "display": "Atrial fibrillation" }] },
    "clinicalStatus": { "coding": [{ "code": "active" }] },
    "onsetDateTime": "2021-11-05"
  },
  {
    "resourceType": "Condition",
    "id": "c4",
    "code": { "coding": [{ "system": "http://snomed.info/sct", "display": "Chronic kidney disease stage 3" }] },
    "clinicalStatus": { "coding": [{ "code": "active" }] },
    "onsetDateTime": "2020-09-14"
  }
]
```

- [ ] **Step 5: Write `src/fixtures/observations-vitals.json`**

```json
[
  { "resourceType": "Observation", "id": "v1", "status": "final",
    "category": [{ "coding": [{ "code": "vital-signs" }] }],
    "code": { "coding": [{ "system": "http://loinc.org", "code": "55284-4", "display": "Blood pressure" }] },
    "component": [
      { "code": { "coding": [{ "code": "8480-6", "display": "Systolic blood pressure" }] }, "valueQuantity": { "value": 138, "unit": "mmHg" } },
      { "code": { "coding": [{ "code": "8462-4", "display": "Diastolic blood pressure" }] }, "valueQuantity": { "value": 84, "unit": "mmHg" } }
    ],
    "effectiveDateTime": "2026-03-24T09:00:00Z" },
  { "resourceType": "Observation", "id": "v2", "status": "final",
    "category": [{ "coding": [{ "code": "vital-signs" }] }],
    "code": { "coding": [{ "system": "http://loinc.org", "code": "59408-5", "display": "Oxygen saturation" }] },
    "valueQuantity": { "value": 97, "unit": "%" },
    "effectiveDateTime": "2026-03-24T09:00:00Z" },
  { "resourceType": "Observation", "id": "v3", "status": "final",
    "category": [{ "coding": [{ "code": "vital-signs" }] }],
    "code": { "coding": [{ "system": "http://loinc.org", "code": "8867-4", "display": "Heart rate" }] },
    "valueQuantity": { "value": 72, "unit": "bpm" },
    "effectiveDateTime": "2026-03-24T09:00:00Z" }
]
```

- [ ] **Step 6: Write remaining fixtures** (`observations-labs.json`, `encounters.json`, `immunizations.json`, `procedures.json`)

Create minimal but realistic JSON for each — at least 2-3 entries per fixture following the FHIR R4 structure. Labs should include FBC entries (haemoglobin, WBC) and U&E (sodium, potassium, creatinine) with `referenceRange` and `interpretation` fields.

- [ ] **Step 7: Commit**

```bash
git add src/fixtures/
git commit -m "feat: add synthetic FHIR R4 fixtures for all resource types"
```

---

## Task 8: Shared Components

**Files:** `src/components/shared/`

- [ ] **Step 1: Write `src/components/shared/StatusBadge.tsx`**

```typescript
interface StatusBadgeProps {
  status: "active" | "stopped" | "on-hold" | "completed" | string;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  active: { label: "Active", color: "bg-green-900/40 text-green-400 border border-green-800" },
  stopped: { label: "Stopped", color: "bg-gray-800 text-gray-400 border border-gray-700" },
  "on-hold": { label: "On Hold", color: "bg-amber-900/40 text-amber-400 border border-amber-800" },
  completed: { label: "Completed", color: "bg-blue-900/40 text-blue-400 border border-blue-800" },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status] ?? {
    label: status,
    color: "bg-gray-800 text-gray-400 border border-gray-700",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${config.color}`}>
      {config.label}
    </span>
  );
}
```

- [ ] **Step 2: Write `src/components/shared/LoadingSkeleton.tsx`**

```typescript
interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = "" }: SkeletonProps) {
  return <div className={`skeleton rounded ${className}`} />;
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <Skeleton className="h-5 flex-1" />
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-24" />
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-[#171B26] border border-[#2A3044] rounded-lg p-4 space-y-2">
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
}
```

- [ ] **Step 3: Write `src/components/shared/ErrorState.tsx`**

```typescript
import { useQueryClient } from "@tanstack/react-query";
import { AlertCircle, RefreshCw } from "lucide-react";

interface ErrorStateProps {
  message?: string;
}

export function ErrorState({ message = "Failed to load clinical data." }: ErrorStateProps) {
  const queryClient = useQueryClient();
  return (
    <div className="flex flex-col items-center justify-center h-full py-16 text-center">
      <AlertCircle className="w-10 h-10 text-[#E8403A] mb-3" />
      <p className="text-[#F1F3F7] font-medium mb-1">Error</p>
      <p className="text-[#9CA3AF] text-sm mb-4">{message}</p>
      <button
        onClick={() => queryClient.invalidateQueries()}
        className="flex items-center gap-2 px-4 py-2 bg-[#1E2333] border border-[#2A3044] rounded text-sm text-[#F1F3F7] hover:bg-[#2A3044] transition-colors duration-150"
      >
        <RefreshCw className="w-4 h-4" />
        Retry
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Write `src/components/shared/SummaryCard.tsx`**

```typescript
import type { LucideIcon } from "lucide-react";

interface SummaryCardProps {
  icon: LucideIcon;
  value: string | number;
  label: string;
  accentColor?: string;
  alert?: boolean;
}

export function SummaryCard({
  icon: Icon,
  value,
  label,
  accentColor = "#3B82F6",
  alert = false,
}: SummaryCardProps) {
  return (
    <div
      className="relative bg-[#171B26] border border-[#2A3044] rounded-lg p-4
                 transition-shadow duration-150 hover:shadow-lg group cursor-default"
      style={{ ["--accent" as string]: accentColor }}
    >
      {alert && (
        <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#E8403A] animate-pulse" />
      )}
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-md" style={{ backgroundColor: `${accentColor}20` }}>
          <Icon className="w-4 h-4" style={{ color: accentColor }} />
        </div>
        <div>
          <div className="text-2xl font-semibold font-mono-data text-[#F1F3F7] leading-none mb-1">
            {value}
          </div>
          <div className="text-xs text-[#9CA3AF]">{label}</div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Write `src/components/shared/Sparkline.tsx`**

```typescript
interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
}

export function Sparkline({ data, width = 80, height = 24, color = "#3B82F6" }: SparklineProps) {
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((v - min) / range) * height;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add src/components/shared/
git commit -m "feat: add shared UI components — skeleton, error state, summary card, sparkline"
```

---

## Task 9: PatientHeader and TabNav

**Files:** `src/components/PatientHeader.tsx`, `src/components/TabNav.tsx`, `src/components/__tests__/PatientHeader.test.tsx`

- [ ] **Step 1: Write failing test `src/components/__tests__/PatientHeader.test.tsx`**

```typescript
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import patientFixture from "../../fixtures/patient.json";
import { PatientHeader } from "../PatientHeader";

describe("PatientHeader", () => {
  it("renders patient name", () => {
    render(
      <PatientHeader
        patient={patientFixture as any}
        allergies={[]}
        loading={false}
      />
    );
    expect(screen.getByText(/Smith/)).toBeInTheDocument();
  });

  it("formats NHS number with dashes", () => {
    render(
      <PatientHeader
        patient={patientFixture as any}
        allergies={[]}
        loading={false}
      />
    );
    expect(screen.getByText("944-930-4106")).toBeInTheDocument();
  });

  it("shows SEVERE ALLERGY badge when high criticality allergy present", () => {
    const highAllergyFixture = [
      { criticality: "high", code: { text: "Penicillin" } },
    ];
    render(
      <PatientHeader
        patient={patientFixture as any}
        allergies={highAllergyFixture as any}
        loading={false}
      />
    );
    expect(screen.getByText("SEVERE ALLERGY")).toBeInTheDocument();
  });

  it("shows loading skeletons when loading prop is true", () => {
    const { container } = render(
      <PatientHeader patient={undefined} allergies={[]} loading={true} />
    );
    expect(container.querySelectorAll(".skeleton").length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
pnpm vitest run src/components/__tests__/PatientHeader.test.tsx
```

- [ ] **Step 3: Write `src/components/PatientHeader.tsx`**

```typescript
import { AlertTriangle } from "lucide-react";
import type { Patient, AllergyIntolerance } from "../types/fhir";
import { formatNhsNumber, findNhsNumber, formatDate, formatAge, formatPatientName } from "../lib/formatters";
import { Skeleton } from "./shared/LoadingSkeleton";

interface PatientHeaderProps {
  patient: Patient | undefined;
  allergies: AllergyIntolerance[];
  loading: boolean;
}

export function PatientHeader({ patient, allergies, loading }: PatientHeaderProps) {
  const hasSevereAllergy = allergies.some((a) => a.criticality === "high");

  if (loading || !patient) {
    return (
      <header className="sticky top-0 z-20 bg-[#171B26] border-b border-[#2A3044] px-6 py-4">
        <div className="flex items-center gap-4">
          <div className="border-l-4 border-[#3B82F6] pl-4 space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
      </header>
    );
  }

  const nhsNumber = findNhsNumber(patient);

  return (
    <header className="sticky top-0 z-20 bg-[#171B26] border-b border-[#2A3044] px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="border-l-4 border-[#3B82F6] pl-4">
            <h1 className="text-xl font-semibold text-[#F1F3F7]">
              {formatPatientName(patient)}
            </h1>
            <div className="flex items-center gap-3 mt-1 text-sm text-[#9CA3AF]">
              <span>DOB: {formatDate(patient.birthDate)}</span>
              <span className="text-[#2A3044]">·</span>
              <span>Age: {formatAge(patient.birthDate)}</span>
              <span className="text-[#2A3044]">·</span>
              <span className="capitalize">{patient.gender}</span>
              {nhsNumber && (
                <>
                  <span className="text-[#2A3044]">·</span>
                  <span className="font-mono-data text-[#F1F3F7]">
                    NHS: {formatNhsNumber(nhsNumber)}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
        {hasSevereAllergy && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-red-900/30 border border-[#E8403A] rounded-md allergy-critical">
            <AlertTriangle className="w-4 h-4 text-[#E8403A]" />
            <span className="text-[#E8403A] text-sm font-semibold tracking-wide">
              SEVERE ALLERGY
            </span>
          </div>
        )}
      </div>
    </header>
  );
}
```

- [ ] **Step 4: Run tests — confirm pass**

```bash
pnpm vitest run src/components/__tests__/PatientHeader.test.tsx
```

- [ ] **Step 5: Write `src/components/TabNav.tsx`**

```typescript
import {
  LayoutDashboard, Pill, AlertTriangle, Activity, FlaskConical,
  CalendarDays, Heart, Scissors, Syringe,
} from "lucide-react";
import type { TabId } from "../types/fhir";

interface Tab {
  id: TabId;
  label: string;
  icon: typeof LayoutDashboard;
  count?: number;
}

interface TabNavProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  counts?: Partial<Record<TabId, number>>;
}

const TABS: Tab[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "medications", label: "Medications", icon: Pill },
  { id: "allergies", label: "Allergies", icon: AlertTriangle },
  { id: "vitals", label: "Vitals", icon: Activity },
  { id: "labs", label: "Labs", icon: FlaskConical },
  { id: "encounters", label: "Encounters", icon: CalendarDays },
  { id: "conditions", label: "Conditions", icon: Heart },
  { id: "procedures", label: "Procedures", icon: Scissors },
  { id: "immunisations", label: "Immunisations", icon: Syringe },
];

export function TabNav({ activeTab, onTabChange, counts = {} }: TabNavProps) {
  return (
    <nav
      className="tab-nav flex-shrink-0 w-52 bg-[#171B26] border-r border-[#2A3044]
                 flex flex-col py-2 overflow-y-auto"
      aria-label="Clinical data sections"
    >
      {TABS.map(({ id, label, icon: Icon }) => {
        const isActive = id === activeTab;
        const count = counts[id];
        return (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            aria-selected={isActive}
            className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors duration-150
                       border-l-4 text-left w-full
                       ${isActive
                         ? "border-[#3B82F6] bg-[#1E2333] text-[#F1F3F7]"
                         : "border-transparent text-[#9CA3AF] hover:text-[#F1F3F7] hover:bg-[#1A1F2E]"
                       }`}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            <span className="tab-nav-label flex-1">{label}</span>
            {count !== undefined && (
              <span
                className={`ml-auto text-xs px-1.5 py-0.5 rounded-full
                           ${isActive ? "bg-[#3B82F6] text-white" : "bg-[#2A3044] text-[#9CA3AF]"}`}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add src/components/PatientHeader.tsx src/components/TabNav.tsx src/components/__tests__/
git commit -m "feat: add PatientHeader and TabNav components with NHS number formatting"
```

---

## Task 10: Clinical Panels (Part 1) — Allergies and Medications

**Files:** `src/components/panels/AllergiesPanel.tsx`, `src/components/panels/MedicationsPanel.tsx`, `src/components/panels/__tests__/AllergiesPanel.test.tsx`, `src/components/panels/__tests__/MedicationsPanel.test.tsx`

- [ ] **Step 1: Write failing test for AllergiesPanel**

```typescript
// src/components/panels/__tests__/AllergiesPanel.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AllergiesPanel } from "../AllergiesPanel";
import allergiesFixture from "../../../fixtures/allergies.json";

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
);

describe("AllergiesPanel", () => {
  it("renders allergy entries", () => {
    render(
      <AllergiesPanel allergies={allergiesFixture as any} isLoading={false} />,
      { wrapper }
    );
    expect(screen.getByText("Penicillin")).toBeInTheDocument();
    expect(screen.getByText("Ibuprofen")).toBeInTheDocument();
  });

  it("shows NKA banner when allergies array is empty", () => {
    render(<AllergiesPanel allergies={[]} isLoading={false} />, { wrapper });
    expect(screen.getByText(/No known allergies/i)).toBeInTheDocument();
  });

  it("shows loading state when isLoading is true", () => {
    const { container } = render(
      <AllergiesPanel allergies={[]} isLoading={true} />,
      { wrapper }
    );
    expect(container.querySelectorAll(".skeleton").length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Write failing test for MedicationsPanel**

```typescript
// src/components/panels/__tests__/MedicationsPanel.test.tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MedicationsPanel } from "../MedicationsPanel";
import medicationsFixture from "../../../fixtures/medications.json";

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
);

describe("MedicationsPanel", () => {
  it("renders medication entries", () => {
    render(
      <MedicationsPanel
        requests={medicationsFixture as any}
        administrations={[]}
        isLoading={false}
      />,
      { wrapper }
    );
    expect(screen.getByText("Aspirin 75mg dispersible tablet")).toBeInTheDocument();
    expect(screen.getByText("Bisoprolol 5mg tablet")).toBeInTheDocument();
  });

  it("filters by drug name search", () => {
    render(
      <MedicationsPanel
        requests={medicationsFixture as any}
        administrations={[]}
        isLoading={false}
      />,
      { wrapper }
    );
    const search = screen.getByPlaceholderText(/search/i);
    fireEvent.change(search, { target: { value: "Aspirin" } });
    expect(screen.getByText("Aspirin 75mg dispersible tablet")).toBeInTheDocument();
    expect(screen.queryByText("Bisoprolol 5mg tablet")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run tests to confirm they fail**

```bash
pnpm vitest run src/components/panels/__tests__/
```

- [ ] **Step 4: Write `src/components/panels/AllergiesPanel.tsx`**

```typescript
import { ShieldCheck, AlertTriangle } from "lucide-react";
import type { AllergyIntolerance } from "../../types/fhir";
import { CardSkeleton } from "../shared/LoadingSkeleton";

interface AllergiesPanelProps {
  allergies: AllergyIntolerance[];
  isLoading: boolean;
}

const severityColor: Record<string, string> = {
  severe: "text-[#E8403A]",
  moderate: "text-[#F59E0B]",
  mild: "text-[#22C55E]",
};

export function AllergiesPanel({ allergies, isLoading }: AllergiesPanelProps) {
  if (isLoading) {
    return (
      <div className="panel-content p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[1, 2, 3].map((i) => <CardSkeleton key={i} />)}
      </div>
    );
  }

  if (allergies.length === 0) {
    return (
      <div className="panel-content p-6">
        <div className="flex items-center gap-3 p-4 bg-green-900/20 border border-green-800 rounded-lg">
          <ShieldCheck className="w-6 h-6 text-[#22C55E]" />
          <span className="text-[#22C55E] font-medium">No known allergies recorded</span>
        </div>
      </div>
    );
  }

  return (
    <div className="panel-content p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
      {allergies.map((allergy) => {
        const isHighCriticality = allergy.criticality === "high";
        const name = allergy.code?.text ?? allergy.code?.coding?.[0]?.display ?? "Unknown allergen";
        const reaction = allergy.reaction?.[0];
        const severity = reaction?.severity ?? "unknown";

        return (
          <div
            key={allergy.id}
            className={`bg-[#171B26] rounded-lg p-4 border-l-4
                       ${isHighCriticality
                         ? "border-[#E8403A] allergy-critical"
                         : "border-[#2A3044]"
                       }`}
          >
            <div className="flex items-start justify-between mb-2">
              <span className="text-[#F1F3F7] font-medium">{name}</span>
              {isHighCriticality && (
                <AlertTriangle className="w-4 h-4 text-[#E8403A] flex-shrink-0 ml-2" />
              )}
            </div>
            {reaction?.description && (
              <p className="text-sm text-[#9CA3AF] mb-1">{reaction.description}</p>
            )}
            <div className="flex items-center gap-2 mt-2">
              <span className={`text-xs font-medium capitalize ${severityColor[severity] ?? "text-[#9CA3AF]"}`}>
                {severity}
              </span>
              {allergy.criticality && (
                <>
                  <span className="text-[#2A3044]">·</span>
                  <span className="text-xs text-[#6B7280] capitalize">
                    Criticality: {allergy.criticality}
                  </span>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 5: Write `src/components/panels/MedicationsPanel.tsx`**

```typescript
import { useState } from "react";
import { Search, ChevronDown, ChevronUp } from "lucide-react";
import type { MedicationRequest, MedicationAdministration } from "../../types/fhir";
import { getMedicationDisplay, formatDate } from "../../lib/formatters";
import { StatusBadge } from "../shared/StatusBadge";
import { TableSkeleton } from "../shared/LoadingSkeleton";

interface MedicationsPanelProps {
  requests: MedicationRequest[];
  administrations: MedicationAdministration[];
  isLoading: boolean;
}

export function MedicationsPanel({ requests, administrations, isLoading }: MedicationsPanelProps) {
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"active" | "all">("active");

  if (isLoading) return <TableSkeleton rows={6} />;

  const filtered = requests
    .filter((r) => statusFilter === "all" || r.status === "active")
    .filter((r) =>
      getMedicationDisplay(r).toLowerCase().includes(search.toLowerCase())
    );

  return (
    <div className="panel-content flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[#2A3044]">
        <div className="flex gap-1">
          {(["active", "all"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-3 py-1 rounded text-xs font-medium capitalize transition-colors duration-150
                         ${statusFilter === f
                           ? "bg-[#3B82F6] text-white"
                           : "bg-[#1E2333] text-[#9CA3AF] hover:text-[#F1F3F7]"
                         }`}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#6B7280]" />
          <input
            type="text"
            placeholder="Search medications…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-[#1E2333] border border-[#2A3044] rounded text-sm
                       text-[#F1F3F7] placeholder-[#6B7280] focus:outline-none focus:border-[#3B82F6]"
          />
        </div>
        <span className="text-xs text-[#6B7280] ml-auto">{filtered.length} medications</span>
      </div>

      {/* Table */}
      <table className="data-table w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-[#6B7280] uppercase tracking-wider">
            <th className="px-4 py-3 font-medium">Drug</th>
            <th className="px-4 py-3 font-medium">Dose</th>
            <th className="px-4 py-3 font-medium">Route</th>
            <th className="px-4 py-3 font-medium">Frequency</th>
            <th className="px-4 py-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#1E2333]">
          {filtered.map((med) => {
            const name = getMedicationDisplay(med);
            const dosage = med.dosageInstruction?.[0];
            const isExpanded = expandedId === med.id;

            return (
              <>
                <tr
                  key={med.id}
                  onClick={() => setExpandedId(isExpanded ? null : med.id ?? null)}
                  className="cursor-pointer hover:bg-[#1A1F2E] transition-colors duration-150"
                >
                  <td className="px-4 py-3 text-[#F1F3F7] font-medium">{name}</td>
                  <td className="px-4 py-3 text-[#9CA3AF] font-mono-data">
                    {dosage?.doseAndRate?.[0]?.doseQuantity?.value ?? "—"}
                    {dosage?.doseAndRate?.[0]?.doseQuantity?.unit ?? ""}
                  </td>
                  <td className="px-4 py-3 text-[#9CA3AF]">{dosage?.route?.text ?? "Oral"}</td>
                  <td className="px-4 py-3 text-[#9CA3AF]">{dosage?.timing?.code?.text ?? dosage?.text ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <StatusBadge status={med.status ?? "unknown"} />
                      {isExpanded
                        ? <ChevronUp className="w-3.5 h-3.5 text-[#6B7280]" />
                        : <ChevronDown className="w-3.5 h-3.5 text-[#6B7280]" />
                      }
                    </div>
                  </td>
                </tr>
                {isExpanded && (
                  <tr key={`${med.id}-expanded`} className="bg-[#0F1117]">
                    <td colSpan={5} className="px-6 py-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-[#6B7280] text-xs mb-1">Full instructions</p>
                          <p className="text-[#9CA3AF]">{dosage?.text ?? "No instructions recorded"}</p>
                        </div>
                        <div>
                          <p className="text-[#6B7280] text-xs mb-1">Prescribed</p>
                          <p className="text-[#9CA3AF]">{formatDate(med.authoredOn)}</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            );
          })}
          {filtered.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-[#6B7280]">
                No medications found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 6: Run tests — confirm pass**

```bash
pnpm vitest run src/components/panels/__tests__/
```

- [ ] **Step 7: Commit**

```bash
git add src/components/panels/AllergiesPanel.tsx src/components/panels/MedicationsPanel.tsx src/components/panels/__tests__/
git commit -m "feat: add AllergiesPanel and MedicationsPanel with tests"
```

---

## Task 11: Clinical Panels (Part 2) — Vitals, Labs, Conditions, Encounters, Procedures, Immunisations

**Files:** Remaining panel files

- [ ] **Step 1: Write `src/components/panels/VitalsPanel.tsx`**

Extract latest reading per vital-signs code from observations. Display BP, HR, SpO2, temperature, RR, weight. For each vital, show current value (large mono font) and a `<Sparkline>` of the last 7 values. Calculate NEWS2 score from latest readings using `calculateNews2Score` from `src/lib/news2.ts`. Show NEWS2 badge with color per severity.

Key implementation pattern:
```typescript
// Group observations by LOINC code, sort by effectiveDateTime descending
function groupVitals(observations: Observation[]): Record<string, Observation[]> {
  return observations.reduce((acc, obs) => {
    const code = obs.code?.coding?.[0]?.code ?? "unknown";
    acc[code] = [...(acc[code] ?? []), obs].sort(
      (a, b) => new Date(b.effectiveDateTime ?? 0).getTime() - new Date(a.effectiveDateTime ?? 0).getTime()
    );
    return acc;
  }, {} as Record<string, Observation[]>);
}
```

- [ ] **Step 2: Write `src/components/panels/LabsPanel.tsx`**

Group lab Observations by display name or LOINC code. For each test show: name, latest value + units (mono font), reference range, abnormal flag (△ H / ▽ L with appropriate colour). Show "Show history" button per test that expands a 5-row trend table.

```typescript
// Flag interpretation
function getAbnormalFlag(obs: Observation): "H" | "L" | "CH" | "CL" | null {
  const code = obs.interpretation?.[0]?.coding?.[0]?.code;
  if (code === "H") return "H";
  if (code === "L") return "L";
  if (code === "HH") return "CH";
  if (code === "LL") return "CL";
  return null;
}
```

- [ ] **Step 3: Write `src/components/panels/EncountersPanel.tsx`**

Timeline list, most recent first. Each row: encounter type (text), date range, location/ward (from `location[0].location.display`), admitting team (`participant[0]` where type is "ATND"). For inpatient encounters (class=IMP), calculate duration between `period.start` and `period.end`.

- [ ] **Step 4: Write `src/components/panels/ConditionsPanel.tsx`**

Three sections: Active | Resolved | Historical. Each condition: SNOMED display text via `getConditionDisplay`, onset date, clinical status badge. Use `getConditionDisplay` from formatters.

- [ ] **Step 5: Write `src/components/panels/ProceduresPanel.tsx`**

Table: procedure name (from `code.text` or SNOMED display), date performed, status, performer. Sort by performed date descending.

- [ ] **Step 6: Write `src/components/panels/ImmunisationsPanel.tsx`**

Table: vaccine name (`vaccineCode.text` or SNOMED display), date given (`occurrenceDateTime`), lot number, site, status. Sort by date descending.

- [ ] **Step 7: Write `src/components/panels/OverviewPanel.tsx`**

Nine summary cards in a 3-column grid. Pull values from portfolio data props. Cards: active meds count, allergy count (with high-criticality alert flag), latest BP (formatted "138/84 mmHg"), latest SpO2 (formatted "97%"), NEWS2 score (with color chip), active diagnoses count, most recent encounter date, pending procedures, immunisations count.

```typescript
interface OverviewPanelProps {
  data: ReturnType<typeof usePortfolio>;
}
```

- [ ] **Step 8: Build to check types**

```bash
pnpm build
```

Fix any TypeScript errors before committing.

- [ ] **Step 9: Commit**

```bash
git add src/components/panels/
git commit -m "feat: add all clinical panels — vitals, labs, conditions, encounters, procedures, immunisations, overview"
```

---

## Task 12: Wire App.tsx

**Files:** `src/App.tsx`

- [ ] **Step 1: Write final `src/App.tsx`**

```typescript
import { useState, lazy, Suspense } from "react";
import { usePortfolio } from "./hooks/usePortfolio";
import { useIdleTimeout } from "./hooks/useIdleTimeout";
import { useQueryClient } from "@tanstack/react-query";
import { PatientHeader } from "./components/PatientHeader";
import { TabNav } from "./components/TabNav";
import { TableSkeleton } from "./components/shared/LoadingSkeleton";
import { ErrorState } from "./components/shared/ErrorState";
import type { TabId } from "./types/fhir";

const OverviewPanel = lazy(() => import("./components/panels/OverviewPanel").then(m => ({ default: m.OverviewPanel })));
const MedicationsPanel = lazy(() => import("./components/panels/MedicationsPanel").then(m => ({ default: m.MedicationsPanel })));
const AllergiesPanel = lazy(() => import("./components/panels/AllergiesPanel").then(m => ({ default: m.AllergiesPanel })));
const VitalsPanel = lazy(() => import("./components/panels/VitalsPanel").then(m => ({ default: m.VitalsPanel })));
const LabsPanel = lazy(() => import("./components/panels/LabsPanel").then(m => ({ default: m.LabsPanel })));
const EncountersPanel = lazy(() => import("./components/panels/EncountersPanel").then(m => ({ default: m.EncountersPanel })));
const ConditionsPanel = lazy(() => import("./components/panels/ConditionsPanel").then(m => ({ default: m.ConditionsPanel })));
const ProceduresPanel = lazy(() => import("./components/panels/ProceduresPanel").then(m => ({ default: m.ProceduresPanel })));
const ImmunisationsPanel = lazy(() => import("./components/panels/ImmunisationsPanel").then(m => ({ default: m.ImmunisationsPanel })));

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const portfolio = usePortfolio();
  const queryClient = useQueryClient();

  useIdleTimeout(() => {
    queryClient.clear();
    // Show session expired message
  });

  const counts: Partial<Record<TabId, number>> = {
    medications: portfolio.medicationRequests.length,
    allergies: portfolio.allergies.length,
    conditions: portfolio.conditions.length,
    encounters: portfolio.encounters.length,
    procedures: portfolio.procedures.length,
    immunisations: portfolio.immunizations.length,
  };

  const renderPanel = () => {
    if (portfolio.isError) return <ErrorState />;
    const props = { ...portfolio };
    switch (activeTab) {
      case "overview": return <OverviewPanel data={portfolio} />;
      case "medications": return <MedicationsPanel requests={portfolio.medicationRequests} administrations={portfolio.medicationAdmins} isLoading={portfolio.isLoading} />;
      case "allergies": return <AllergiesPanel allergies={portfolio.allergies} isLoading={portfolio.isLoading} />;
      case "vitals": return <VitalsPanel vitals={portfolio.vitals} isLoading={portfolio.isLoading} />;
      case "labs": return <LabsPanel labs={portfolio.labs} isLoading={portfolio.isLoading} />;
      case "encounters": return <EncountersPanel encounters={portfolio.encounters} isLoading={portfolio.isLoading} />;
      case "conditions": return <ConditionsPanel conditions={portfolio.conditions} isLoading={portfolio.isLoading} />;
      case "procedures": return <ProceduresPanel procedures={portfolio.procedures} isLoading={portfolio.isLoading} />;
      case "immunisations": return <ImmunisationsPanel immunizations={portfolio.immunizations} isLoading={portfolio.isLoading} />;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#0F1117] overflow-hidden">
      <PatientHeader
        patient={portfolio.patient}
        allergies={portfolio.allergies}
        loading={portfolio.isLoading && !portfolio.patient}
      />
      <div className="flex flex-1 overflow-hidden">
        <TabNav
          activeTab={activeTab}
          onTabChange={setActiveTab}
          counts={counts}
        />
        <main className="flex-1 overflow-hidden transition-opacity duration-200">
          <Suspense fallback={<TableSkeleton rows={6} />}>
            {renderPanel()}
          </Suspense>
        </main>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Build and check**

```bash
pnpm build
```

Expected: Clean build with code-split chunks per panel.

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat: wire App.tsx with tab navigation, lazy-loaded panels, and idle timeout"
```

---

## Task 13: Deployment Config

**Files:** `vercel.json`, `.env.local`

- [ ] **Step 1: Write `vercel.json`**

```json
{
  "rewrites": [
    { "source": "/launch", "destination": "/public/launch.html" },
    { "source": "/(.*)", "destination": "/index.html" }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Frame-Options", "value": "ALLOWALL" },
        { "key": "Content-Security-Policy", "value": "frame-ancestors *" }
      ]
    }
  ]
}
```

- [ ] **Step 2: Create `.env.local`** (not committed)

```
VITE_CLIENT_ID=<your_cerner_client_id>
VITE_CERNER_ISS=https://fhir-ehr-code.cerner.com/r4/ec2458f2-1e24-41c8-b71b-0e701af7583d
```

- [ ] **Step 3: Final build verification**

```bash
pnpm build
pnpm vitest run
```

Expected: All tests pass, build succeeds.

- [ ] **Step 4: Commit**

```bash
git add vercel.json .env.example
git commit -m "feat: add Vercel deployment config with iframe headers"
```

---

## Task 14: Final Verification

- [ ] **Step 1: Run full test suite**

```bash
pnpm vitest run --reporter=verbose
```

Expected: All tests pass.

- [ ] **Step 2: TypeScript strict check**

```bash
pnpm tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Verify build output**

```bash
pnpm build
ls -la dist/
```

Expected: `dist/index.html`, `dist/assets/`, and launch entry point present.

- [ ] **Step 4: Manual smoke test with Cerner open endpoint**

Open browser console and verify these FHIR requests return data (no auth needed for open endpoint):

```
https://fhir-open.cerner.com/r4/ec2458f2-1e24-41c8-b71b-0e701af7583d/Patient/12742400
https://fhir-open.cerner.com/r4/ec2458f2-1e24-41c8-b71b-0e701af7583d/MedicationRequest?patient=12742400&status=active
```

- [ ] **Step 5: Deploy to Vercel**

```bash
vercel --prod
```

Expected: App deployed at a public HTTPS URL.

- [ ] **Step 6: Test SMART launch from Cerner code Console**

1. Go to `https://code.cerner.com/developer/smart-on-fhir/apps`
2. Open registered app → click **Begin Testing**
3. Select sandbox patient 12742400
4. Click Launch — verify full OAuth flow completes and portfolio loads

---

## Testing Strategy Summary

| Layer | What to test | Tool |
|-------|-------------|------|
| Pure lib (formatters, pagination, news2) | Unit tests with direct function calls | Vitest |
| React components | Render with fixture data, test visible output | Testing Library |
| FHIR auth flow | Manual test via Cerner code Console sandbox | Manual |
| Full integration | Deploy to Vercel, launch from code Console | Manual |

> **Note:** Do not mock `fhirclient` in unit tests. Components that need the FHIR context are tested by passing pre-fetched fixture data as props, keeping components pure and testable without an OAuth session.
