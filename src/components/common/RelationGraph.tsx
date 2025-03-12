import React, {
    useEffect,
    useMemo,
    useRef,
    useState,
    useCallback,
} from 'react';
import * as d3 from 'd3';
import { MoaiLinkContextType } from '../MoaiLink';

interface SimulationNode extends d3.SimulationNodeDatum {
    id: string;
    text: string;
    nodeShape?: number;
    x?: number;
    y?: number;
}
interface SimulationLink extends d3.SimulationLinkDatum<SimulationNode> {
    from: string;
    to: string;
    relations?: string;
    bidirectional: boolean;
    source: string | SimulationNode;
    target: string | SimulationNode;
}

const calculateLinkPath = (d: SimulationLink): string => {
    const sourceNode = d.source as SimulationNode;
    const targetNode = d.target as SimulationNode;

    if (!sourceNode.x || !sourceNode.y || !targetNode.x || !targetNode.y) {
        return '';
    }

    const sourceX = sourceNode.x;
    const sourceY = sourceNode.y;
    const targetX = targetNode.x;
    const targetY = targetNode.y;

    const dx = targetX - sourceX;
    const dy = targetY - sourceY;
    const length = Math.sqrt(dx * dx + dy * dy);

    if (length === 0) return '';

    const ndx = dx / length;
    const ndy = dy / length;

    const nodeRadius = 22;

    const startX = sourceX + ndx * nodeRadius;
    const startY = sourceY + ndy * nodeRadius;
    const endX = targetX - ndx * nodeRadius;
    const endY = targetY - ndy * nodeRadius;

    return `M${startX.toFixed(2)},${startY.toFixed(2)}L${endX.toFixed(
        2,
    )},${endY.toFixed(2)}`;
};

