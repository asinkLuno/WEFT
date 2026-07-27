"use client";

import { useEffect, useState } from "react";
import { PageError, PageLoading } from "@/components/page-state";
import { COPY, initialLanguage } from "@/lib/i18n";
import {
  getMoais,
  getNarratives,
  onRefetch,
  type MoaiMap,
  type NarrativeMap,
} from "@/lib/api";
import { compareDriftTime, DriftGantt, GanttLegend } from "../drift/gantt";

export default function NarrativePage() {
  const [data, setData] = useState<{
    narratives: NarrativeMap;
    moais: MoaiMap;
  } | null>(null);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      Promise.all([getNarratives(), getMoais()])
        .then(
          ([narratives, moais]) => {
            if (!cancelled) {
              setError(null);
              setData({ narratives, moais });
            }
          },
        )
        .catch((err) => !cancelled && setError(err));
    };
    load();
    const off = onRefetch(load);
    return () => {
      cancelled = true;
      off();
    };
  }, []);

  if (error) {
    return <PageError title={COPY[initialLanguage()].error_load_narrative} error={error} />;
  }
  if (!data) return <PageLoading />;

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
        <p>{COPY[initialLanguage()].narrative_empty}</p>
      </main>
    );
  }

  return (
    <main className="flex-1 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-5">
          <h1 className="text-2xl font-semibold tracking-tight">{COPY[initialLanguage()].narrative_title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {COPY[initialLanguage()].narrative_count.replace("{n}", String(eventCount)).replace("{s}", String(entries.length))}
          </p>
        </div>

        <div className="space-y-8">
          {entries.map(({ name, narrative, events }) => (
            <DriftGantt
              key={name}
              driftKey={name}
              events={events}
              moais={moais}
              description={COPY[initialLanguage()].narrative_observer.replace("{o}", narrative.observer).replace("{t}", narrative.subject.join(" · "))}
            />
          ))}
        </div>

        <GanttLegend />
      </div>
    </main>
  );
}
