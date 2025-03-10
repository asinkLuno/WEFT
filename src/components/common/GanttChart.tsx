import React, {
    useState,
    useMemo,
    useCallback,
    useRef,
    useEffect,
} from 'react';
import { scaleTime, scaleBand } from 'd3-scale';
import { timeFormat } from 'd3-time-format';
import { FlowContextType, humanizeTime } from '../../context/DaoContext';
import { useResizeObserver } from './hooks/useResizeObserver';
import './GanttChart.css';
import { invoke } from '@tauri-apps/api/core';

// Throttle function to limit the rate of function calls
const throttle = <T extends (...args: any[]) => any>(
    func: T,
    limit: number,
): T => {
    let inThrottle: boolean;
    let lastResult: ReturnType<T>;

    return ((...args: Parameters<T>): ReturnType<T> => {
        if (!inThrottle) {
            inThrottle = true;
            lastResult = func(...args);
            setTimeout(() => (inThrottle = false), limit);
        }
        return lastResult;
    }) as T;
};

interface GanttChartProps {
    data: FlowContextType[];
    width?: number;
    height?: number;
    barHeight?: number;
}

interface Task {
    id: string;
    title: string;
    startTime: string;
    startTimeDT: Date;
    endTimeDT?: Date;
    endTime?: string;
    description?: string;
    moais?: Array<{
        id: string;
        start_time_duration?: string; // Add this field
        end_time_duration?: string; // Add this field
    }>;
}

interface ZoomTransform {
    scale: number;
    translateX: number;
}

const TEXT_PADDING = 10; // Padding for text inside bars
const MIN_TICK_SPACING = 80; // Minimum pixels between date ticks
const TIMELINE_HEIGHT = 50; // Fixed height for the timeline
const ZOOM_SENSITIVITY = 0.002; // Zoom sensitivity factor
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 50;

// Date formatters for different zoom levels
const dateFormatters = {
    seconds: timeFormat('%H:%M:%S'),
    minutes: timeFormat('%H:%M'),
    detailed: timeFormat('%Y-%m-%d %H:%M'),
    day: timeFormat('%m-%d'),
    month: timeFormat('%Y-%m'),
    year: timeFormat('%Y'),
};

// Helper function to calculate time extent
const getTimeExtent = (tasks: Task[]): [Date, Date] => {
    const dates = tasks
        .flatMap((t) => [t.startTimeDT, t.endTimeDT])
        .filter((d): d is Date => d !== undefined);
    if (dates.length === 0) {
        return [new Date(), new Date()];
    }
    const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));

    // Add some padding to the time range
    const padding = (maxDate.getTime() - minDate.getTime()) * 0.05;
    return [
        new Date(minDate.getTime() - padding),
        new Date(maxDate.getTime() + padding),
    ];
};

