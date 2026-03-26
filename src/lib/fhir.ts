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
