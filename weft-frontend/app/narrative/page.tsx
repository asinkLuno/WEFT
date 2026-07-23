"use client";

import { useEffect, useState } from "react";
import { fetchJson, type MoaiMap, type NarrativeMap } from "@/lib/api";
import { compareDriftTime, DriftGantt, GanttLegend } from "../drift/gantt";

export default function NarrativePage() {
  const [data, setData] = useState<{
    narratives: NarrativeMap;
    moais: MoaiMap;
  } | null>(null);

  useEffect(() => {
    Promise.all([
      fetchJson<NarrativeMap>("/narrative"),
      fetchJson<MoaiMap>("/moai"),
    ])
      .then(([narratives, moais]) => setData({ narratives, moais }))
      .catch((e) => console.error("failed to load narrative", e));
  }, []);

  if (!data) {
    return <main className="flex-1 px-4 py-8 sm:px-6" />;
  }

  const { narratives, moais } = data;
  const entries = Object.entries(narratives)
    .map(([name, narrative]) => ({
      name,
      narrative,
      events: narrative.drifts.toSorted(compareDriftTime),
    }))
    .filter(({ events }) => events.length > 0);
  const eventCount = entries.reduce(
    (total, entry) => total + entry.events.length,
    0,
  );

  if (entries.length === 0) {
    return (
      <main className="flex flex-1 items-center justify-center text-muted-foreground">
        <p>No narrative timelines found.</p>
      </main>
    );
  }

  return (
    <main className="flex-1 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-5">
          <h1 className="text-2xl font-semibold tracking-tight">Narrative</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {eventCount} events across {entries.length} narratives
          </p>
        </div>

        <div className="space-y-8">
          {entries.map(({ name, narrative, events }) => (
            <DriftGantt
              key={name}
              driftKey={name}
              events={events}
              moais={moais}
              description={`Observer: ${narrative.observer} · Subjects: ${narrative.subject.join(" · ")}`}
            />
          ))}
        </div>

        <GanttLegend />
      </div>
    </main>
  );
}
