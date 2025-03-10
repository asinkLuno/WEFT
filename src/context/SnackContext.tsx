import React, { createContext, useContext } from 'react';
import { toast, Toaster } from 'sonner';
import { info, warn, error } from '@tauri-apps/plugin-log';

// Define a custom type to replace AlertColor from MUI
export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'default';

interface ISnackbarContext {
    showMessage: (message: string, severity?: ToastType) => void;
}

const SnackbarContext = createContext<ISnackbarContext>({
    showMessage: () => {},
});

interface SnackbarProviderProps {
    children: React.ReactNode;
}

export function SnackbarProvider({ children }: SnackbarProviderProps) {
    /**
     * External function for showing messages + logging
     */
    const showMessage = (msg: string, level: ToastType = 'success') => {
        // 1. Show toast notification using Sonner
        switch (level) {
            case 'error':
                toast.error(msg);
                error(msg);
                break;
            case 'warning':
                toast.warning(msg);
                warn(msg);
                break;
            case 'info':
                toast.info(msg);
                info(msg);
                break;
            case 'success':
                toast.success(msg);
                info(msg);
                break;
            default:
                toast(msg);
                info(msg);
        }
    };

    return (
        <SnackbarContext.Provider value={{ showMessage }}>
            {children}
            
            {/* Sonner Toaster component with shadcn-compatible styling */}
            <Toaster 
                position="top-center"
                toastOptions={{
                    duration: 3000,
                    className: "text-foreground",
                    style: {
                        background: 'var(--background)',
                        color: 'var(--foreground)',
                        border: '1px solid var(--border)',
                    }
                }}
            />
        </SnackbarContext.Provider>
    );
}

/**
 * Hook for external components to use showMessage
 */
export function useSnackbar() {
    return useContext(SnackbarContext);
}
