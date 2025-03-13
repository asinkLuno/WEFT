// Add a type for supported locales
export type SupportedLocale = 'zh-CN' | 'en-US' | 'ja-JP' | 'zh-Classical';

const TIME_UNITS: { [key in SupportedLocale]: string[] } = {
    'zh-CN': ['年', '月', '日', '时', '分', '秒'],
    'en-US': ['y', 'mo', 'd', 'h', 'm', 's'],
    'ja-JP': ['年', '月', '日', '時', '分', '秒'],
    'zh-Classical': ['年', '月', '日', '時', '分', '秒'],
    // Add more locales as needed
};

const ZERO_TIME_TEXT: {
    [key in SupportedLocale]: {
        withBase: (base: string) => string;
        withoutBase: string;
    };
} = {
    'zh-CN': {
        withBase: (base: string) => `${base}的时间原点`,
        withoutBase: '时间原点',
    },
    'en-US': {
        withBase: (base: string) => `${base}'s starting point`,
        withoutBase: 'starting point',
    },
    'ja-JP': {
        withBase: (base: string) => `${base}の始点`,
        withoutBase: '始点',
    },
    'zh-Classical': {
        withBase: (base: string) => `${base}之始点`,
        withoutBase: '始点',
    },
    // Add more locales as needed
};

export type PhaseContextType = {
    base_time_name?: string;
    absolute_time: number[];
};

export function humanizeTime(
    phase: PhaseContextType | number[],
    locale: SupportedLocale,
): string {
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

    const timeUnits = TIME_UNITS[locale];
    const zeroTimeText = ZERO_TIME_TEXT[locale];

    // If all elements are zero
    if (phaseObj.absolute_time.every((value) => value === 0)) {
        return phaseObj.base_time_name
            ? zeroTimeText.withBase(phaseObj.base_time_name)
            : zeroTimeText.withoutBase;
    }

    // Convert time array to human readable format
    const timeString = phaseObj.absolute_time
        .map((value, index) =>
            value !== 0 && index < timeUnits.length
                ? `${value}${timeUnits[index]}`
                : '',
        )
        .filter((item) => item !== '')
        .join(locale === 'en-US' ? ' ' : '');

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
