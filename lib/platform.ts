import {
  emit as tauriEmit,
  listen as tauriListen,
  type UnlistenFn,
} from "@tauri-apps/api/event";
import { invoke as tauriInvoke } from "@tauri-apps/api/core";
import { openUrl as tauriOpenUrl } from "@tauri-apps/plugin-opener";

export interface PlatformEvent<T> {
  payload: T;
}

export interface PlatformAdapter {
  invoke<T>(command: string, args?: Record<string, unknown>): Promise<T>;
  listen<T>(
    event: string,
    handler: (event: PlatformEvent<T>) => void,
  ): Promise<UnlistenFn>;
  emit(event: string, payload?: unknown): Promise<void>;
  openUrl(url: string): Promise<void>;
}

const tauriAdapter: PlatformAdapter = {
  invoke: (command, args) => tauriInvoke(command, args),
  listen: (event, handler) => tauriListen(event, handler),
  emit: (event, payload) => tauriEmit(event, payload),
  openUrl: (url) => tauriOpenUrl(url),
};

const injectedAdapter = (
  globalThis as typeof globalThis & {
    __WEFT_PLATFORM_ADAPTER__?: PlatformAdapter;
  }
).__WEFT_PLATFORM_ADAPTER__;

let adapter = injectedAdapter ?? tauriAdapter;

export const invoke = <T>(
  command: string,
  args?: Record<string, unknown>,
): Promise<T> => adapter.invoke<T>(command, args);

export const listen = <T>(
  event: string,
  handler: (event: PlatformEvent<T>) => void,
): Promise<UnlistenFn> => adapter.listen(event, handler);

export const emit = (event: string, payload?: unknown): Promise<void> =>
  adapter.emit(event, payload);

export const openUrl = (url: string): Promise<void> => adapter.openUrl(url);

/** Replace native integrations in unit tests without emulating a Tauri runtime. */
export function setPlatformAdapterForTests(next: PlatformAdapter): () => void {
  const previous = adapter;
  adapter = next;
  return () => {
    adapter = previous;
  };
}
