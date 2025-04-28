import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SettingsState {
    locale: string
    recentFiles: string[]
    setLocale: (locale: string) => void
    addRecentFile: (filePath: string) => void
    clearRecentFiles: () => void
}

export const useSettingsStore = create<SettingsState>()(
    persist(
        (set) => ({
            locale: 'en-US',
            recentFiles: [],
            setLocale: (locale) => set({ locale }),
            addRecentFile: (filePath) => set((state) => {
                // Create a new array with the current file at the beginning
                const updatedRecentFiles = [
                    filePath,
                    ...state.recentFiles.filter((path) => path !== filePath)
                ].slice(0, 3) // Keep only the 3 most recent files

                return { recentFiles: updatedRecentFiles }
            }),
            clearRecentFiles: () => set({ recentFiles: [] })
        }),
        {
            name: 'settings-storage',
        }
    )
) 