// Timeline component to reduce main component complexity
const Timeline = React.memo(
    ({
        transform,
        timeAxisTicks,
        xScale,
        width,
        margin,
    }: {
        transform: ZoomTransform;
        timeAxisTicks: Array<{ date: Date; x: number; label: string }>;
        xScale: any;
        width: number;
        margin: { top: number; right: number; bottom: number; left: number };
    }) => {
        const timelineRef = useRef<SVGSVGElement>(null);

        return (
            <div
                className="gantt-chart__timeline"
                style={{
                    height: TIMELINE_HEIGHT,
                    borderTop: '1px solid #e2e8f0',
                    position: 'relative',
                    overflow: 'hidden',
                }}
            >
                <div
                    style={{
                        position: 'relative',
                        height: '100%',
                        overflow: 'hidden',
                    }}
                >
                    <svg
                        ref={timelineRef}
                        width={
                            width * Math.max(transform.scale, 1) + margin.right
                        }
                        height={TIMELINE_HEIGHT}
                        style={{
                            display: 'block',
                            overflow: 'visible',
                        }}
                    >
                        <g transform={`translate(${transform.translateX},0)`}>
                            {/* Timeline ticks and labels */}
                            {timeAxisTicks.map((tick, i) => (
                                <g key={i} transform={`translate(${tick.x},0)`}>
                                    <line
                                        y1={0}
                                        y2={10}
                                        stroke="#718096"
                                        strokeWidth={1}
                                    />
                                    <text
                                        className="gantt-chart__axis-label"
                                        y={25}
                                        textAnchor="middle"
                                        fontSize="12px"
                                        fill="#4a5568"
                                    >
                                        {tick.label}
                                    </text>
                                </g>
                            ))}

                            {/* Today indicator if in range */}
                            {(() => {
                                const today = new Date();
                                const [minDate, maxDate] = xScale.domain();
                                if (today >= minDate && today <= maxDate) {
                                    const todayX = xScale(today);
                                    return (
                                        <g transform={`translate(${todayX},0)`}>
                                            <line
                                                y1={0}
                                                y2={TIMELINE_HEIGHT}
                                                stroke="#e53e3e"
                                                strokeWidth={2}
                                                strokeDasharray="4,4"
                                            />
                                            <text
                                                y={TIMELINE_HEIGHT - 5}
                                                x={5}
                                                fontSize="10px"
                                                fill="#e53e3e"
                                            >
                                                Today
                                            </text>
                                        </g>
                                    );
                                }
                                return null;
                            })()}
                        </g>
                    </svg>
                </div>
            </div>
        );
    },
);

// Add this component near the top of your file
const MoaiName: React.FC<{ id: string }> = ({ id }) => {
    const [name, setName] = useState<string>(id);

    useEffect(() => {
        const fetchName = async () => {
            try {
                const fullName = await invoke<string>('get_moai_full_name', {
                    id,
                });
                setName(fullName);
            } catch (error) {
                console.error('Failed to fetch moai name:', error);
            }
        };

        fetchName();
    }, [id]);

    return <>{name}</>;
};

