import { useEffect, useRef, useState } from 'react';

interface DimensionObject {
    width: number | undefined;
    height: number | undefined;
}

export function useResizeObserver<T extends HTMLElement>(): [
    React.RefObject<T>,
    DimensionObject,
] {
    const ref = useRef<T>(null);
    const [dimensions, setDimensions] = useState<DimensionObject>({
        width: undefined,
        height: undefined,
    });

    useEffect(() => {
        const observeTarget = ref.current;
        if (!observeTarget) return;

        const resizeObserver = new ResizeObserver((entries) => {
            entries.forEach((entry) => {
                setDimensions({
                    width: entry.contentRect.width,
                    height: entry.contentRect.height,
                });
            });
        });

        resizeObserver.observe(observeTarget);

        return () => {
            resizeObserver.unobserve(observeTarget);
        };
    }, []);

    return [ref, dimensions];
}
