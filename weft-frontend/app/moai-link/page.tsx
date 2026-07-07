import { MoaiLinkGraph } from "./graph";

const BACKEND = process.env.BACKEND_URL ?? "http://127.0.0.1:8000";

interface GraphNode {
  id: string;
  full_name: string;
}

interface GraphLink {
  source: string;
  target: string;
  label: string;
  relations: string;
  bidirectional: boolean;
}

interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

interface MoaiInfo {
  full_name: string;
  base_time: string | null;
  description: string;
  extra_props: Record<string, unknown> | null;
}

async function fetchLinks(): Promise<GraphData> {
  const res = await fetch(`${BACKEND}/moai-link`, { next: { revalidate: 0 } });
  if (!res.ok) throw new Error(`/moai-link returned ${res.status}`);
  return res.json();
}

async function fetchMoais(): Promise<Record<string, MoaiInfo>> {
  const res = await fetch(`${BACKEND}/moai`, { next: { revalidate: 0 } });
  if (!res.ok) throw new Error(`/moai returned ${res.status}`);
  return res.json();
}

export default async function MoaiLinkPage() {
  const [data, moais] = await Promise.all([fetchLinks(), fetchMoais()]);

  if (data.nodes.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center text-muted-foreground">
        <p>No moai links found.</p>
      </div>
    );
  }

  return <MoaiLinkGraph data={data} moais={moais} />;
}
