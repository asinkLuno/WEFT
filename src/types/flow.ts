const TIME_UNITS = ['年', '月', '日', '时', '分', '秒'];

export type PhaseContextType = {
    base_time_name?: string;
    absolute_time: number[];
};

export function humanizeTime(phase: PhaseContextType | number[]): string {
    let phaseObj: PhaseContextType;
    if (Array.isArray(phase)) {
        phaseObj = {
            absolute_time: phase,
            base_time_name: undefined,
        };
    } else {
        phaseObj = phase;
    }

    // If absolute_time is undefined or empty, return early
    if (!phaseObj.absolute_time || phaseObj.absolute_time.length === 0) {
        return phaseObj.base_time_name || '';
    }

    // If all elements are zero
    if (phaseObj.absolute_time.every((value) => value === 0)) {
        return phaseObj.base_time_name
            ? `${phaseObj.base_time_name}的时间原点`
            : '时间原点';
    }

    // Convert time array to human readable format
    const timeString = phaseObj.absolute_time
        .map((value, index) =>
            value !== 0 && index < TIME_UNITS.length
                ? `${value}${TIME_UNITS[index]}`
                : '',
        )
        .filter((item) => item !== '')
        .join('');

    // Add base_time_name to front if available
    return phaseObj.base_time_name
        ? `${phaseObj.base_time_name} ${timeString}`
        : timeString;
}

export interface FlowContextType {
    title: string;
    description?: string;
    start_time: PhaseContextType;
    start_time_dt: Date;
    end_time?: PhaseContextType;
    end_time_dt?: Date;
    moais?: Array<{
        id: string;
        start_time_duration?: PhaseContextType;
        end_time_duration?: PhaseContextType;
    }>;
}

export type CateFlowContextType = { [key: string]: FlowContextType[] };

export const processFlowData = (rawData: any): CateFlowContextType => {
    const processedData: CateFlowContextType = {};

    Object.keys(rawData).forEach((category) => {
        processedData[category] = rawData[category].map((item: any) => ({
            ...item,
            start_time_dt: new Date(item.start_time_dt),
            end_time_dt: item.end_time ? new Date(item.end_time_dt) : undefined,
        }));
    });

    return processedData;
};
