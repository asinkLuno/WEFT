import { vi } from "vitest";
import type { PlatformAdapter, PlatformEvent } from "@/lib/platform";

type Handler = (event: PlatformEvent<unknown>) => void;

export function createPlatformMock(
  responses: Record<string, unknown> = {},
): PlatformAdapter & {
  dispatch<T>(event: string, payload: T): void;
} {
  const handlers = new Map<string, Set<Handler>>();

  return {
    invoke: vi.fn(
      async (command: string) => responses[command],
    ) as PlatformAdapter["invoke"],
    listen: vi.fn(async (event: string, handler: Handler) => {
      const listeners = handlers.get(event) ?? new Set();
      listeners.add(handler);
      handlers.set(event, listeners);
      return () => listeners.delete(handler);
    }) as PlatformAdapter["listen"],
    emit: vi.fn(async () => undefined),
    openUrl: vi.fn(async () => undefined),
    dispatch<T>(event: string, payload: T) {
      handlers.get(event)?.forEach((handler) => handler({ payload }));
    },
  };
}
