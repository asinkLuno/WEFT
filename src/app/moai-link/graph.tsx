"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import { Focus, LocateFixed, Minus, Plus, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { GraphLink, GraphNode, LinkGraph, MoaiMap } from "@/lib/api";
import { COPY, initialLanguage } from "@/lib/i18n";

interface SubGraph {
  label: string;
  nodes: GraphNode[];
  links: GraphLink[];
}

interface SimulationNode extends d3.SimulationNodeDatum {
  id: string;
  name: string;
}

interface SimulationLink extends d3.SimulationLinkDatum<SimulationNode> {
  relations: string;
  bidirectional: boolean;
}

interface GraphActions {
  zoomIn: () => void;
  zoomOut: () => void;
  fit: () => void;
  reset: () => void;
  focusNode: (id: string) => void;
}

const NODE_RADIUS = 20;

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

function linkPath(link: SimulationLink): string {
  const source = link.source as SimulationNode;
  const target = link.target as SimulationNode;
  if (
    source.x === undefined ||
    source.y === undefined ||
    target.x === undefined ||
    target.y === undefined
  ) {
    return "";
  }

  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const length = Math.hypot(dx, dy);
  if (length === 0) return "";

  const offsetX = (dx / length) * (NODE_RADIUS + 2);
  const offsetY = (dy / length) * (NODE_RADIUS + 2);
  return [
    `M${source.x + offsetX},${source.y + offsetY}`,
    `L${target.x - offsetX},${target.y - offsetY}`,
  ].join("");
}

