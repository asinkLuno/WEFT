import type { components } from "./schema";
import { invoke } from "./platform";

// Domain types generated from the Pydantic models.
type Schemas = components["schemas"];
export type Moai = Schemas["Moai"];
export type Drift = Schemas["Drift"];
export type Narrative = Schemas["Narrative"];
export type Story = Schemas["Story"];
export type CalendarMetadata = Schemas["CalendarMetadata"];
export type GraphNode = Schemas["GraphNode"];
export type GraphLink = Schemas["GraphLink"];
export type LinkGraph = Schemas["LinkGraph"];

export type MoaiMap = Record<string, Moai>;
export type DriftMap = Record<string, Drift[]>;
export type NarrativeMap = Record<string, Narrative>;

export interface WeftError {
  code: string;
  stage: string;
  source?: string;
  path?: Array<string | number>;
  path_display?: string;
  line?: number;
  column?: number;
  hint?: string;
  details?: Record<string, unknown>;
}

export interface OpenedStory {
  title: string;
  path: string;
}

export interface AppStateInfo {
  story_path: string | null;
  story_title: string | null;
  last_reload_at: string | null;
}

export interface ReloadResult {
  story_title: string | null;
  last_reload_at: string | null;
}

export function formatWeftError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "code" in error) {
    return String(error.code);
  }
  return String(error);
}

const queryCache = new Map<string, Promise<unknown>>();
const refetchListeners = new Set<() => void>();

function cachedInvoke<T>(command: string): Promise<T> {
  const cached = queryCache.get(command);
  if (cached) return cached as Promise<T>;

  const request = invoke<T>(command).catch((error) => {
    queryCache.delete(command);
    throw error;
  });
  queryCache.set(command, request);
  return request;
}

/** Subscribe to data-invalidation ticks. Returns an unsubscribe function. */
export function onRefetch(listener: () => void): () => void {
  refetchListeners.add(listener);
  return () => refetchListeners.delete(listener);
}

/** Drop the response cache and notify every subscriber to reload. */
export function triggerRefetch(): void {
  queryCache.clear();
  for (const listener of refetchListeners) listener();
}

export const getStory = () => cachedInvoke<Story>("get_story");
export const getCalendarMetadata = () =>
  cachedInvoke<CalendarMetadata>("get_calendar_metadata");
export const hasLoadedStory = () => invoke<boolean>("has_story");
export const getMoais = () => cachedInvoke<MoaiMap>("get_moai");
export const getDrifts = () => cachedInvoke<DriftMap>("get_drift");
export const getNarratives = () => cachedInvoke<NarrativeMap>("get_narrative");
export const getMoaiLinks = () => cachedInvoke<LinkGraph>("get_moai_link");
export const getLoadError = () => invoke<WeftError | null>("get_load_error");
export const openStory = () => invoke<OpenedStory | null>("open_story");
export const openRecentStory = (path: string) =>
  invoke<OpenedStory>("open_recent_story", { path });
export const closeStory = () => invoke<void>("close_story");
export const reloadStory = () => invoke<ReloadResult>("reload_story");
export const getAppState = () => invoke<AppStateInfo>("get_app_state");
