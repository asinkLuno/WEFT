import { create } from 'zustand'
import { listen, UnlistenFn } from '@tauri-apps/api/event'
import { logError } from '@/utils/logger'

interface TabsState {
    activeTab: number;
    searchQuery: string;
    isListening: boolean;
    error: string | null;

    // Actions
    setActiveTab: (index: number) => void;
    setSearchQuery: (query: string) => void;
    setupListeners: () => Promise<() => void>;
    setError: (error: string | null) => void;
}

export const useTabsStore = create<TabsState>()((set, get) => ({
    activeTab: 0,
    searchQuery: '',
    isListening: false,
    error: null,

    setActiveTab: (index) => set({ activeTab: index }),

    setSearchQuery: (query) => set({ searchQuery: query }),

    setError: (error) => set({ error }),

    setupListeners: async () => {
        // 如果已经在监听中，就返回一个空的清理函数
        if (get().isListening) {
            return () => { };
        }

        let unlistenStop: UnlistenFn | null = null;
        let unlistenDaoFailed: UnlistenFn | null = null;

        try {
            set({ isListening: true });

            unlistenStop = await listen('stop-watching', () => {
                // 这个处理需要由使用该store的组件来实现，这里只是记录事件发生
                set({ isListening: false });
            });

            unlistenDaoFailed = await listen('dao-update-failed', (event) => {
                const errorMsg = `文件更新失败: ${event.payload}`;
                logError(errorMsg);
                set({ error: errorMsg });
            });

        } catch (error) {
            const errorMsg = `Failed to setup listeners: ${error}`;
            logError(errorMsg);
            set({ error: errorMsg, isListening: false });
        }

        // 返回清理函数
        return () => {
            if (unlistenStop) {
                unlistenStop();
            }

            if (unlistenDaoFailed) {
                unlistenDaoFailed();
            }

            set({ isListening: false });
        };
    },
})) 