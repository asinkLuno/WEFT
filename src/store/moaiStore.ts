import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { invoke } from '@tauri-apps/api/core'
import { listen, UnlistenFn } from '@tauri-apps/api/event'
import { logError } from '@/utils/logger'
import { PhaseContextType, SupportedLocale } from '../types/flow'

export interface MoaiContextType {
    full_name?: string;
    base_time?: PhaseContextType;
    description?: string;
    [key: string]: any; // 用于 extra_props 的动态属性
}

export type MoaiListContextType = { [key: string]: MoaiContextType };

interface MoaiState {
    moaiList: MoaiListContextType;
    moaiFullNames: Record<string, string>;
    isLoading: boolean;
    error: string | null;

    // Actions
    fetchMoaiList: () => Promise<void>;
    setMoaiList: (moaiList: MoaiListContextType) => void;
    setMoaiFullNames: (fullNames: Record<string, string>) => void;
    setLoading: (isLoading: boolean) => void;
    setError: (error: string | null) => void;
    setupListener: () => Promise<() => void>;
}

const loadAllMoaiFullNames = async (moaiList: MoaiListContextType) => {
    try {
        const moaiEntries = Object.entries(moaiList);
        const fullNames = await Promise.all(
            moaiEntries.map(async ([id]) => ({
                id,
                fullName: await invoke<string>('get_moai_full_name', { id }),
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

export const useMoaiStore = create<MoaiState>()((set, get) => ({
    moaiList: {},
    moaiFullNames: {},
    isLoading: false,
    error: null,

    fetchMoaiList: async () => {
        set({ isLoading: true, error: null });
        try {
            const moaiListData = await invoke<MoaiListContextType>('get_all_moais');
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

    setMoaiFullNames: (fullNames) => set({ moaiFullNames: fullNames }),

    setLoading: (isLoading) => set({ isLoading }),

    setError: (error) => set({ error }),

    setupListener: async () => {
        let unlisten: UnlistenFn | null = null;

        try {
            unlisten = await listen<MoaiListContextType>(
                'file-changed',
                async () => {
                    await get().fetchMoaiList();
                },
            );
        } catch (error) {
            logError(`Failed to setup moai listener: ${error}`);
        }

        return () => {
            if (unlisten) {
                unlisten();
            }
        };
    },
})) 