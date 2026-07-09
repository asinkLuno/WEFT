import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { fetchJson, type MoaiMap } from "@/lib/api";

export default async function MoaiPage() {
  const moais = await fetchJson<MoaiMap>("/moai");
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
          <div
            key={key}
            id={key}
            className="mb-4 break-inside-avoid scroll-mt-20"
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-lg leading-tight">
                  {moai.name}
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
                {moai.base_time_display && (
                  <div className="text-xs font-mono text-muted-foreground border-t pt-2">
                    <span className="font-semibold">base_time </span>
                    {moai.base_time_display}
                  </div>
                )}
                {moai.extra_props && (
                  <div className="text-xs text-muted-foreground border-t pt-2">
                    {Object.entries(moai.extra_props).map(([k, v]) => (
                      <div key={k}>
                        <span className="font-semibold">{k}</span>:{" "}
                        {JSON.stringify(v)}
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
