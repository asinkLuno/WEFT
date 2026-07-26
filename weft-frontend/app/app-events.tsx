"use client";

import type { UnlistenFn } from "@tauri-apps/api/event";
import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, X } from "lucide-react";
import { triggerRefetch, type WeftError } from "@/lib/api";
import { listen } from "@/lib/platform";

interface StoryLoadError {
  error: WeftError;
}

interface FileLost {
  path: string;
}

interface ReloadedPayload {
  story_title: string;
}

interface AppEventsProps {
  onFileLost: (path: string) => void;
}

export function AppEvents({ onFileLost }: AppEventsProps) {
  const [error, setError] = useState<WeftError | null>(null);
  const [reloadedAt, setReloadedAt] = useState<string | null>(null);

  useEffect(() => {
    const unlisteners: UnlistenFn[] = [];
    let disposed = false;
    Promise.all([
      listen<ReloadedPayload>("weft-reloaded", () => {
        triggerRefetch();
        setReloadedAt(new Date().toLocaleTimeString());
        window.setTimeout(() => setReloadedAt(null), 3000);
      }),
      listen<StoryLoadError>("weft-error", (event) =>
        setError(event.payload.error),
      ),
      listen<FileLost>("weft-file-lost", (event) =>
        onFileLost(event.payload.path),
      ),
    ]).then((listeners) => {
      if (disposed) listeners.forEach((unlisten) => unlisten());
      else unlisteners.push(...listeners);
    });
    return () => {
      disposed = true;
      unlisteners.forEach((unlisten) => unlisten());
    };
  }, [onFileLost]);

  return (
    <>
      {reloadedAt && (
        <div
          className="flex items-center gap-2 border-b border-emerald-500/30 bg-emerald-500/10 px-6 py-2 text-sm"
          role="status"
        >
          <CheckCircle2 className="size-4 text-emerald-600" />
          <span>Story reloaded at {reloadedAt}</span>
          <button
            type="button"
            className="ml-auto rounded-sm p-1 text-muted-foreground hover:bg-emerald-500/10 hover:text-foreground"
            onClick={() => setReloadedAt(null)}
            aria-label="Dismiss reload notice"
          >
            <X className="size-4" />
          </button>
        </div>
      )}
      {error && (
        <div
          className="flex items-start gap-3 border-b border-destructive/30 bg-destructive/10 px-6 py-3 text-sm"
          role="alert"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
          <div className="min-w-0 flex-1">
            <div className="font-medium">
              Story reload failed{" "}
              <code className="ml-1 text-xs text-destructive">
                {error.code}
              </code>
            </div>
            <p className="mt-0.5 break-words text-muted-foreground">
              {error.message}
            </p>
            {errorLocation(error) && (
              <p className="mt-1 font-mono text-xs text-muted-foreground">
                {errorLocation(error)}
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
      )}
    </>
  );
}

function errorLocation(error: WeftError): string | null {
  const parts = [
    error.path_display,
    error.line
      ? `line ${error.line}${error.column ? `:${error.column}` : ""}`
      : null,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}