function GraphSection({ graph, moais }: { graph: SubGraph; moais: MoaiMap }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const actionsRef = useRef<GraphActions | null>(null);
  const markerIdRef = useRef(
    `relation-arrow-${Math.random().toString(36).slice(2)}`,
  );
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [shouldRender, setShouldRender] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const updateDimensions = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    setDimensions({
      width: Math.max(container.clientWidth, 100),
      height: Math.max(container.clientHeight, 100),
    });
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setShouldRender(true);
        observer.disconnect();
      },
      { rootMargin: "400px 0px" },
    );
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !shouldRender) return;
    updateDimensions();

    const observer = new ResizeObserver(updateDimensions);
    observer.observe(container);
    return () => observer.disconnect();
  }, [shouldRender, updateDimensions]);

  useEffect(() => {
    const svgElement = svgRef.current;
    if (
      !svgElement ||
      !shouldRender ||
      dimensions.width === 0 ||
      dimensions.height === 0
    ) {
      return;
    }

    const { width, height } = dimensions;
    const nodes: SimulationNode[] = graph.nodes.map((node) => ({ ...node }));
    const links: SimulationLink[] = graph.links.map((link) => ({
      source: link.source,
      target: link.target,
      relations: link.relations,
      bidirectional: link.bidirectional,
    }));

    const svg = d3
      .select(svgElement)
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("preserveAspectRatio", "xMidYMid meet");
    svg.selectAll("*").remove();

    const canvas = svg.append("g");
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.25, 4])
      .filter((event) => {
        if (event.type === "wheel") return event.ctrlKey || event.metaKey;
        return !event.button;
      })
      .on("zoom", (event) => canvas.attr("transform", event.transform));
    svg.call(zoom);
    svg.on("dblclick.zoom", null);

    const markerId = markerIdRef.current;
    svg
      .append("defs")
      .append("marker")
      .attr("id", markerId)
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 9)
      .attr("refY", 0)
      .attr("markerWidth", 8)
      .attr("markerHeight", 8)
      .attr("orient", "auto-start-reverse")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "#525252");

    const linkGroups = canvas
      .append("g")
      .attr("class", "links")
      .selectAll("g")
      .data(links)
      .join("g");

    const paths = linkGroups
      .append("path")
      .attr("fill", "none")
      .attr("stroke", "#525252")
      .attr("stroke-opacity", 0.8)
      .attr("stroke-width", 1.5)
      .attr("marker-end", `url(#${markerId})`)
      .attr("marker-start", (link) =>
        link.bidirectional ? `url(#${markerId})` : null,
      );

    const relationLabels = linkGroups
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dy", -5)
      .attr("font-size", 10)
      .attr("fill", "#404040")
      .attr("paint-order", "stroke")
      .attr("stroke", "#fafafa")
      .attr("stroke-width", 4)
      .attr("stroke-linejoin", "round")
      .text((link) => link.relations);

    const nodeGroups = canvas
      .append("g")
      .attr("class", "nodes")
      .selectAll<SVGGElement, SimulationNode>("g")
      .data(nodes)
      .join("g")
      .attr("class", "node")
      .attr("tabindex", 0)
      .attr("role", "button")
      .attr("aria-label", (node) => COPY[initialLanguage()].graph_view_node.replace("{name}", node.name))
      .style("cursor", "grab");

    nodeGroups
      .append("circle")
      .attr("r", NODE_RADIUS)
      .style("fill", "var(--primary)")
      .attr("stroke", "#fafafa")
      .attr("stroke-width", 1.5);

    nodeGroups
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dy", ".32em")
      .attr("font-family", "Arial, sans-serif")
      .attr("font-size", 10)
      .attr("fill", "#fafafa")
      .attr("pointer-events", "none")
      .text((node) => node.name);

    nodeGroups.append("title").text((node) => {
      const moai = moais[node.id];
      if (!moai) return node.name;
      return [moai.name, moai.base_time_display, moai.description]
        .filter(Boolean)
        .join("\n");
    });

    nodeGroups
      .on("click", (event, node) => {
        event.stopPropagation();
        setSelectedNodeId(node.id);
      })
      .on("keydown", (event, node) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        setSelectedNodeId(node.id);
      });
    svg.on("click.select", () => setSelectedNodeId(null));

    const simulation = d3
      .forceSimulation(nodes)
      .force(
        "link",
        d3
          .forceLink<SimulationNode, SimulationLink>(links)
          .id((node) => node.id)
          .distance(100),
      )
      .force("charge", d3.forceManyBody().strength(-300).distanceMax(500))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide(NODE_RADIUS + 30))
      .alphaDecay(0.05);

    const drag = d3
      .drag<SVGGElement, SimulationNode>()
      .on("start", (event, node) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        node.fx = node.x;
        node.fy = node.y;
        d3.select(event.sourceEvent.currentTarget).style("cursor", "grabbing");
      })
      .on("drag", (event, node) => {
        node.fx = event.x;
        node.fy = event.y;
      })
      .on("end", (event, node) => {
        if (!event.active) simulation.alphaTarget(0);
        node.fx = null;
        node.fy = null;
        d3.select(event.sourceEvent.currentTarget).style("cursor", "grab");
      });
    nodeGroups.call(drag);

    simulation.on("tick", () => {
      paths.attr("d", linkPath);
      relationLabels
        .attr("x", (link) => {
          const source = link.source as SimulationNode;
          const target = link.target as SimulationNode;
          return ((source.x ?? 0) + (target.x ?? 0)) / 2;
        })
        .attr("y", (link) => {
          const source = link.source as SimulationNode;
          const target = link.target as SimulationNode;
          return ((source.y ?? 0) + (target.y ?? 0)) / 2;
        });
      nodeGroups.attr(
        "transform",
        (node) => `translate(${node.x ?? 0},${node.y ?? 0})`,
      );
    });

    const initialTransform = d3.zoomIdentity
      .translate(width * 0.1, height * 0.1)
      .scale(0.8);
    const transition = () => svg.transition().duration(220);
    const fit = () => {
      const bounds = canvas.node()?.getBBox();
      if (!bounds || bounds.width === 0 || bounds.height === 0) return;
      const padding = 48;
      const scale = Math.min(
        2,
        Math.max(
          0.25,
          Math.min(
            (width - padding * 2) / bounds.width,
            (height - padding * 2) / bounds.height,
          ),
        ),
      );
      const transform = d3.zoomIdentity
        .translate(width / 2, height / 2)
        .scale(scale)
        .translate(
          -(bounds.x + bounds.width / 2),
          -(bounds.y + bounds.height / 2),
        );
      transition().call(zoom.transform, transform);
    };
    actionsRef.current = {
      zoomIn: () => transition().call(zoom.scaleBy, 1.3),
      zoomOut: () => transition().call(zoom.scaleBy, 1 / 1.3),
      fit,
      reset: () => transition().call(zoom.transform, initialTransform),
      focusNode: (id) => {
        const node = nodes.find((item) => item.id === id);
        if (node?.x === undefined || node.y === undefined) return;
        const transform = d3.zoomIdentity
          .translate(width / 2, height / 2)
          .scale(1.5)
          .translate(-node.x, -node.y);
        transition().call(zoom.transform, transform);
      },
    };
    svg.call(zoom.transform, initialTransform);

    return () => {
      simulation.stop();
      actionsRef.current = null;
      svg.on(".zoom", null);
      svg.on(".select", null);
    };
  }, [dimensions, graph, moais, shouldRender]);

  const selectedMoai = selectedNodeId ? moais[selectedNodeId] : null;

  function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedQuery = query.trim().toLocaleLowerCase();
    if (!normalizedQuery) return;
    const node =
      graph.nodes.find(
        (item) => item.name.toLocaleLowerCase() === normalizedQuery,
      ) ??
      graph.nodes.find((item) =>
        item.name.toLocaleLowerCase().includes(normalizedQuery),
      );
    if (!node) return;
    setQuery(node.name);
    setSelectedNodeId(node.id);
    actionsRef.current?.focusNode(node.id);
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">{graph.label}</h2>
          <p className="text-xs text-muted-foreground">
            {COPY[initialLanguage()].graph_node_count.replace("{n}", String(graph.nodes.length)).replace("{l}", String(graph.links.length))}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <form className="relative" onSubmit={handleSearch}>
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={COPY[initialLanguage()].graph_search_placeholder}
              aria-label={COPY[initialLanguage()].graph_search_placeholder}
              list={`nodes-${markerIdRef.current}`}
              className="h-8 w-40 rounded-lg border border-input bg-background pr-2 pl-8 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
            />
            <datalist id={`nodes-${markerIdRef.current}`}>
              {graph.nodes.map((node) => (
                <option key={node.id} value={node.name} />
              ))}
            </datalist>
          </form>
          <div
            className="flex items-center rounded-lg border bg-background p-0.5"
            aria-label={COPY[initialLanguage()].graph_zoom_in}
          >
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => actionsRef.current?.zoomOut()}
              aria-label={COPY[initialLanguage()].graph_zoom_out}
              title={COPY[initialLanguage()].graph_zoom_out}
            >
              <Minus />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => actionsRef.current?.zoomIn()}
              aria-label={COPY[initialLanguage()].graph_zoom_in}
              title={COPY[initialLanguage()].graph_zoom_in}
            >
              <Plus />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => actionsRef.current?.fit()}
              aria-label={COPY[initialLanguage()].graph_fit_view}
              title={COPY[initialLanguage()].graph_fit_view}
            >
              <Focus />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => actionsRef.current?.reset()}
              aria-label={COPY[initialLanguage()].graph_reset_view}
              title={COPY[initialLanguage()].graph_reset_view}
            >
              <LocateFixed />
            </Button>
          </div>
        </div>
      </div>
      <div
        ref={containerRef}
        className="relative h-[min(65vh,42rem)] min-h-96 overflow-hidden rounded-lg border border-border bg-muted/30"
      >
        <svg
          ref={svgRef}
          className="block size-full touch-pan-y"
          role="img"
          aria-label={`${graph.label} relationship graph`}
        />
        <div className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 rounded-md bg-background/90 px-2 py-1 text-[11px] whitespace-nowrap text-muted-foreground shadow-sm ring-1 ring-border">
          {COPY[initialLanguage()].graph_canvas_hint}
        </div>
      </div>
      {selectedMoai && (
        <aside className="relative rounded-lg border bg-card p-4 text-sm">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="absolute top-2 right-2"
            onClick={() => setSelectedNodeId(null)}
            aria-label={COPY[initialLanguage()].graph_close_detail}
          >
            <X />
          </Button>
          <h3 className="pr-8 text-base font-semibold">{selectedMoai.name}</h3>
          {selectedMoai.base_time_display && (
            <p className="mt-1 font-mono text-xs text-muted-foreground">
              {selectedMoai.base_time_display}
            </p>
          )}
          {selectedMoai.description && (
            <p className="mt-3 max-w-3xl whitespace-pre-wrap text-muted-foreground">
              {selectedMoai.description}
            </p>
          )}
        </aside>
      )}
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
  const [activeLabel, setActiveLabel] = useState(subGraphs[0]?.label ?? "");
  const activeGraph =
    subGraphs.find((graph) => graph.label === activeLabel) ?? subGraphs[0];

  if (!activeGraph) return null;

  return (
    <main className="flex flex-1 flex-col px-4 py-6 sm:px-6">
      <div className="mx-auto w-full max-w-7xl">
        <div className="mb-5">
          <h1 className="text-2xl font-semibold tracking-tight">{COPY[initialLanguage()].graph_title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {COPY[initialLanguage()].graph_subtitle}
          </p>
        </div>
        {subGraphs.length > 1 && (
          <div
            className="mb-5 flex gap-1 overflow-x-auto border-b pb-px"
            role="tablist"
            aria-label={COPY[initialLanguage()].graph_type_aria}
          >
            {subGraphs.map((graph) => {
              const active = graph.label === activeGraph.label;
              return (
                <button
                  key={graph.label}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveLabel(graph.label)}
                  className={`shrink-0 border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                    active
                      ? "border-primary text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {graph.label}
                  <span className="ml-1.5 text-xs opacity-60">
                    {graph.links.length}
                  </span>
                </button>
              );
            })}
          </div>
        )}
        <GraphSection
          key={activeGraph.label}
          graph={activeGraph}
          moais={moais}
        />
      </div>
    </main>
  );
}
