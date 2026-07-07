const BACKEND = process.env.BACKEND_URL ?? "http://127.0.0.1:8001";

interface MoaiData {
  full_name: string;
  base_time_display: string | null;
  description: string;
  extra_props: Record<string, unknown> | null;
}
type MoaiMap = Record<string, MoaiData>;

interface DriftEvent {
  title: string;
  description: string | null;
  start_time: { base_time: number[]; ref_time: unknown };
  end_time: { base_time: number[]; ref_time: unknown } | null;
  flat_start: number[];
  flat_end: number[] | null;
  moais: MoaiData[] | null;
  moai_offsets: Record<string, { start: string; end: string | null }> | null;
}

type DriftMap = Record<string, DriftEvent[]>;

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url, { next: { revalidate: 0 } });
  if (!res.ok) throw new Error(`${url} returned ${res.status}`);
  return res.json();
}

function cmpList(a: number[], b: number[]): number {
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return 0;
}

export default async function DriftPage() {
  const [driftsRaw, moais] = (await Promise.all([
    fetchJson(`${BACKEND}/drift`),
    fetchJson(`${BACKEND}/moai`),
  ])) as [DriftMap, MoaiMap];

  const rows: DriftEvent[] = Object.values(driftsRaw)
    .flat()
    .sort((a, b) => cmpList(a.flat_start, b.flat_start));

  // ponytail: only moais that appear in any drift's moai_offsets
  const moaiKeys = [
    ...new Set(rows.flatMap((r) => Object.keys(r.moai_offsets ?? {}))),
  ];

  return (
    <main className="flex-1 px-6 py-8">
      <div className="mx-auto max-w-7xl">
        <h1 className="text-2xl font-semibold mb-6">Drift Timeline</h1>

        {rows.length === 0 ? (
          <p className="text-muted-foreground">No drift events found.</p>
        ) : (
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
                      className="text-left px-3 py-2 font-medium whitespace-nowrap min-w-[140px]"
                    >
                      <div className="text-xs text-muted-foreground">{k}</div>
                      <div>{moais[k].full_name}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((drift, idx) => (
                  <tr key={idx} className="border-b hover:bg-muted/30">
                    <td className="px-3 py-2 align-top sticky left-0 bg-background border-r">
                      <div className="font-medium">{drift.title}</div>
                      {drift.description && (
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {drift.description}
                        </div>
                      )}
                    </td>
                    {moaiKeys.map((mk) => {
                      const off = drift.moai_offsets?.[mk];
                      return (
                        <td key={mk} className="px-3 py-2 align-top">
                          {off ? (
                            <span className="font-mono text-xs whitespace-nowrap">
                              {off.start}
                              {off.end != null ? <> ~ {off.end}</> : null}
                            </span>
                          ) : (
                            <span className="text-muted-foreground/40">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
