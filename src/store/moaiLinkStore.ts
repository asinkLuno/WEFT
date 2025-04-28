import { create } from 'zustand'
import { invoke } from '@tauri-apps/api/core'
import { listen, UnlistenFn } from '@tauri-apps/api/event'
import { logError } from '@/utils/logger'

interface MoaiLinkNode {
    id: string;
    text: string;
    nodeShape?: number;
}

interface MoaiLinkLine {
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

interface MoaiLinkState {
    linkList: MoaiLinkListContextType;
    isLoading: boolean;
    error: string | null;

    // Actions
    fetchLinkList: () => Promise<void>;
    setLinkList: (linkList: MoaiLinkListContextType) => void;
    setLoading: (isLoading: boolean) => void;
    setError: (error: string | null) => void;
    setupListener: () => Promise<() => void>;
}

export const useMoaiLinkStore = create<MoaiLinkState>()((set, get) => ({
    linkList: {},
    isLoading: false,
    error: null,

    fetchLinkList: async () => {
        set({ isLoading: true, error: null });
        try {
            const result = await invoke<MoaiLinkListContextType>('get_all_moai_links');
            set({ linkList: result, isLoading: false });
        } catch (error) {
            const errorMessage = `Failed to fetch moai link list: ${error}`;
            logError(errorMessage);
            set({ error: errorMessage, isLoading: false });
        }
    },

    setLinkList: (linkList) => set({ linkList }),

    setLoading: (isLoading) => set({ isLoading }),

    setError: (error) => set({ error }),

    setupListener: async () => {
        let unlisten: UnlistenFn | null = null;

        try {
            unlisten = await listen<MoaiLinkListContextType>(
                'file-changed',
                async () => {
                    await get().fetchLinkList();
                },
            );
        } catch (error) {
            logError(`Failed to setup moai link listener: ${error}`);
        }

        return () => {
            if (unlisten) {
                unlisten();
            }
        };
    },
})) 