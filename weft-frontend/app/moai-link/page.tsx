"use client";

import { useEffect, useState } from "react";
import { PageError, PageLoading } from "@/components/page-state";
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
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    Promise.all([getMoaiLinks(), getMoais()])
      .then(([graph, moais]) => setState({ graph, moais }))
      .catch(setError);
  }, []);

  if (error) {
    return <PageError title="Failed to load moai links" error={error} />;
  }
  if (!state) return <PageLoading />;

  if (state.graph.nodes.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center text-muted-foreground">
        <p>No moai links found.</p>
      </div>
    );
  }

  return <MoaiLinkGraph data={state.graph} moais={state.moais} />;
}
