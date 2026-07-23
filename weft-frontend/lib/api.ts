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

export const getStory = () => pyInvoke<Story>("get_story");
export const getMoais = () => pyInvoke<MoaiMap>("get_moai");
export const getDrifts = () => pyInvoke<DriftMap>("get_drift");
export const getNarratives = () => pyInvoke<NarrativeMap>("get_narrative");
export const getMoaiLinks = () => pyInvoke<LinkGraph>("get_moai_link");
export const openStory = () => pyInvoke<string | null>("open_story");
