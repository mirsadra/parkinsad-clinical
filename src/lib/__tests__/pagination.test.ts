import { describe, it, expect } from "vitest";
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
