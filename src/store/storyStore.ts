import { create } from 'zustand'
import { invoke } from '@tauri-apps/api/core'
import { listen, UnlistenFn } from '@tauri-apps/api/event'
import { logError } from '@/utils/logger'

export interface StoryContextType {
    title: string;
    summary?: string;
    description?: string;
}

interface StoryState {
    story: StoryContextType | null;
    isLoading: boolean;
    error: string | null;

    // Actions
    fetchStory: () => Promise<void>;
    setStory: (story: StoryContextType | null) => void;
    setLoading: (isLoading: boolean) => void;
    setError: (error: string | null) => void;
    setupListener: () => Promise<() => void>;
}

export const useStoryStore = create<StoryState>()((set, get) => ({
    story: null,
    isLoading: false,
    error: null,

    fetchStory: async () => {
        set({ isLoading: true, error: null });
        try {
            const storyData = await invoke<StoryContextType>('get_story');
            set({ story: storyData, isLoading: false });
        } catch (error) {
            const errorMessage = `Failed to fetch story: ${error}`;
            logError(errorMessage);
            set({ error: errorMessage, isLoading: false });
        }
    },

    setStory: (story) => set({ story }),

    setLoading: (isLoading) => set({ isLoading }),

    setError: (error) => set({ error }),

    setupListener: async () => {
        let unlisten: UnlistenFn | null = null;

        try {
            unlisten = await listen<StoryContextType>(
                'file-changed',
                async () => {
                    await get().fetchStory();
                },
            );
        } catch (error) {
            logError(`Failed to setup story listener: ${error}`);
        }

        return () => {
            if (unlisten) {
                unlisten();
            }
        };
    },
})) 