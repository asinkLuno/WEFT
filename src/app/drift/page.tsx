"use client";

import { useEffect, useState } from "react";
import { PageError, PageLoading } from "@/components/page-state";
import { COPY, initialLanguage } from "@/lib/i18n";
import {
  getDrifts,
  getMoais,
  onRefetch,
  type DriftMap,
  type MoaiMap,
} from "@/lib/api";
import { compareDriftTime, DriftGantt, GanttLegend } from "./gantt";

export default function DriftPage() {
  const [data, setData] = useState<{
    driftsRaw: DriftMap;
    moais: MoaiMap;
  } | null>(null);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      Promise.all([getDrifts(), getMoais()])
        .then(
          ([driftsRaw, moais]) => !cancelled && setData({ driftsRaw, moais }),
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

  if (error)
    return <PageError title={COPY[initialLanguage()].error_load_drift} error={error} />;
  if (!data) return <PageLoading />;

  const { driftsRaw, moais } = data;
  const entries = Object.entries(driftsRaw)
    .map(([key, events]) => ({
      key,
      events: events.toSorted(compareDriftTime),
    }))
    .filter(({ events }) => events.length > 0);
  const events = entries.flatMap(({ events }) => events);

  if (events.length === 0) {
    return (
      <main className="flex flex-1 items-center justify-center text-muted-foreground">
        <p>{COPY[initialLanguage()].drift_empty}</p>
      </main>
    );
  }

  return (
    <main className="flex-1 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-5">
          <h1 className="text-2xl font-semibold tracking-tight">{COPY[initialLanguage()].drift_title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {COPY[initialLanguage()].drift_count.replace("{n}", String(events.length)).replace("{s}", String(entries.length))}
          </p>
        </div>

        <div className="space-y-8">
          {entries.map(({ key, events: driftEvents }) => (
            <DriftGantt
              key={key}
              driftKey={key}
              events={driftEvents}
              moais={moais}
            />
          ))}
        </div>

        <GanttLegend />
      </div>
    </main>
  );
}
