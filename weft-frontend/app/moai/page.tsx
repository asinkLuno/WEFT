import { fetchJson, type DriftMap, type MoaiMap } from "@/lib/api";
import { compareDriftTime } from "../drift/gantt";
import { MoaiGantts } from "./moai-gantts";

export default async function MoaiPage() {
  const [moais, drifts] = await Promise.all([
    fetchJson<MoaiMap>("/moai"),
    fetchJson<DriftMap>("/drift"),
  ]);
  const allEvents = Object.values(drifts).flat();
  const entries = Object.entries(moais)
    .map(([key, moai]) => ({
      key,
      moai,
      events: allEvents
        .filter((event) => event.moais?.includes(key))
        .toSorted(compareDriftTime),
    }))
    .filter(({ events }) => events.length > 0);

  if (entries.length === 0) {
    return (
      <main className="flex flex-1 items-center justify-center text-muted-foreground">
        <p>No moai drift events found.</p>
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
