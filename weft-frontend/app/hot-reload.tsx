"use client";

import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { useEffect, useState } from "react";
import { AlertCircle, X } from "lucide-react";
import type { WeftError } from "@/lib/api";

interface StoryLoadError {
  error: WeftError;
}

// The backend emits "weft-reload" (watchfiles) when the story file changes.
// Simplest correct reload for a desktop app: reload the page, which re-runs each
// page's fetch effect on mount.
export function HotReload() {
  const [error, setError] = useState<WeftError | null>(null);

  useEffect(() => {
    const unlisteners: UnlistenFn[] = [];
    let disposed = false;
    Promise.all([
      listen("weft-reload", () => window.location.reload()),
      listen<StoryLoadError>("weft-error", (event) =>
        setError(event.payload.error),
      ),
    ]).then((listeners) => {
      if (disposed) listeners.forEach((unlisten) => unlisten());
      else unlisteners.push(...listeners);
    });
    return () => {
      disposed = true;
      unlisteners.forEach((unlisten) => unlisten());
    };
  }, []);

  if (!error) return null;

  const location = [
    error.path_display,
    error.line
      ? `line ${error.line}${error.column ? `:${error.column}` : ""}`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div
      className="flex items-start gap-3 border-b border-destructive/30 bg-destructive/10 px-6 py-3 text-sm"
      role="alert"
    >
      <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
      <div className="min-w-0 flex-1">
        <div className="font-medium">
          Story reload failed{" "}
          <code className="ml-1 text-xs text-destructive">{error.code}</code>
        </div>
        <p className="mt-0.5 break-words text-muted-foreground">
          {error.message}
        </p>
        {location && (
          <p className="mt-1 font-mono text-xs text-muted-foreground">
            {location}
          </p>
        )}
        {error.hint && (
          <p className="mt-1 text-xs text-muted-foreground">
            Hint: {error.hint}
          </p>
        )}
      </div>
      <button
        type="button"
        className="rounded-sm p-1 text-muted-foreground hover:bg-destructive/10 hover:text-foreground"
        onClick={() => setError(null)}
        aria-label="Dismiss error"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
