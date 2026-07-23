import { pyInvoke } from "tauri-plugin-pytauri-api";
import type { components } from "./schema";

// Backend domain types (generated from the pydantic models). Run the type-gen
// step after changing backend models.
type Schemas = components["schemas"];
export type Moai = Schemas["Moai"];
export type Drift = Schemas["Drift"];
export type Narrative = Schemas["Narrative"];
export type Story = Schemas["Story"];
export type GraphNode = Schemas["GraphNode"];
export type GraphLink = Schemas["GraphLink"];
export type LinkGraph = Schemas["LinkGraph"];

export type MoaiMap = Record<string, Moai>;
export type DriftMap = Record<string, Drift[]>;
export type NarrativeMap = Record<string, Narrative>;

// Old REST path → pytauri command name. Kept so call sites stay unchanged.
const PATH_TO_COMMAND: Record<string, string> = {
  "/story": "get_story",
  "/moai": "get_moai",
  "/drift": "get_drift",
  "/narrative": "get_narrative",
  "/moai-link": "get_moai_link",
};

/** Invoke the backend command mapped from `path` (pyInvoke, client-side only). */
export async function fetchJson<T>(path: string): Promise<T> {
  const command = PATH_TO_COMMAND[path];
  if (!command) throw new Error(`no command mapped for path: ${path}`);
  return pyInvoke<T>(command);
}
