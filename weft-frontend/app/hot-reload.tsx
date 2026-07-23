"use client";

import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { useEffect } from "react";

// The backend emits "weft-reload" (watchfiles) when the story file changes.
// Simplest correct reload for a desktop app: reload the page, which re-runs each
// page's fetch effect on mount.
export function HotReload() {
  useEffect(() => {
    let unlisten: UnlistenFn | undefined;
    listen("weft-reload", () => window.location.reload()).then((fn) => {
      unlisten = fn;
    });
    return () => {
      unlisten?.();
    };
  }, []);
  return null;
}
