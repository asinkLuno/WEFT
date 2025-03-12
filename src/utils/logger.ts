import { toast } from 'sonner';
import { info, error, warn, trace, debug } from '@tauri-apps/plugin-log';

type LogLevel = 'success' | 'error' | 'info' | 'warning' | 'debug' | 'trace';

/**
 * Logs a message both to the UI via toast and to Tauri's logger system
 * @param message The message to display and log
 * @param level The log level to use
 * @param duration Optional toast duration in ms
 */
export function logMessage(
    message: string,
    level: LogLevel = 'info',
    duration?: number,
) {
    // Map toast level to appropriate Tauri log function
    switch (level) {
        case 'success':
            toast.success(message, { duration });
            info(message); // Log successes as info in Tauri logs
            break;
        case 'error':
            toast.error(message, { duration });
            error(message);
            break;
        case 'warning':
            toast.warning(message, { duration });
            warn(message);
            break;
        case 'info':
            toast.info(message, { duration });
            info(message);
            break;
        case 'debug':
            toast(message, { duration }); // Regular toast for debug
            debug(message);
            break;
        case 'trace':
            toast(message, { duration }); // Regular toast for trace
            trace(message);
            break;
        default:
            toast(message, { duration });
            info(message);
    }
}

// Convenience methods
export const logSuccess = (message: string, duration?: number) =>
    logMessage(message, 'success', duration);

export const logError = (message: string, duration?: number) =>
    logMessage(message, 'error', duration);

export const logInfo = (message: string, duration?: number) =>
    logMessage(message, 'info', duration);

export const logWarning = (message: string, duration?: number) =>
    logMessage(message, 'warning', duration);