const RelationGraph: React.FC<MoaiLinkContextType> = ({
    moai_nodes,
    moai_links,
}) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const simulationRef = useRef<d3.Simulation<
        SimulationNode,
        SimulationLink
    > | null>(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

    const { nodes, links } = useMemo(() => {
        if (!moai_nodes || !moai_links) return { nodes: [], links: [] };

        const nodes = moai_nodes.map((node) => ({
            ...node,
        })) as SimulationNode[];

        const links = moai_links.map((link) => ({
            ...link,
            source: link.from,
            target: link.to,
            relations: link.relations,
        })) as SimulationLink[];
        console.log(links);

        return { nodes, links };
    }, [moai_nodes, moai_links]);

    const updateDimensions = useCallback(() => {
        if (!containerRef.current) return;

        const { clientWidth, clientHeight } = containerRef.current;
        setDimensions({
            width: Math.max(clientWidth, 100),
            height: Math.max(clientHeight, 100),
        });
    }, []);

    useEffect(() => {
        updateDimensions();

        const resizeObserver = new ResizeObserver(updateDimensions);
        if (containerRef.current) {
            resizeObserver.observe(containerRef.current);
        }

        window.addEventListener('resize', updateDimensions);

        return () => {
            resizeObserver.disconnect();
            window.removeEventListener('resize', updateDimensions);
        };
    }, [updateDimensions]);

    const dragStarted = useCallback(
        (
            event: d3.D3DragEvent<SVGGElement, SimulationNode, SimulationNode>,
            d: SimulationNode,
        ) => {
            if (!simulationRef.current) return;
            if (!event.active) simulationRef.current.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
        },
        [],
    );

    const dragging = useCallback(
        (
            event: d3.D3DragEvent<SVGGElement, SimulationNode, SimulationNode>,
            d: SimulationNode,
        ) => {
            d.fx = event.x;
            d.fy = event.y;
        },
        [],
    );

    const dragEnded = useCallback(
        (
            event: d3.D3DragEvent<SVGGElement, SimulationNode, SimulationNode>,
            d: SimulationNode,
        ) => {
            if (!simulationRef.current) return;
            if (!event.active) simulationRef.current.alphaTarget(0);
            d.fx = null;
            d.fy = null;
        },
        [],
    );

    useEffect(() => {
        if (
            !svgRef.current ||
            !containerRef.current ||
            !nodes.length ||
            !links.length ||
            dimensions.width === 0 ||
            dimensions.height === 0
        )
            return;

        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();

        const { width, height } = dimensions;

        svg.attr('width', width)
            .attr('height', height)
            .attr('viewBox', `0 0 ${width} ${height}`)
            .attr('preserveAspectRatio', 'xMidYMid meet')
            .attr('xmlns', 'http://www.w3.org/2000/svg');

        const g = svg.append('g').attr('width', width).attr('height', height);

        const zoom = d3
            .zoom<SVGSVGElement, unknown>()
            .scaleExtent([0.1, 4])
            .on('zoom', (event) => {
                g.attr('transform', event.transform);
            });

        svg.call(zoom);

        const defs = svg.append('defs');

        const uniqueId = Math.random().toString(36).substring(2, 9);

        defs.append('marker')
            .attr('id', `arrowhead-${uniqueId}`)
            .attr('viewBox', '0 -5 10 10')
            .attr('refX', 10)
            .attr('refY', 0)
            .attr('orient', 'auto')
            .attr('markerWidth', 10)
            .attr('markerHeight', 10)
            .append('path')
            .attr('d', 'M0,-5L10,0L0,5')
            .attr('fill', '#525252');

        defs.append('marker')
            .attr('id', `arrowhead-reverse-${uniqueId}`)
            .attr('viewBox', '0 -5 10 10')
            .attr('refX', 10)
            .attr('refY', 0)
            .attr('orient', 'auto-start-reverse')
            .attr('markerWidth', 10)
            .attr('markerHeight', 10)
            .append('path')
            .attr('d', 'M0,-5L10,0L0,5')
            .attr('fill', '#525252');

        const simulation = d3
            .forceSimulation<SimulationNode>(nodes)
            .force(
                'link',
                d3
                    .forceLink<SimulationNode, SimulationLink>(links)
                    .id((d) => d.id)
                    .distance(100),
            )
            .force('charge', d3.forceManyBody().strength(-300).distanceMax(500))
            .force('center', d3.forceCenter(width / 2, height / 2))
            .force('collide', d3.forceCollide().radius(50))
            .alphaDecay(0.05);

        simulationRef.current = simulation;

        const link = g
            .append('g')
            .attr('class', 'links')
            .selectAll('g')
            .data(links)
            .join('g');

        const linkPath = link
            .append('path')
            .attr('stroke', '#525252')
            .attr('stroke-opacity', 0.8)
            .attr('stroke-width', 1.5)
            .attr('fill', 'none')
            .attr('marker-end', `url(#arrowhead-${uniqueId})`)
            .attr('marker-start', (d) =>
                d.bidirectional ? `url(#arrowhead-reverse-${uniqueId})` : '',
            );

        const linkText = link
            .append('text')
            .attr('font-size', 10)
            .attr('text-anchor', 'middle')
            .attr('dy', -5)
            .attr('fill', '#404040')
            .text((d) => d.relations || '');

        const node = g
            .append('g')
            .attr('class', 'nodes')
            .selectAll('.node')
            .data(nodes)
            .join('g')
            .attr('class', 'node');

        const drag = d3
            .drag<SVGGElement, SimulationNode>()
            .on('start', dragStarted)
            .on('drag', dragging)
            .on('end', dragEnded);

        node.call(drag as any);

        node.append('circle')
            .attr('r', 20)
            .attr('fill', (d) => '#1d4ed8')
            .attr('stroke', '#fafafa')
            .attr('stroke-width', 1.5);

        node.append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', '.3em')
            .attr('font-family', 'Arial, sans-serif')
            .attr('pointer-events', 'none')
            .text((d) => d.text)
            .attr('font-size', 10)
            .attr('fill', '#fafafa');

        simulation.on('tick', () => {
            requestAnimationFrame(() => {
                linkPath.attr('d', calculateLinkPath);

                linkText
                    .attr('x', (d) => {
                        const sx = (d.source as SimulationNode).x || 0;
                        const tx = (d.target as SimulationNode).x || 0;
                        return (sx + tx) / 2;
                    })
                    .attr('y', (d) => {
                        const sy = (d.source as SimulationNode).y || 0;
                        const ty = (d.target as SimulationNode).y || 0;
                        return (sy + ty) / 2;
                    });

                node.attr('transform', (d) => {
                    const x = d.x || 0;
                    const y = d.y || 0;
                    return `translate(${x.toFixed(2)}, ${y.toFixed(2)})`;
                });
            });
        });

        setTimeout(() => {
            svg.call(
                zoom.transform as any,
                d3.zoomIdentity.translate(width / 4, height / 4).scale(0.8),
            );
        }, 50);

        return () => {
            simulation.stop();
            simulationRef.current = null;
        };
    }, [nodes, links, dimensions, dragStarted, dragging, dragEnded]);

    return (
        <div
            ref={containerRef}
            style={{
                width: '100%',
                height: '100%',
                overflow: 'hidden',
            }}
        >
            <svg
                ref={svgRef}
                style={{
                    display: 'block',
                    width: '100%',
                    height: '100%',
                }}
            ></svg>
        </div>
    );
};

export default RelationGraph;
