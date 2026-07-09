import type { components } from "./schema";

export const BACKEND = process.env.BACKEND_URL ?? "http://127.0.0.1:8001";

// Backend domain types, generated from FastAPI's OpenAPI schema.
// Run `npm run gen:types` after changing backend models.
type Schemas = components["schemas"];
export type Moai = Schemas["Moai"];
export type Drift = Schemas["Drift"];
export type Story = Schemas["Story"];
export type GraphNode = Schemas["GraphNode"];
export type GraphLink = Schemas["GraphLink"];
export type LinkGraph = Schemas["LinkGraph"];

export type MoaiMap = Record<string, Moai>;
export type DriftMap = Record<string, Drift[]>;

/** Fetch JSON from the backend with the no-cache policy every page uses. */
export async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BACKEND}${path}`, { next: { revalidate: 0 } });
  if (!res.ok) throw new Error(`${path} returned ${res.status}`);
  return res.json() as Promise<T>;
}
