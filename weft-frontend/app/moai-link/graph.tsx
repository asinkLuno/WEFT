"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { forceManyBody, forceCollide } from "d3-force";
import type { ForceGraphMethods } from "react-force-graph-2d";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
});

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

function useContainerSize(ref: React.RefObject<HTMLDivElement | null>) {
  const [size, setSize] = useState({ width: 800, height: 600 });
  useEffect(() => {
    if (!ref.current) return;
    const obs = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) setSize({ width, height });
    });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [ref]);
  return size;
}

export function MoaiLinkGraph({ data }: { data: GraphData }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const fgRef = useRef<ForceGraphMethods>(null);
  const size = useContainerSize(containerRef);
  const router = useRouter();

  useEffect(() => {
    const fg = fgRef.current;
    if (!fg) return;
    fg.d3Force("charge", forceManyBody().strength(-400));
    fg.d3Force("collide", forceCollide(50));
    fg.d3ReheatSimulation();
  }, []);

  const handleNodeClick = useCallback(
    (node: GraphNode) => {
      router.push(`/moai#${node.id}`);
    },
    [router],
  );

  const paintNode = useCallback(
    (node: GraphNode, ctx: CanvasRenderingContext2D, scale: number) => {
      const label = node.full_name;
      const fontSize = 12 / scale;
      ctx.font = `${fontSize}px sans-serif`;
      const textWidth = ctx.measureText(label).width;

      const bw = textWidth + 16;
      const bh = fontSize + 10;
      ctx.fillStyle = "oklch(0.985 0 0)";
      ctx.strokeStyle = "oklch(0.556 0 0)";
      ctx.lineWidth = 1.5 / scale;
      ctx.beginPath();
      ctx.roundRect(-bw / 2, -bh / 2, bw, bh, 4 / scale);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "oklch(0.145 0 0)";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, 0, 0);
    },
    [],
  );

  const paintPointerArea = useCallback(
    (
      node: GraphNode,
      color: string,
      ctx: CanvasRenderingContext2D,
      scale: number,
    ) => {
      const fontSize = 12 / scale;
      ctx.font = `${fontSize}px sans-serif`;
      const textWidth = ctx.measureText(node.full_name).width;
      const bw = textWidth + 16;
      const bh = fontSize + 10;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(-bw / 2, -bh / 2, bw, bh, 4 / scale);
      ctx.fill();
    },
    [],
  );

  return (
    <main ref={containerRef} className="flex-1">
      <ForceGraph2D
        ref={fgRef}
        graphData={data}
        width={size.width}
        height={size.height}
        backgroundColor="oklch(0.97 0 0)"
        nodeCanvasObject={paintNode}
        nodePointerAreaPaint={paintPointerArea}
        onNodeClick={handleNodeClick}
        linkLabel={(l: GraphLink) => `${l.label}: ${l.relations}`}
        linkDirectionalArrowLength={(l: GraphLink) => (l.bidirectional ? 0 : 6)}
        linkDirectionalArrowRelPos={0.5}
        linkCurvature={0.2}
        linkColor={() => "oklch(0.556 0 0 / 0.4)"}
        linkWidth={1}
        cooldownTicks={100}
        enableNodeDrag={false}
      />
    </main>
  );
}
