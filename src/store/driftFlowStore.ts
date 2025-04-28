import { create } from 'zustand'
import { invoke } from '@tauri-apps/api/core'
import { listen, UnlistenFn } from '@tauri-apps/api/event'
import { logError } from '@/utils/logger'
import { CateFlowContextType, processFlowData } from '../types/flow'

interface DriftFlowState {
    flowList: CateFlowContextType;
    isLoading: boolean;
    error: string | null;

    // Actions
    fetchFlowList: () => Promise<void>;
    setFlowList: (flowList: CateFlowContextType) => void;
    setLoading: (isLoading: boolean) => void;
    setError: (error: string | null) => void;
    setupListener: () => Promise<() => void>;
}

export const useDriftFlowStore = create<DriftFlowState>()((set, get) => ({
    flowList: {},
    isLoading: false,
    error: null,

    fetchFlowList: async () => {
        set({ isLoading: true, error: null });
        try {
            const result = await invoke<CateFlowContextType>('drift_flow');
            const processedData = processFlowData(result);
            set({ flowList: processedData, isLoading: false });
        } catch (error) {
            const errorMessage = `Failed to fetch drift flow list: ${error}`;
            logError(errorMessage);
            set({ error: errorMessage, isLoading: false });
        }
    },

    setFlowList: (flowList) => set({ flowList }),

    setLoading: (isLoading) => set({ isLoading }),

    setError: (error) => set({ error }),

    setupListener: async () => {
        let unlisten: UnlistenFn | null = null;

        try {
            unlisten = await listen<CateFlowContextType>(
                'file-changed',
                async () => {
                    await get().fetchFlowList();
                },
            );
        } catch (error) {
            logError(`Failed to setup drift flow listener: ${error}`);
        }

        return () => {
            if (unlisten) {
                unlisten();
            }
        };
    },
})) 