import { fetchJson, type DriftMap, type MoaiMap } from "@/lib/api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
                  <div className="overflow-hidden border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50 hover:bg-muted/50">
                          <TableHead className="sticky left-0 bg-muted/50 z-10">
                            Event
                          </TableHead>
                          {moaiKeys.map((k) => (
                            <TableHead
                              key={k}
                              title={moais[k]?.description || undefined}
                              className="min-w-[140px]"
                            >
                              {k}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {events.map((drift, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="align-top sticky left-0 bg-background border-r whitespace-normal z-10">
                              <div
                                className="font-medium"
                                title={drift.description ?? undefined}
                              >
                                {drift.title}
                              </div>
                            </TableCell>
                            {moaiKeys.map((mk) => {
                              const entry = moais[mk]?.journal?.[drift.title];
                              const start = entry?.[0];
                              const end = entry?.[1];
                              return (
                                <TableCell key={mk} className="align-top">
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
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
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
