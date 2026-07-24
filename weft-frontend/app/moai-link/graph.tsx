"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import type { GraphLink, GraphNode, LinkGraph, MoaiMap } from "@/lib/api";

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
  const markerIdRef = useRef(
    `relation-arrow-${Math.random().toString(36).slice(2)}`,
  );
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [shouldRender, setShouldRender] = useState(false);

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
      .on("zoom", (event) => canvas.attr("transform", event.transform));
    svg.call(zoom);

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
      .style("cursor", "grab");

    nodeGroups
      .append("circle")
      .attr("r", NODE_RADIUS)
      .attr("fill", "#1d4ed8")
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

    svg.call(
      zoom.transform,
      d3.zoomIdentity.translate(width * 0.1, height * 0.1).scale(0.8),
    );

    return () => {
      simulation.stop();
      svg.on(".zoom", null);
    };
  }, [dimensions, graph, moais, shouldRender]);

  return (
    <section>
      <h2 className="mb-2 px-2 text-lg font-semibold">{graph.label}</h2>
      <div
        ref={containerRef}
        className="h-[50vh] overflow-hidden rounded-lg border border-border bg-muted/30"
      >
        <svg
          ref={svgRef}
          className="block size-full touch-none"
          role="img"
          aria-label={`${graph.label} relationship graph`}
        />
      </div>
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
