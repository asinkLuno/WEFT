"use client";

import { useState } from "react";
import type { Drift, Moai, MoaiMap } from "@/lib/api";
import { DriftGantt, GanttLegend } from "../drift/gantt";

export type MoaiGanttEntry = {
  key: string;
  moai: Moai;
  events: Drift[];
};

export function MoaiGantts({
  entries,
  moais,
}: {
  entries: MoaiGanttEntry[];
  moais: MoaiMap;
}) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const filteredEntries = normalizedQuery
    ? entries.filter(({ key, moai }) =>
        [key, moai.name, moai.description]
          .filter((value): value is string => Boolean(value))
          .some((value) => value.toLocaleLowerCase().includes(normalizedQuery)),
      )
    : entries;

  return (
    <>
      <div className="mb-5">
        <h1 className="text-2xl font-semibold tracking-tight">Moai</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {filteredEntries.length} of {entries.length} moais participating in
          drift events
        </p>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search moai…"
          aria-label="Search moai"
          className="mt-4 h-10 w-full max-w-md rounded-md border border-input bg-background px-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
        />
      </div>

      {filteredEntries.length > 0 ? (
        <>
          <div className="space-y-8">
            {filteredEntries.map(({ key, moai, events }) => (
              <div key={key} id={key} className="scroll-mt-20">
                <DriftGantt
                  driftKey={moai.name}
                  events={events}
                  moais={moais}
                  description={moai.description ?? undefined}
                />
              </div>
            ))}
          </div>
          <GanttLegend />
        </>
      ) : (
        <div className="rounded-lg border border-dashed px-6 py-12 text-center text-sm text-muted-foreground">
          No moai found for “{query.trim()}”.
        </div>
      )}
    </>
  );
}
