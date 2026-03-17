import { create } from 'zustand';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import { logError } from '@/utils/logger';
import * as api from '@/api';
import type { StoryContextType, MoaiListContextType, MoaiLinkListContextType } from '@/api';
import { CateFlowContextType } from '@/types/flow';

// Story state
interface StoryState {
    story: StoryContextType | null;
    isLoading: boolean;
    error: string | null;
    fetchStory: () => Promise<void>;
    setStory: (story: StoryContextType | null) => void;
}

// Moai state
interface MoaiState {
    moaiList: MoaiListContextType;
    moaiFullNames: Record<string, string>;
    isLoading: boolean;
    error: string | null;
    fetchMoaiList: () => Promise<void>;
    setMoaiList: (moaiList: MoaiListContextType) => void;
}

// MoaiLink state
interface MoaiLinkState {
    linkList: MoaiLinkListContextType;
    isLoading: boolean;
    error: string | null;
    fetchLinkList: () => Promise<void>;
    setLinkList: (linkList: MoaiLinkListContextType) => void;
}

// Flow states
interface FlowState {
    driftFlow: CateFlowContextType;
    moaiFlow: CateFlowContextType;
    moaiNames: Record<string, string>;
    narrativeFlow: CateFlowContextType;
    isLoading: boolean;
    error: string | null;
    fetchDriftFlow: () => Promise<void>;
    fetchMoaiFlow: () => Promise<void>;
    fetchNarrativeFlow: () => Promise<void>;
    setDriftFlow: (flow: CateFlowContextType) => void;
    setMoaiFlow: (flow: CateFlowContextType) => void;
    setNarrativeFlow: (flow: CateFlowContextType) => void;
}

// Combined store type
interface DataStore extends StoryState, MoaiState, MoaiLinkState, FlowState {
    // Global listener setup
    setupFileListener: () => Promise<() => void>;
    cleanupFileListener: () => void;
}

const loadAllMoaiFullNames = async (moaiList: MoaiListContextType): Promise<Record<string, string>> => {
    try {
        const moaiEntries = Object.entries(moaiList);
        const fullNames = await Promise.all(
            moaiEntries.map(async ([id]) => ({
                id,
                fullName: await api.getMoaiFullName(id),
            })),
        );
        return Object.fromEntries(
            fullNames.map(({ id, fullName }) => [id, fullName]),
        );
    } catch (error) {
        logError(`Failed to load all Moai full names: ${error}`);
        return Object.fromEntries(Object.keys(moaiList).map((id) => [id, id]));
    }
};

const loadMoaiFlowNames = async (flowData: CateFlowContextType): Promise<Record<string, string>> => {
    try {
        const names = await Promise.all(
            Object.keys(flowData).map(async (category) => ({
                id: category,
                name: await api.getMoaiFullName(category),
            })),
        );
        return Object.fromEntries(names.map((item) => [item.id, item.name]));
    } catch (error) {
        logError(`Failed to load Moai flow names: ${error}`);
        return {};
    }
};

export const useDataStore = create<DataStore>((set, get) => ({
    // Initial story state
    story: null,
    isLoading: false,
    error: null,

    // Initial moai state
    moaiList: {},
    moaiFullNames: {},

    // Initial moaiLink state
    linkList: {},

    // Initial flow state
    driftFlow: {},
    moaiFlow: {},
    moaiNames: {},
    narrativeFlow: {},

    // Story actions
    fetchStory: async () => {
        set({ isLoading: true, error: null });
        try {
            const storyData = await api.getStory();
            set({ story: storyData, isLoading: false });
        } catch (error) {
            const errorMessage = `Failed to fetch story: ${error}`;
            logError(errorMessage);
            set({ error: errorMessage, isLoading: false });
        }
    },

    setStory: (story) => set({ story }),

    // Moai actions
    fetchMoaiList: async () => {
        set({ isLoading: true, error: null });
        try {
            const moaiListData = await api.getAllMoais();
            set({ moaiList: moaiListData });
            const fullNames = await loadAllMoaiFullNames(moaiListData);
            set({ moaiFullNames: fullNames, isLoading: false });
        } catch (error) {
            const errorMessage = `Failed to fetch moai list: ${error}`;
            logError(errorMessage);
            set({ error: errorMessage, isLoading: false });
        }
    },

    setMoaiList: (moaiList) => set({ moaiList }),

    // MoaiLink actions
    fetchLinkList: async () => {
        set({ isLoading: true, error: null });
        try {
            const result = await api.getAllMoaiLinks();
            set({ linkList: result, isLoading: false });
        } catch (error) {
            const errorMessage = `Failed to fetch moai link list: ${error}`;
            logError(errorMessage);
            set({ error: errorMessage, isLoading: false });
        }
    },

    setLinkList: (linkList) => set({ linkList }),

    // Flow actions
    fetchDriftFlow: async () => {
        set({ isLoading: true, error: null });
        try {
            const result = await api.getDriftFlow();
            set({ driftFlow: result, isLoading: false });
        } catch (error) {
            const errorMessage = `Failed to fetch drift flow list: ${error}`;
            logError(errorMessage);
            set({ error: errorMessage, isLoading: false });
        }
    },

    fetchMoaiFlow: async () => {
        set({ isLoading: true, error: null });
        try {
            const result = await api.getMoaiFlow();
            set({ moaiFlow: result });
            const names = await loadMoaiFlowNames(result);
            set({ moaiNames: names, isLoading: false });
        } catch (error) {
            const errorMessage = `Failed to fetch moai flow list: ${error}`;
            logError(errorMessage);
            set({ error: errorMessage, isLoading: false });
        }
    },

    fetchNarrativeFlow: async () => {
        set({ isLoading: true, error: null });
        try {
            const result = await api.getNarrativeFlow();
            set({ narrativeFlow: result, isLoading: false });
        } catch (error) {
            const errorMessage = `Failed to fetch narrative flow list: ${error}`;
            logError(errorMessage);
            set({ error: errorMessage, isLoading: false });
        }
    },

    setDriftFlow: (driftFlow) => set({ driftFlow }),
    setMoaiFlow: (moaiFlow) => set({ moaiFlow }),
    setNarrativeFlow: (narrativeFlow) => set({ narrativeFlow }),

    // Global file listener
    cleanupFileListener: () => {},

    setupFileListener: async () => {
        let unlisten: UnlistenFn | null = null;

        try {
            unlisten = await listen('file-changed', async () => {
                // Refresh all data when file changes
                const state = get();
                await Promise.all([
                    state.fetchStory(),
                    state.fetchMoaiList(),
                    state.fetchLinkList(),
                    state.fetchDriftFlow(),
                    state.fetchMoaiFlow(),
                    state.fetchNarrativeFlow(),
                ]);
            });
        } catch (error) {
            logError(`Failed to setup file listener: ${error}`);
        }

        // Store cleanup function
        const cleanup = () => {
            if (unlisten) {
                unlisten();
            }
        };

        // Override the cleanup function
        set({ cleanupFileListener: cleanup } as Partial<DataStore>);

        return cleanup;
    },
}));
