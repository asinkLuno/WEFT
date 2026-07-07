"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

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

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://127.0.0.1:8000";

// Dynamic import so canvas-only code doesn't run on server
const ForceGraph2D = dynamic<any>(() => import("react-force-graph-2d"), { ssr: false });

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

export default function MoaiLinkPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const size = useContainerSize(containerRef);
  const [data, setData] = useState<GraphData>({ nodes: [], links: [] });
  const router = useRouter();

  useEffect(() => {
    fetch(`${BACKEND}/moai-link`)
      .then((r) => r.json())
      .then(setData);
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
      const r = 6;

      // Pill background
      const bw = textWidth + 16;
      const bh = fontSize + 10;
      ctx.fillStyle = "oklch(0.985 0 0)";
      ctx.strokeStyle = "oklch(0.556 0 0)";
      ctx.lineWidth = 1.5 / scale;
      ctx.beginPath();
      ctx.roundRect(-bw / 2, -bh / 2, bw, bh, 4 / scale);
      ctx.fill();
      ctx.stroke();

      // Text
      ctx.fillStyle = "oklch(0.145 0 0)";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, 0, 0);
    },
    [],
  );

  const paintPointerArea = useCallback(
    (node: GraphNode, color: string, ctx: CanvasRenderingContext2D, scale: number) => {
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

  if (data.nodes.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center text-muted-foreground">
        <p>No moai links found.</p>
      </div>
    );
  }

  return (
    <main ref={containerRef} className="flex-1">
      <ForceGraph2D
        graphData={data}
        width={size.width}
        height={size.height}
        backgroundColor="oklch(0.97 0 0)"
        nodeCanvasObject={paintNode}
        nodePointerAreaPaint={paintPointerArea}
        onNodeClick={handleNodeClick}
        linkLabel={(l: any) => `${l.label}: ${l.relations}`}
        linkDirectionalArrowLength={(l: any) => (l.bidirectional ? 0 : 6)}
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
