import { fetchJson, type Drift, type DriftMap, type MoaiMap } from "@/lib/api";

function cmpList(a: number[], b: number[]): number {
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return 0;
}

function eventTooltip(event: Drift): string {
  const time = event.end_time_display
    ? `${event.start_time_display} — ${event.end_time_display}`
    : event.start_time_display;
  const moais = event.moais?.length ? `\n${event.moais.join("、")}` : "";
  const description = event.description ? `\n\n${event.description}` : "";
  return `${event.title}\n${time}${moais}${description}`;
}

export default async function DriftPage() {
  const [driftsRaw, moais] = await Promise.all([
    fetchJson<DriftMap>("/drift"),
    fetchJson<MoaiMap>("/moai"),
  ]);

  const entries = Object.entries(driftsRaw)
    .map(([key, events]) => ({
      key,
      events: events.toSorted((a, b) => cmpList(a.flat_start, b.flat_start)),
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

  const minTick = Math.min(...events.map((event) => event.start_tick));
  const maxTick = Math.max(
    ...events.map((event) => event.end_tick ?? event.start_tick),
  );
  const tickRange = Math.max(maxTick - minTick, 1);
  const firstEvent = events.reduce((first, event) =>
    event.start_tick < first.start_tick ? event : first,
  );
  const lastEvent = events.reduce((last, event) => {
    const eventTick = event.end_tick ?? event.start_tick;
    const lastTick = last.end_tick ?? last.start_tick;
    return eventTick > lastTick ? event : last;
  });
  const endDisplay = lastEvent.end_time_display ?? lastEvent.start_time_display;

  return (
    <main className="flex-1 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-5">
          <h1 className="text-2xl font-semibold tracking-tight">Drift</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {events.length} events across {entries.length} seasons
          </p>
        </div>

        <div className="overflow-x-auto rounded-lg border bg-background">
          <div className="min-w-[900px]">
            <div className="grid grid-cols-[240px_1fr] border-b bg-muted/50">
              <div className="flex h-14 items-end border-r px-4 pb-2 text-xs font-medium text-muted-foreground">
                Event
              </div>
              <div className="relative h-14 font-mono text-[11px] text-muted-foreground">
                <span className="absolute bottom-2 left-3">
                  {firstEvent.start_time_display}
                </span>
                <span className="absolute right-3 bottom-2">{endDisplay}</span>
              </div>
            </div>

            {entries.map(({ key, events: seasonEvents }) => (
              <section key={key} aria-labelledby={`season-${key}`}>
                <div className="grid grid-cols-[240px_1fr] border-b bg-muted/30">
                  <h2
                    id={`season-${key}`}
                    className="border-r px-4 py-2 text-sm font-semibold"
                  >
                    {key}
                  </h2>
                  <div />
                </div>

                {seasonEvents.map((event) => {
                  const left = ((event.start_tick - minTick) / tickRange) * 100;
                  const endTick = event.end_tick ?? event.start_tick;
                  const width =
                    ((endTick - event.start_tick) / tickRange) * 100;
                  const tooltip = eventTooltip(event);

                  return (
                    <div
                      key={`${key}-${event.title}`}
                      className="grid min-h-16 grid-cols-[240px_1fr] border-b last:border-b-0"
                    >
                      <div className="min-w-0 border-r px-4 py-2.5">
                        <div
                          className="truncate text-sm font-medium"
                          title={tooltip}
                        >
                          {event.title}
                        </div>
                        <div className="mt-1 truncate text-xs text-muted-foreground">
                          {(event.moais ?? []).map((name, index) => (
                            <span key={name} title={moais[name]?.description}>
                              {index > 0 ? " · " : ""}
                              {name}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div
                        className="relative bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px)] bg-[size:25%_100%]"
                        aria-label={tooltip}
                      >
                        {event.end_tick === null ? (
                          <div
                            className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-[2px] border border-primary bg-primary shadow-sm"
                            style={{
                              left: `clamp(6px, ${left}%, calc(100% - 6px))`,
                            }}
                            title={tooltip}
                          />
                        ) : (
                          <div
                            className="absolute top-1/2 h-7 min-w-1 -translate-y-1/2 rounded-md border border-primary/20 bg-primary/85 shadow-sm"
                            style={{ left: `${left}%`, width: `${width}%` }}
                            title={tooltip}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </section>
            ))}
          </div>
        </div>

        <div className="mt-3 flex items-center gap-5 text-xs text-muted-foreground">
          <span className="flex items-center gap-2">
            <span className="h-2.5 w-5 rounded-sm bg-primary/85" /> Duration
          </span>
          <span className="flex items-center gap-2">
            <span className="size-2.5 rotate-45 rounded-[1px] bg-primary" />{" "}
            Milestone
          </span>
        </div>
      </div>
    </main>
  );
}
