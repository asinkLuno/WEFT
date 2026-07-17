"use client";

import { useEffect, useMemo, useRef } from "react";
import * as echarts from "echarts/core";
import { GraphChart } from "echarts/charts";
import { TooltipComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import type {
  DefaultLabelFormatterCallbackParams,
  EChartsOption,
  TooltipComponentFormatterCallbackParams,
} from "echarts";
import type { GraphLink, GraphNode, LinkGraph, Moai, MoaiMap } from "@/lib/api";

echarts.use([GraphChart, TooltipComponent, CanvasRenderer]);

interface SubGraph {
  label: string;
  nodes: GraphNode[];
  links: GraphLink[];
}

function groupByLabel(data: LinkGraph): SubGraph[] {
  const byLabel = new Map<string, GraphLink[]>();
  for (const link of data.links) {
    const links = byLabel.get(link.label);
    if (links) links.push(link);
    else byLabel.set(link.label, [link]);
  }

  const nodeMap = new Map(data.nodes.map((node) => [node.id, node]));
  return Array.from(byLabel.entries()).map(([label, links]) => {
    const nodeIds = new Set(
      links.flatMap((link) => [link.source, link.target]),
    );
    const nodes = Array.from(nodeIds)
      .map((id) => nodeMap.get(id))
      .filter((node): node is GraphNode => node !== undefined);

    return { label, nodes, links };
  });
}

function escapeHtml(value: unknown): string {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatTooltip(moai: Moai): string {
  const time = moai.base_time_display
    ? `<div style="margin-top:4px;color:#71717a;font-family:monospace;font-size:12px">${escapeHtml(moai.base_time_display)}</div>`
    : "";
  const description = moai.description
    ? `<div style="margin-top:6px;max-width:256px;white-space:normal;line-height:1.5">${escapeHtml(moai.description)}</div>`
    : "";
  const properties = Object.entries(moai.extra_props ?? {})
    .map(
      ([key, value]) =>
        `<div><strong>${escapeHtml(key)}</strong>: ${escapeHtml(JSON.stringify(value))}</div>`,
    )
    .join("");
  const extra = properties
    ? `<div style="margin-top:6px;padding-top:6px;border-top:1px solid #e4e4e7;color:#71717a">${properties}</div>`
    : "";

  return `<div style="font-size:12px"><strong style="font-size:14px">${escapeHtml(moai.name)}</strong>${time}${description}${extra}</div>`;
}

function graphOption(graph: SubGraph, moais: MoaiMap): EChartsOption {
  return {
    animationDurationUpdate: 300,
    tooltip: {
      trigger: "item",
      confine: true,
      borderColor: "#e4e4e7",
      formatter: (params: TooltipComponentFormatterCallbackParams) => {
        const item = Array.isArray(params) ? params[0] : params;
        if (!item || item.dataType !== "node") return "";
        const data = item.data as { id?: string };
        const moai = data.id ? moais[data.id] : undefined;
        return moai ? formatTooltip(moai) : escapeHtml(item.name);
      },
    },
    series: [
      {
        type: "graph",
        layout: "force",
        left: 24,
        right: 24,
        top: 24,
        bottom: 24,
        roam: true,
        draggable: false,
        cursor: "default",
        data: graph.nodes.map((node) => ({
          id: node.id,
          name: node.name,
          symbol: "roundRect",
          symbolSize: [
            Math.max(72, Math.min(180, node.name.length * 14 + 28)),
            36,
          ],
        })),
        links: graph.links.map((link) => ({
          source: link.source,
          target: link.target,
          relations: link.relations,
          symbol: ["none", link.bidirectional ? "none" : "arrow"],
        })),
        force: {
          initLayout: "circular",
          repulsion: 320,
          edgeLength: [110, 180],
          gravity: 0.08,
          friction: 0.7,
          layoutAnimation: false,
        },
        label: {
          show: true,
          position: "inside",
          color: "#27272a",
          fontSize: 13,
          overflow: "truncate",
          width: 150,
        },
        edgeLabel: {
          show: true,
          formatter: (params: DefaultLabelFormatterCallbackParams) =>
            (params.data as { relations?: string }).relations ?? "",
          color: "#71717a",
          fontSize: 11,
          backgroundColor: "rgba(250, 250, 250, 0.85)",
          padding: [2, 4],
          borderRadius: 2,
        },
        itemStyle: {
          color: "#fafafa",
          borderColor: "#71717a",
          borderWidth: 1,
        },
        lineStyle: {
          color: "#a1a1aa",
          width: 1,
          opacity: 0.7,
          curveness: 0.08,
        },
        emphasis: {
          focus: "adjacency",
          lineStyle: { width: 2, opacity: 1 },
        },
      },
    ],
  };
}

function GraphSection({ graph, moais }: { graph: SubGraph; moais: MoaiMap }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const chart = echarts.init(container);
    chart.setOption(graphOption(graph, moais));

    const observer = new ResizeObserver(() => chart.resize());
    observer.observe(container);

    return () => {
      observer.disconnect();
      chart.dispose();
    };
  }, [graph, moais]);

  return (
    <section>
      <h2 className="mb-2 px-2 text-lg font-semibold">{graph.label}</h2>
      <div
        ref={containerRef}
        className="h-[50vh] overflow-hidden rounded-lg border border-border bg-zinc-50"
        role="img"
        aria-label={`${graph.label} relationship graph`}
      />
    </section>
  );
}

export function MoaiLinkGraph({
  data,
  moais,
}: {
  data: LinkGraph;
  moais: MoaiMap;
}) {
  const subGraphs = useMemo(() => groupByLabel(data), [data]);

  if (data.nodes.length === 0) return null;

  return (
    <main className="flex flex-1 flex-col gap-8 px-4 py-4">
      {subGraphs.map((graph) => (
        <GraphSection key={graph.label} graph={graph} moais={moais} />
      ))}
    </main>
  );
}
