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
