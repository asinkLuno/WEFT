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
import { compareDriftTime } from "../drift/gantt";
import { MoaiGantts } from "./moai-gantts";

export default function MoaiPage() {
  const [data, setData] = useState<{
    moais: MoaiMap;
    drifts: DriftMap;
  } | null>(null);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      Promise.all([getMoais(), getDrifts()])
        .then(([moais, drifts]) => !cancelled && setData({ moais, drifts }))
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
    return <PageError title={COPY[initialLanguage()].error_load_moai} error={error} />;
  if (!data) return <PageLoading />;

  const { moais, drifts } = data;
  const eventsByMoai = new Map<string, (typeof drifts)[string]>();
  for (const event of Object.values(drifts).flat()) {
    for (const moaiName of event.moais ?? []) {
      const events = eventsByMoai.get(moaiName);
      if (events) events.push(event);
      else eventsByMoai.set(moaiName, [event]);
    }
  }
  const entries = Object.entries(moais).map(([key, moai]) => ({
    key,
    moai,
    events: (eventsByMoai.get(key) ?? []).toSorted(compareDriftTime),
  }));

  if (entries.length === 0) {
    return (
      <main className="flex flex-1 items-center justify-center text-muted-foreground">
        <p>{COPY[initialLanguage()].moai_empty}</p>
      </main>
    );
  }

  return (
    <main className="flex-1 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <MoaiGantts entries={entries} moais={moais} />
      </div>
    </main>
  );
}