const GanttChart: React.FC<GanttChartProps> = ({
    data,
    width: propWidth,
    height: propHeight,
    barHeight = 30,
}) => {
    const [containerRef, { width: containerWidth, height: containerHeight }] =
        useResizeObserver<HTMLDivElement>();
    const chartContentRef = useRef<HTMLDivElement>(null);
    const [hoveredTask, setHoveredTask] = useState<Task | null>(null);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [transform, setTransform] = useState<ZoomTransform>({
        scale: 1,
        translateX: 0,
    });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, translateX: 0 });
    const textRefs = useRef<Map<string, SVGTextElement>>(new Map());
    const svgRef = useRef<SVGSVGElement>(null);

    // Convert incoming data to internal task format
    const tasks = useMemo(
        () =>
            data.map((item, index) => ({
                id: `task-${index}`,
                title: item.title,
                startTime: humanizeTime(item.start_time),
                startTimeDT: item.start_time_dt,
                endTime: item.end_time
                    ? humanizeTime(item.end_time)
                    : undefined,
                endTimeDT: item.end_time_dt,
                description: item.description,
                moais: item.moais?.map((moai) => ({
                    id: moai.id,
                    start_time_duration: moai.start_time_duration
                        ? humanizeTime(moai.start_time_duration)
                        : undefined,
                    end_time_duration: moai.end_time_duration
                        ? humanizeTime(moai.end_time_duration)
                        : undefined,
                })),
            })),
        [data],
    );

    // Calculate dimensions - with proper height calculation
    const width = containerWidth || propWidth || 1000;
    const availableHeight = containerHeight || propHeight || 400; // Container visible height
    const totalTasksHeight = tasks.length * (barHeight + 10); // Total height needed for all tasks
    const margin = { top: 20, right: 20, bottom: 30, left: 20 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = totalTasksHeight; // This is the scrollable content height

    // Create scales
    const { xScale, yScale, timeExtent } = useMemo(() => {
        const timeExtent = getTimeExtent(tasks);

        const xScale = scaleTime()
            .domain(timeExtent)
            .range([0, innerWidth * transform.scale]);

        const yScale = scaleBand()
            .domain(tasks.map((d) => d.title))
            .range([0, innerHeight])
            .padding(0.2);

        return { xScale, yScale, timeExtent };
    }, [tasks, innerWidth, innerHeight, transform.scale]);

    // Handle window resize with transform adjustment
    useEffect(() => {
        if (transform.scale > 1) {
            const maxTranslate = innerWidth * (transform.scale - 1);
            if (transform.translateX < -maxTranslate) {
                setTransform((prev) => ({
                    ...prev,
                    translateX: Math.max(-maxTranslate, prev.translateX),
                }));
            }
        } else {
            // Reset transform if scale <= 1
            if (transform.translateX !== 0) {
                setTransform((prev) => ({
                    ...prev,
                    translateX: 0,
                }));
            }
        }
    }, [innerWidth, transform.scale]);

    // Keyboard event handler (zoom/pan)
    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            // Only handle if chart is focused
            if (
                !containerRef.current?.contains(document.activeElement) &&
                document.activeElement !== document.body
            ) {
                return;
            }

            if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                e.preventDefault();

                // Zoom in/out centered on visible area
                const zoomDirection = e.key === 'ArrowUp' ? 1 : -1;
                const zoomFactor = Math.exp(zoomDirection * 0.2);
                const newScale = Math.min(
                    MAX_ZOOM,
                    Math.max(MIN_ZOOM, transform.scale * zoomFactor),
                );

                // Calculate visible center
                const visibleCenter = -transform.translateX + innerWidth / 2;
                const visibleCenterTime = xScale.invert(visibleCenter);

                // Apply new scale
                const updatedXScale = scaleTime()
                    .domain(timeExtent)
                    .range([0, innerWidth * newScale]);

                // Calculate new position
                const newCenter = updatedXScale(visibleCenterTime);
                const newTranslateX = -newCenter + innerWidth / 2;

                // Apply bounds
                const maxTranslate = innerWidth * (newScale - 1);
                const boundedTranslateX = Math.min(
                    0,
                    Math.max(newTranslateX, -maxTranslate),
                );

                setTransform({
                    scale: newScale,
                    translateX: boundedTranslateX,
                });
            }

            if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                e.preventDefault();
                const scrollAmount = innerWidth * 0.1;
                const delta =
                    e.key === 'ArrowLeft' ? scrollAmount : -scrollAmount;
                const newTranslateX = transform.translateX + delta;
                const maxTranslate = innerWidth * (transform.scale - 1);

                setTransform((prev) => ({
                    ...prev,
                    translateX: Math.min(
                        0,
                        Math.max(newTranslateX, -maxTranslate),
                    ),
                }));
            }
        },
        [transform, innerWidth, containerRef, xScale, timeExtent],
    );

    // Set up keyboard event listeners
    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    // Wheel event handler (for shift+scroll = horizontal scrolling)
    const handleWheel = useCallback(
        (e: React.WheelEvent) => {
            // Support for trackpad horizontal scrolling
            if (e.shiftKey || Math.abs(e.deltaX) > 0) {
                e.preventDefault();
                e.stopPropagation();

                const scrollSpeed = 1.5;
                // Use deltaX for natural horizontal scrolling if available, otherwise use deltaY with shift
                const delta =
                    Math.abs(e.deltaX) > 0
                        ? e.deltaX * scrollSpeed
                        : e.deltaY * scrollSpeed;

                const newTranslateX = transform.translateX - delta;
                const maxTranslate = innerWidth * (transform.scale - 1);

                setTransform((prev) => ({
                    ...prev,
                    translateX: Math.min(
                        0,
                        Math.max(newTranslateX, -maxTranslate),
                    ),
                }));

                return false;
            }
        },
        [transform.translateX, innerWidth, transform.scale],
    );

    // Natural scroll handler (just for explicit type safety)
    const handleScroll = useCallback(() => {
        // Allow natural scrolling behavior
    }, []);

    // Mouse position update (throttled for performance)
    const updateMousePosition = useCallback(
        throttle((e: React.MouseEvent) => {
            setMousePos({
                x: e.clientX,
                y: e.clientY,
            });
        }, 16),
        [],
    ); // 60fps throttle

    // Mouse down handler for panning
    const handleMouseDown = useCallback(
        (e: React.MouseEvent) => {
            if (e.button !== 0) return;

            updateMousePosition(e);
            setIsDragging(true);
            setDragStart({
                x: e.clientX,
                translateX: transform.translateX,
            });
        },
        [updateMousePosition, transform.translateX],
    );

    // Mouse move handler (throttled)
    const handleMouseMove = useCallback(
        throttle((e: React.MouseEvent) => {
            updateMousePosition(e);

            if (isDragging) {
                const dx = e.clientX - dragStart.x;
                const newTranslateX = dragStart.translateX + dx;
                const maxTranslate = innerWidth * (transform.scale - 1);

                setTransform((prev) => ({
                    ...prev,
                    translateX: Math.min(
                        0,
                        Math.max(newTranslateX, -maxTranslate),
                    ),
                }));
            }
        }, 16),
        [
            isDragging,
            dragStart,
            innerWidth,
            transform.scale,
            updateMousePosition,
        ],
    );

    // Mouse up handler
    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
    }, []);

    // Document-level event listeners for drag handling
    useEffect(() => {
        if (isDragging) {
            const handleDocumentMouseMove = (e: MouseEvent) => {
                handleMouseMove(e as unknown as React.MouseEvent);
            };

            const handleDocumentMouseUp = () => {
                handleMouseUp();
            };

            document.addEventListener('mousemove', handleDocumentMouseMove);
            document.addEventListener('mouseup', handleDocumentMouseUp);
            document.body.style.cursor = 'grabbing';

            return () => {
                document.removeEventListener(
                    'mousemove',
                    handleDocumentMouseMove,
                );
                document.removeEventListener('mouseup', handleDocumentMouseUp);
                document.body.style.cursor = '';
            };
        }
    }, [isDragging, handleMouseMove, handleMouseUp]);

    // Clean up textRefs on unmount
    useEffect(() => {
        return () => {
            textRefs.current.clear();
        };
    }, []);

    // Generate time axis ticks with optimized calculation
    const timeAxisTicks = useMemo(() => {
        // Use approximate tick count based on container width and scale
        const approximateTickCount = Math.max(
            2,
            Math.floor((innerWidth * transform.scale) / 200),
        );
        const ticks = xScale.ticks(approximateTickCount);

        // Determine formatter based on time span
        const [minDate, maxDate] = xScale.domain();
        const timeSpan = maxDate.getTime() - minDate.getTime();
        const visibleTimeSpan = timeSpan / transform.scale;

        let dateFormatter;
        if (visibleTimeSpan < 300000) {
            // < 5 minutes, show seconds
            dateFormatter = dateFormatters.seconds;
        } else if (visibleTimeSpan < 7200000) {
            // < 2 hours, show minutes
            dateFormatter = dateFormatters.minutes;
        } else if (visibleTimeSpan < 86400000) {
            // < 1 day
            dateFormatter = dateFormatters.detailed;
        } else if (visibleTimeSpan < 2592000000) {
            // < 30 days
            dateFormatter = dateFormatters.day;
        } else if (visibleTimeSpan < 31536000000) {
            // < 1 year
            dateFormatter = dateFormatters.month;
        } else {
            dateFormatter = dateFormatters.year;
        }

        // Dynamic minimum tick spacing based on zoom level
        const dynamicMinTickSpacing = Math.max(
            MIN_TICK_SPACING,
            Math.min(200, MIN_TICK_SPACING * (transform.scale / 10)),
        );

        // Calculate tick spacing and filter if needed
        let skipFactor = 1;
        if (ticks.length >= 2) {
            const tickDistance = Math.abs(xScale(ticks[1]) - xScale(ticks[0]));
            skipFactor =
                tickDistance < dynamicMinTickSpacing
                    ? Math.ceil(dynamicMinTickSpacing / tickDistance)
                    : 1;
        }

        return ticks
            .filter((_, i) => i % skipFactor === 0)
            .map((tick, i) => ({
                date: tick,
                x: xScale(tick),
                label: dateFormatter(tick),
            }));
    }, [xScale, innerWidth, transform.scale]);

    // Check if text should be inside bar
    const shouldShowTextInside = useCallback(
        (taskId: string, barWidth: number) => {
            const textElement = textRefs.current.get(taskId);
            if (!textElement) return false;

            const textWidth = textElement.getBBox().width;
            return barWidth > textWidth + TEXT_PADDING * 2;
        },
        [],
    );

    // Render task bars or milestones
    const renderTasks = useMemo(() => {
        return tasks.map((task) => {
            const y = yScale(task.title)!;
            const x = xScale(task.startTimeDT);

            // Render bar for tasks with duration
            if (task.endTimeDT) {
                const width = Math.max(1, xScale(task.endTimeDT) - x);
                const showInside = shouldShowTextInside(task.id, width);

                return (
                    <g key={task.id}>
                        <rect
                            className="gantt-chart__task-bar"
                            x={x}
                            y={y}
                            width={width}
                            height={yScale.bandwidth()}
                            rx={4}
                            fill="#1d4ed8"
                            onMouseEnter={() => setHoveredTask(task)}
                            onMouseLeave={() => setHoveredTask(null)}
                        />
                        <text
                            ref={(el) =>
                                el && textRefs.current.set(task.id, el)
                            }
                            className="gantt-chart__title"
                            x={
                                showInside
                                    ? x + TEXT_PADDING
                                    : x + width + TEXT_PADDING
                            }
                            y={y + yScale.bandwidth() / 2}
                            fill={showInside ? 'white' : '#2d3748'}
                            dominantBaseline="middle"
                            pointerEvents="none"
                        >
                            {task.title}
                        </text>
                    </g>
                );
            }

            // Render circle for milestones
            return (
                <g key={task.id}>
                    <circle
                        className="gantt-chart__milestone"
                        cx={x}
                        cy={y + yScale.bandwidth() / 2}
                        r={6}
                        fill="#f56565"
                        onMouseEnter={() => setHoveredTask(task)}
                        onMouseLeave={() => setHoveredTask(null)}
                    />
                    <text
                        ref={(el) => el && textRefs.current.set(task.id, el)}
                        className="gantt-chart__title"
                        x={x + 10}
                        y={y + yScale.bandwidth() / 2}
                        fill="#2d3748"
                        dominantBaseline="middle"
                        pointerEvents="none"
                    >
                        {task.title}
                    </text>
                </g>
            );
        });
    }, [tasks, xScale, yScale, shouldShowTextInside]);

    // Empty state render
    if (tasks.length === 0) {
        return (
            <div
                className="gantt-chart"
                ref={containerRef}
                style={{ width: '100%', height: '100%' }}
            >
                <div className="gantt-chart__empty-state">
                    No data available to display
                </div>
            </div>
        );
    }

    // Main render
    return (
        <div
            ref={containerRef}
            className="gantt-chart"
            style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                outline: 'none',
            }}
            tabIndex={0}
            onMouseMove={handleMouseMove}
        >
            {/* Main scrollable content area */}
            <div
                ref={chartContentRef}
                className="gantt-chart__content"
                style={{
                    flex: 1,
                    overflow: 'auto',
                    position: 'relative',
                }}
                onWheel={handleWheel}
                onScroll={handleScroll}
            >
                {/* Gantt chart content */}
                <div
                    className="gantt-chart__svg-container"
                    style={{
                        cursor: isDragging ? 'grabbing' : 'grab',
                        height: innerHeight,
                        minHeight: '100%',
                    }}
                    onMouseDown={handleMouseDown}
                >
                    <svg
                        ref={svgRef}
                        width={
                            innerWidth * Math.max(transform.scale, 1) +
                            margin.right
                        }
                        height={innerHeight}
                        style={{
                            display: 'block',
                            overflow: 'visible',
                        }}
                    >
                        <g transform={`translate(${transform.translateX},0)`}>
                            {/* Grid lines */}
                            {timeAxisTicks.map((tick, i) => (
                                <line
                                    key={i}
                                    className="gantt-chart__grid-line"
                                    x1={tick.x}
                                    y1={0}
                                    x2={tick.x}
                                    y2={innerHeight}
                                    stroke="#e2e8f0"
                                    strokeDasharray={
                                        i % 2 === 0 ? 'none' : '3,3'
                                    }
                                />
                            ))}
                            {/* Task bars */}
                            {renderTasks}
                        </g>
                    </svg>
                </div>
            </div>

            {/* Fixed timeline at bottom - extracted to separate component */}
            <Timeline
                transform={transform}
                timeAxisTicks={timeAxisTicks}
                xScale={xScale}
                width={innerWidth}
                margin={margin}
            />

            {/* Tooltip */}
            {hoveredTask && (
                <div
                    className="gantt-chart__tooltip"
                    style={{
                        position: 'fixed',
                        left: `${mousePos.x + 15}px`,
                        top: `${mousePos.y + 15}px`,
                        background: 'white',
                        border: '1px solid #e2e8f0',
                        borderRadius: '4px',
                        padding: '8px 12px',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                        zIndex: 9999,
                        pointerEvents: 'none',
                        maxWidth: '300px',
                    }}
                >
                    {hoveredTask.description && (
                        <div style={{ fontWeight: 'bold' }}>
                            {hoveredTask.description}
                        </div>
                    )}

                    <div
                        style={{
                            fontSize: '0.9em',
                            color: '#4a5568',
                            marginBottom: '4px',
                        }}
                    >
                        {hoveredTask.startTime}
                        {hoveredTask.endTime ? `-${hoveredTask.endTime}` : ''}
                    </div>

                    {hoveredTask.moais && hoveredTask.moais.length > 0 && (
                        <div
                            style={{
                                fontSize: '0.9em',
                                color: '#4a5568',
                                marginTop: '8px',
                            }}
                        >
                            <hr
                                style={{
                                    margin: '8px 0',
                                    border: 'none',
                                    borderTop: '1px solid #e2e8f0',
                                }}
                            />
                            {hoveredTask.moais.map((moai, index) => (
                                <div key={index} style={{ marginTop: '4px' }}>
                                    <MoaiName id={moai.id} />:{' '}
                                    {!moai.start_time_duration &&
                                    !moai.end_time_duration ? (
                                        '参与'
                                    ) : (
                                        <>
                                            {moai.start_time_duration}
                                            {moai.end_time_duration
                                                ? ` - ${moai.end_time_duration}`
                                                : ''}
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Controls help indicator */}
            <div
                className="gantt-chart__controls-help"
                style={{
                    position: 'absolute',
                    bottom: TIMELINE_HEIGHT + 5,
                    right: 10,
                    background: 'rgba(255,255,255,0.8)',
                    padding: '5px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    color: '#718096',
                    pointerEvents: 'none',
                }}
            >
                ↕️ Scroll | Shift+↕️ Pan horizontally | ↑↓ Zoom
            </div>
        </div>
    );
};

// Add CSS file for styling
export default React.memo(GanttChart);
