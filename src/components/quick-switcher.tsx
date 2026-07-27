"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { COPY, type Language } from "@/lib/i18n";
import type { OpenedStory } from "@/lib/api";

interface QuickSwitcherProps {
  open: boolean;
  onClose: () => void;
  recent: OpenedStory[];
  onPick: (story: OpenedStory) => void;
  language: Language;
}

export function QuickSwitcher({
  open,
  onClose,
  recent,
  onPick,
  language,
}: QuickSwitcherProps) {
  const copy = COPY[language];
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    // Defer focus until the modal mounts.
    const id = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return recent;
    return recent.filter((story) =>
      [story.title, story.path].some((field) =>
        field.toLowerCase().includes(q),
      ),
    );
  }, [query, recent]);

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;
    const target = filtered[0];
    if (!target) return;
    event.preventDefault();
    onPick(target);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      label={copy.switch_title}
      closeLabel={copy.event_dismiss}
      className="max-w-xl"
    >
      <div className="border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Search className="size-4 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={copy.switch_placeholder}
            className="h-8 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>
      <div className="max-h-80 overflow-auto px-2 py-2">
        {recent.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">
            {copy.switch_empty}
          </p>
        ) : filtered.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">
            {copy.switch_no_match}
          </p>
        ) : (
          <ul className="space-y-0.5">
            {filtered.map((story) => (
              <li key={story.path}>
                <button
                  type="button"
                  className="block w-full rounded-md px-3 py-2 text-left hover:bg-accent"
                  onClick={() => onPick(story)}
                >
                  <span className="block truncate text-sm font-medium">
                    {story.title}
                  </span>
                  <span
                    className="mt-0.5 block truncate text-xs text-muted-foreground"
                    title={story.path}
                  >
                    {story.path}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}
