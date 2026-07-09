import { fetchJson, type LinkGraph, type MoaiMap } from "@/lib/api";
import { MoaiLinkGraph } from "./graph";

export default async function MoaiLinkPage() {
  const [data, moais] = await Promise.all([
    fetchJson<LinkGraph>("/moai-link"),
    fetchJson<MoaiMap>("/moai"),
  ]);

  if (data.nodes.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center text-muted-foreground">
        <p>No moai links found.</p>
      </div>
    );
  }

  return <MoaiLinkGraph data={data} moais={moais} />;
}
