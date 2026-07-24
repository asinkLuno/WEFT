import { pyInvoke } from "tauri-plugin-pytauri-api";
import type { components } from "./schema";

// Domain types generated from the Pydantic models.
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

export interface WeftError {
  code: string;
  stage: string;
  message: string;
  source?: string;
  path?: Array<string | number>;
  path_display?: string;
  line?: number;
  column?: number;
  hint?: string;
  details?: Record<string, unknown>;
}

const queryCache = new Map<string, Promise<unknown>>();

function cachedInvoke<T>(command: string): Promise<T> {
  const cached = queryCache.get(command);
  if (cached) return cached as Promise<T>;

  const request = pyInvoke<T>(command).catch((error) => {
    queryCache.delete(command);
    throw error;
  });
  queryCache.set(command, request);
  return request;
}

export const getStory = () => cachedInvoke<Story>("get_story");
export const getMoais = () => cachedInvoke<MoaiMap>("get_moai");
export const getDrifts = () => cachedInvoke<DriftMap>("get_drift");
export const getNarratives = () => cachedInvoke<NarrativeMap>("get_narrative");
export const getMoaiLinks = () => cachedInvoke<LinkGraph>("get_moai_link");
export const getLoadError = () => pyInvoke<WeftError | null>("get_load_error");
export const openStory = () => pyInvoke<string | null>("open_story");
