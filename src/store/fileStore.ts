import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface FileState {
    filePath: string | undefined
    setFilePath: (path: string | undefined) => void
}

export const useFileStore = create<FileState>()(
    persist(
        (set) => ({
            filePath: undefined,
            setFilePath: (path) => set({ filePath: path }),
        }),
        {
            name: 'file-storage',
        }
    )
) 