import { invoke } from '@tauri-apps/api/core';
import { logError } from '@/utils/logger';
import { CateFlowContextType, processFlowData } from '@/types/flow';

// Type definitions - inline to avoid dependency on deleted store files
export interface StoryContextType {
    title: string;
    summary?: string;
    description?: string;
}

export interface MoaiContextType {
    full_name?: string;
    base_time?: {
        base_time_name?: string;
        absolute_time: number[];
    };
    description?: string;
    [key: string]: any;
}

export type MoaiListContextType = { [key: string]: MoaiContextType };

export interface MoaiLinkNode {
    id: string;
    text: string;
    nodeShape?: number;
}

export interface MoaiLinkLine {
    from: string;
    to: string;
    relations?: string;
    bidirectional: boolean;
}

export interface MoaiLinkContextType {
    moai_nodes: MoaiLinkNode[];
    moai_links: MoaiLinkLine[];
}

export type MoaiLinkListContextType = { [key: string]: MoaiLinkContextType };

// Re-export types
export type { CateFlowContextType, FlowContextType, PhaseContextType } from '@/types/flow';

// Watch file
export async function watchFile(filePath: string): Promise<void> {
    try {
        await invoke('watch_file', { filePath });
    } catch (error) {
        logError(`Failed to watch file: ${error}`);
        throw error;
    }
}

// Get story
export async function getStory(): Promise<StoryContextType> {
    try {
        return await invoke<StoryContextType>('get_story');
    } catch (error) {
        logError(`Failed to get story: ${error}`);
        throw error;
    }
}

// Get all moais
export async function getAllMoais(): Promise<MoaiListContextType> {
    try {
        return await invoke<MoaiListContextType>('get_all_moais');
    } catch (error) {
        logError(`Failed to get all moais: ${error}`);
        throw error;
    }
}

// Get all moai links
export async function getAllMoaiLinks(): Promise<MoaiLinkListContextType> {
    try {
        return await invoke<MoaiLinkListContextType>('get_all_moai_links');
    } catch (error) {
        logError(`Failed to get all moai links: ${error}`);
        throw error;
    }
}

// Get moai full name
export async function getMoaiFullName(id: string): Promise<string> {
    try {
        return await invoke<string>('get_moai_full_name', { id });
    } catch (error) {
        logError(`Failed to get moai full name: ${error}`);
        return id;
    }
}

// Get drift flow
export async function getDriftFlow(): Promise<CateFlowContextType> {
    try {
        const result = await invoke<CateFlowContextType>('drift_flow');
        return processFlowData(result);
    } catch (error) {
        logError(`Failed to get drift flow: ${error}`);
        throw error;
    }
}

// Get moai flow
export async function getMoaiFlow(): Promise<CateFlowContextType> {
    try {
        const result = await invoke<CateFlowContextType>('moai_flow');
        return processFlowData(result);
    } catch (error) {
        logError(`Failed to get moai flow: ${error}`);
        throw error;
    }
}

// Get narrative flow
export async function getNarrativeFlow(): Promise<CateFlowContextType> {
    try {
        const result = await invoke<CateFlowContextType>('narrative_flow');
        return processFlowData(result);
    } catch (error) {
        logError(`Failed to get narrative flow: ${error}`);
        throw error;
    }
}
