"use client";

import { useEffect, useState } from "react";
import {
  getMoaiLinks,
  getMoais,
  type LinkGraph,
  type MoaiMap,
} from "@/lib/api";
import { MoaiLinkGraph } from "./graph";

export default function MoaiLinkPage() {
  const [state, setState] = useState<{
    graph: LinkGraph;
    moais: MoaiMap;
  } | null>(null);

  useEffect(() => {
    Promise.all([
      getMoaiLinks(),
      getMoais(),
    ])
      .then(([graph, moais]) => setState({ graph, moais }))
      .catch((e) => console.error("failed to load moai-link", e));
  }, []);

  if (!state) {
    return <div className="flex flex-1 items-center justify-center" />;
  }

  if (state.graph.nodes.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center text-muted-foreground">
        <p>No moai links found.</p>
      </div>
    );
  }

  return <MoaiLinkGraph data={state.graph} moais={state.moais} />;
}
