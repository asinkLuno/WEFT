"use client";

import { useEffect, useState } from "react";
import { PageError, PageLoading } from "@/components/page-state";
import { COPY, initialLanguage } from "@/lib/i18n";
import {
  getMoaiLinks,
  getMoais,
  onRefetch,
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
    let cancelled = false;
    const load = () => {
      Promise.all([getMoaiLinks(), getMoais()])
        .then(([graph, moais]) => !cancelled && setState({ graph, moais }))
        .catch((err) => !cancelled && setError(err));
    };
    load();
    const off = onRefetch(load);
    return () => {
      cancelled = true;
      off();
    };
  }, []);

  if (error) {
    return <PageError title={COPY[initialLanguage()].error_load_moai_links} error={error} />;
  }
  if (!state) return <PageLoading />;

  if (state.graph.nodes.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center text-muted-foreground">
        <p>{COPY[initialLanguage()].link_empty}</p>
      </div>
    );
  }

  return <MoaiLinkGraph data={state.graph} moais={state.moais} />;
}
