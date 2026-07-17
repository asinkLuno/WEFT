import { fetchJson, type DriftMap, type MoaiMap } from "@/lib/api";
import { compareDriftTime, DriftGantt, GanttLegend } from "./gantt";

export default async function DriftPage() {
  const [driftsRaw, moais] = await Promise.all([
    fetchJson<DriftMap>("/drift"),
    fetchJson<MoaiMap>("/moai"),
  ]);

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
        <p>No drift events found.</p>
      </main>
    );
  }

  return (
    <main className="flex-1 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-5">
          <h1 className="text-2xl font-semibold tracking-tight">Drift</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {events.length} events across {entries.length} seasons
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
