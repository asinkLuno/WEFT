import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const BACKEND = process.env.BACKEND_URL ?? "http://127.0.0.1:8000";

interface MoaiData {
  full_name: string;
  base_time: number[] | { base_time: number[]; ref_time: unknown } | null;
  description: string;
  extra_props: Record<string, unknown> | null;
}

type MoaiMap = Record<string, MoaiData>;

function fmtBaseTime(bt: MoaiData["base_time"]): string | null {
  if (!bt) return null;
  const base = Array.isArray(bt) ? bt : bt.base_time;
  const labels = ["Y", "M", "D", "H", "m", "s"];
  return base.map((v, i) => `${v}${labels[i] ?? ""}`).join(" ");
}

async function getMoais(): Promise<MoaiMap> {
  const res = await fetch(`${BACKEND}/moai`, { next: { revalidate: 0 } });
  if (!res.ok) throw new Error(`/moai returned ${res.status}`);
  return res.json();
}

export default async function MoaiPage() {
  const moais = await getMoais();
  const entries = Object.entries(moais);

  if (entries.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center text-muted-foreground">
        <p>No moai found.</p>
      </div>
    );
  }

  return (
    <main className="flex-1 px-6 py-8">
      <div className="mx-auto max-w-7xl columns-1 gap-4 sm:columns-2 lg:columns-3 xl:columns-4">
        {entries.map(([key, moai]) => (
          <div key={key} id={key} className="mb-4 break-inside-avoid scroll-mt-20">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg leading-tight">
                  {moai.full_name}
                </CardTitle>
                <CardDescription className="font-mono text-xs">
                  {key}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {moai.description && (
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {moai.description}
                  </p>
                )}
                {moai.base_time && (
                  <div className="text-xs font-mono text-muted-foreground border-t pt-2">
                    <span className="font-semibold">base_time </span>
                    {fmtBaseTime(moai.base_time)}
                  </div>
                )}
                {moai.extra_props && (
                  <div className="text-xs text-muted-foreground border-t pt-2">
                    {Object.entries(moai.extra_props).map(([k, v]) => (
                      <div key={k}>
                        <span className="font-semibold">{k}</span>: {JSON.stringify(v)}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ))}
      </div>
    </main>
  );
}
