import { create } from 'zustand'
import { invoke } from '@tauri-apps/api/core'
import { listen, UnlistenFn } from '@tauri-apps/api/event'
import { logError } from '@/utils/logger'
import { CateFlowContextType, processFlowData } from '../types/flow'

interface MoaiFlowState {
    flowList: CateFlowContextType;
    moaiNames: Record<string, string>;
    isLoading: boolean;
    error: string | null;

    // Actions
    fetchFlowList: () => Promise<void>;
    setFlowList: (flowList: CateFlowContextType) => void;
    setMoaiNames: (names: Record<string, string>) => void;
    setLoading: (isLoading: boolean) => void;
    setError: (error: string | null) => void;
    setupListener: () => Promise<() => void>;
}

export const useMoaiFlowStore = create<MoaiFlowState>()((set, get) => ({
    flowList: {},
    moaiNames: {},
    isLoading: false,
    error: null,

    fetchFlowList: async () => {
        set({ isLoading: true, error: null });
        try {
            const result = await invoke<CateFlowContextType>('moai_flow');
            const processedData = processFlowData(result);
            set({ flowList: processedData, isLoading: false });

            // 获取Moai名称
            const names = await Promise.all(
                Object.keys(processedData).map(async (category) => ({
                    id: category,
                    name: await invoke<string>('get_moai_full_name', {
                        id: category,
                    }),
                })),
            );

            set({
                moaiNames: Object.fromEntries(
                    names.map((item) => [item.id, item.name])
                )
            });
        } catch (error) {
            const errorMessage = `Failed to fetch moai flow list: ${error}`;
            logError(errorMessage);
            set({ error: errorMessage, isLoading: false });
        }
    },

    setFlowList: (flowList) => set({ flowList }),

    setMoaiNames: (names) => set({ moaiNames: names }),

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
            logError(`Failed to setup moai flow listener: ${error}`);
        }

        return () => {
            if (unlisten) {
                unlisten();
            }
        };
    },
})) 