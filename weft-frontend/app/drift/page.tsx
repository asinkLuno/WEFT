import { fetchJson, type DriftMap, type MoaiMap } from "@/lib/api";

function cmpList(a: number[], b: number[]): number {
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return 0;
}

export default async function DriftPage() {
  const [driftsRaw, moais] = await Promise.all([
    fetchJson<DriftMap>("/drift"),
    fetchJson<MoaiMap>("/moai"),
  ]);

  const entries = Object.entries(driftsRaw)
    .map(([key, events]) => ({
      key,
      events: events.sort((a, b) => cmpList(a.flat_start, b.flat_start)),
    }))
    .filter(({ events }) => events.length > 0);

  const totalEvents = entries.reduce(
    (sum, { events }) => sum + events.length,
    0,
  );

  return (
    <main className="flex-1 px-6 py-8">
      <div className="mx-auto max-w-7xl">
        {totalEvents === 0 ? (
          <p className="text-muted-foreground">No drift events found.</p>
        ) : (
          <div className="space-y-10">
            {entries.map(({ key, events }) => {
              const moaiKeys = [
                ...new Set(events.flatMap((r) => r.moais ?? [])),
              ];
              return (
                <section key={key}>
                  <h2 className="text-lg font-semibold mb-2">{key}</h2>
                  <div className="overflow-x-auto border rounded-lg">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="bg-muted/50 border-b">
                          <th className="text-left px-3 py-2 font-medium whitespace-nowrap sticky left-0 bg-muted/50">
                            Event
                          </th>
                          {moaiKeys.map((k) => (
                            <th
                              key={k}
                              title={moais[k]?.description || undefined}
                              className="text-left px-3 py-2 font-medium whitespace-nowrap min-w-[140px]"
                            >
                              {k}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {events.map((drift, idx) => (
                          <tr key={idx} className="border-b hover:bg-muted/30">
                            <td className="px-3 py-2 align-top sticky left-0 bg-background border-r">
                              <div
                                className="font-medium"
                                title={drift.description ?? undefined}
                              >
                                {drift.title}
                              </div>
                            </td>
                            {moaiKeys.map((mk) => {
                              const entry = moais[mk]?.journal?.[drift.title];
                              const start = entry?.[0];
                              const end = entry?.[1];
                              return (
                                <td key={mk} className="px-3 py-2 align-top">
                                  {start ? (
                                    <span className="font-mono text-xs whitespace-nowrap">
                                      {start}
                                      {end ? <> ~ {end}</> : null}
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground/40">
                                      —
                                    </span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
