import React, {
    createContext,
    Dispatch,
    SetStateAction,
    useState,
    useContext,
} from 'react';

export interface StoryContextType {
    title: string;
    description?: string;
}

export interface MoaiContextType {
    full_name?: string;
    base_time?: phaseContextType;
    description?: string;
    juncture: Record<string, phaseContextType> | null;
    [key: string]: any; // 用于 extra_props 的动态属性
}

export type MoaiListContextType = { [key: string]: MoaiContextType };

interface MoaiLinkNode {
    id: string;
    text: string;
    nodeShape?: number;
}
interface MoaiLinkLine {
    from: string;
    to: string;
    relations?: string;
    bidirectional: boolean;
}

export interface MoaiLinkContextType {
    moai_nodes: MoaiLinkNode[];
    moai_links: MoaiLinkLine[];
}

export type MoaiLinkListContextType = { [key: string]: MoaiLinkContextType };

// Time unit labels for humanized display
const TIME_UNITS = ['年', '月', '日', '时', '分', '秒'];

type phaseContextType = {
    base_time_name?: string;
    absolute_time: number[];
};

// Function to adjust and humanize time arrays

export function humanizeTime(phase: phaseContextType | number[]): string {
    let phaseObj: phaseContextType;
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
    start_time: phaseContextType;
    start_time_dt: Date;
    end_time?: phaseContextType;
    end_time_dt?: Date;
    moais?: Array<{
        id: string;
        start_time_duration?: phaseContextType; // Add this field
        end_time_duration?: phaseContextType; // Add this field
    }>;
}
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
export type CateFlowContextType = { [key: string]: FlowContextType[] };

export interface DaoContextType {
    story?: StoryContextType;
    setStory: Dispatch<SetStateAction<StoryContextType | undefined>>;

    moaiList?: MoaiListContextType;
    setMoaiList: Dispatch<SetStateAction<MoaiListContextType | undefined>>;

    moaiLinkList?: MoaiLinkListContextType;
    setMoaiLinkList: Dispatch<
        SetStateAction<MoaiLinkListContextType | undefined>
    >;

    driftFlowList: CateFlowContextType | undefined;
    setDriftFlowList: React.Dispatch<
        React.SetStateAction<CateFlowContextType | undefined>
    >;

    moaiFlowList: CateFlowContextType | undefined;
    setMoaiFlowList: React.Dispatch<
        React.SetStateAction<CateFlowContextType | undefined>
    >;

    narrativeFlowList: CateFlowContextType | undefined;
    setNarrativeFlowList: React.Dispatch<
        React.SetStateAction<CateFlowContextType | undefined>
    >;
}

const DaoContext = createContext<DaoContextType | undefined>(undefined);

export const DaoProvider: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    const [story, setStory] = useState<StoryContextType | undefined>(undefined);
    const [moaiList, setMoaiList] = useState<MoaiListContextType | undefined>(
        undefined,
    );
    const [moaiLinkList, setMoaiLinkList] = useState<
        MoaiLinkListContextType | undefined
    >(undefined);

    const [driftFlowList, setDriftFlowList] = useState<
        CateFlowContextType | undefined
    >(undefined);
    const [moaiFlowList, setMoaiFlowList] = useState<
        CateFlowContextType | undefined
    >(undefined);
    const [narrativeFlowList, setNarrativeFlowList] = useState<
        CateFlowContextType | undefined
    >(undefined);

    return (
        <DaoContext.Provider
            value={{
                story,
                setStory,
                moaiList,
                setMoaiList,
                moaiLinkList,
                setMoaiLinkList,
                driftFlowList,
                setDriftFlowList,
                moaiFlowList,
                setMoaiFlowList,
                narrativeFlowList,
                setNarrativeFlowList,
            }}
        >
            {children}
        </DaoContext.Provider>
    );
};

export function useDaoContext() {
    const context = useContext(DaoContext);
    if (!context) {
        throw new Error('useDao must be used within a DaoProvider');
    }
    return context;
}
