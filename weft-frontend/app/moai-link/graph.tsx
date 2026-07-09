"use client";

import { useMemo, useState, useCallback, memo } from "react";
import RelationGraph, { RGSlotOnNode } from "@relation-graph/react";
import type { RGJsonData, RGNodeSlotProps } from "@relation-graph/react";
import "@relation-graph/react/style.css";
import type { GraphLink, GraphNode, LinkGraph, Moai, MoaiMap } from "@/lib/api";

interface SubGraph {
  label: string;
  graphData: RGJsonData;
}

function groupByLabel(data: LinkGraph): SubGraph[] {
  const byLabel = new Map<string, GraphLink[]>();
  for (const link of data.links) {
    const list = byLabel.get(link.label);
    if (list) list.push(link);
    else byLabel.set(link.label, [link]);
  }
  const nodeMap = new Map(data.nodes.map((n) => [n.id, n]));
  return Array.from(byLabel.entries()).map(([label, links]) => {
    const nodeIds = new Set<string>();
    for (const l of links) {
      nodeIds.add(l.source);
      nodeIds.add(l.target);
    }
    const nodes = Array.from(nodeIds)
      .map((id) => nodeMap.get(id))
      .filter((n): n is GraphNode => !!n);
    return {
      label,
      graphData: {
        nodes: nodes.map((n) => ({
          id: n.id,
          text: n.name,
        })),
        lines: links.map((l, i) => ({
          id: `${label}-${i}`,
          from: l.source,
          to: l.target,
          text: l.relations,
          showStartArrow: false,
          showEndArrow: !l.bidirectional,
        })),
      },
    };
  });
}

const GRAPH_OPTIONS = {
  layout: { layoutName: "force", force_node_repulsion: 2 },
  defaultNodeBorderWidth: 1,
  defaultNodeBorderColor: "oklch(0.556 0 0)",
  defaultNodeColor: "oklch(0.985 0 0)",
  defaultNodeBorderRadius: 4,
  defaultLineColor: "oklch(0.556 0 0 / 0.4)",
  defaultLineWidth: 1,
  backgroundColor: "oklch(0.97 0 0)",
  disableDragNode: false,
} as const;

interface TooltipState {
  moai: Moai;
  x: number;
  y: number;
}

// Stable identity: RelationGraph re-runs its force layout when its slot function
// or props change, so this must stay constant across parent re-renders.
const renderNodeSlot = ({ node }: RGNodeSlotProps) => (
  <div
    className="flex items-center px-3 py-1.5 text-sm cursor-grab"
    data-moai-id={node.id}
  >
    <span>{node.text}</span>
  </div>
);

// Memoized so tooltip state changes in the parent never re-render the graph —
// re-rendering RelationGraph mid-interaction restarts the layout and drops nodes.
const GraphSection = memo(function GraphSection({
  label,
  graphData,
  onMouseMove,
  onMouseLeave,
}: {
  label: string;
  graphData: RGJsonData;
  onMouseMove: (e: React.MouseEvent<HTMLElement>) => void;
  onMouseLeave: () => void;
}) {
  return (
    <section>
      <h2 className="text-lg font-semibold mb-2 px-2">{label}</h2>
      <div
        className="h-[50vh] border border-border rounded-lg overflow-hidden"
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
      >
        <RelationGraph options={GRAPH_OPTIONS} initialData={graphData}>
          <RGSlotOnNode>{renderNodeSlot}</RGSlotOnNode>
        </RelationGraph>
      </div>
    </section>
  );
});

export function MoaiLinkGraph({
  data,
  moais,
}: {
  data: LinkGraph;
  moais: MoaiMap;
}) {
  const subGraphs = useMemo(() => groupByLabel(data), [data]);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  // Single handler on the graph wrapper: the force layout drifts nodes, so a
  // node-level onMouseLeave never fires when a node slides out from under the
  // cursor. Instead, on every wrapper mousemove check whether the cursor is
  // actually over a node and show/hide accordingly.
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      const id = (e.target as HTMLElement).closest<HTMLElement>(
        "[data-moai-id]",
      )?.dataset.moaiId;
      const moai = id ? moais[id] : undefined;
      if (!moai) {
        setTooltip(null);
        return;
      }
      setTooltip({ moai, x: e.clientX + 12, y: e.clientY - 8 });
    },
    [moais],
  );

  const handleMouseLeave = useCallback(() => setTooltip(null), []);

  if (data.nodes.length === 0) return null;

  return (
    <main className="flex-1 flex flex-col gap-8 px-4 py-4">
      {subGraphs.map((sg) => (
        <GraphSection
          key={sg.label}
          label={sg.label}
          graphData={sg.graphData}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        />
      ))}
      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          <div className="w-64 bg-white border border-border rounded-lg shadow-lg p-3 text-left">
            <div className="font-semibold text-sm">{tooltip.moai.name}</div>
            {tooltip.moai.base_time_display && (
              <div className="text-xs font-mono text-muted-foreground mt-1">
                {tooltip.moai.base_time_display}
              </div>
            )}
            {tooltip.moai.description && (
              <div className="text-xs mt-1.5 leading-relaxed">
                {tooltip.moai.description}
              </div>
            )}
            {tooltip.moai.extra_props &&
              Object.keys(tooltip.moai.extra_props).length > 0 && (
                <div className="text-xs text-muted-foreground mt-1.5 border-t pt-1.5">
                  {Object.entries(tooltip.moai.extra_props).map(([k, v]) => (
                    <div key={k}>
                      <span className="font-semibold">{k}</span>:{" "}
                      {JSON.stringify(v)}
                    </div>
                  ))}
                </div>
              )}
          </div>
        </div>
      )}
    </main>
  );
}
