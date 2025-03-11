import { useNavigate } from 'react-router-dom';
import { humanizeTime, PhaseContextType } from '../types/flow';
import RiverVerticalTabs from './common/RiverVerticalTabs';
import { invoke } from '@tauri-apps/api/core';
import { useEffect, useState } from 'react';
import { logError } from '@/utils/logger';
import { listen, UnlistenFn } from '@tauri-apps/api/event';


export interface MoaiContextType {
    full_name?: string;
    base_time?: PhaseContextType;
    description?: string;
    juncture: Record<string, PhaseContextType> | null;
    [key: string]: any; // 用于 extra_props 的动态属性
}

export type MoaiListContextType = { [key: string]: MoaiContextType };


const loadAllMoaiFullNames = async (moaiList: MoaiListContextType) => {
    try {
        const moaiEntries = Object.entries(moaiList);
        const fullNames = await Promise.all(
            moaiEntries.map(async ([id]) => ({
                id,
                fullName: await invoke<string>('get_moai_full_name', { id }),
            }))
        );
        return Object.fromEntries(
            fullNames.map(({ id, fullName }) => [id, fullName])
        );
    } catch (error) {
        logError(`Failed to load all Moai full names: ${error}`);
        return Object.fromEntries(
            Object.keys(moaiList).map(id => [id, id])
        );
    }
};

const MoaiList: React.FC = () => {
    const navigate = useNavigate();
    const [moaiList, setMoaiList] = useState<MoaiListContextType | undefined>(undefined);
    const [moaiFullNames, setMoaiFullNames] = useState<Record<string, string>>({});
    const [value, setValue] = useState(0);
    const [tabs, setTabs] = useState<any[]>([]);

    // 获取Moai列表数据
    useEffect(() => {
        let unlisten: UnlistenFn;
        
        const fetchMoaiList = async () => {
            try {
                const moaiListData = await invoke<MoaiListContextType>('get_all_moais');
                setMoaiList(moaiListData);
                const fullNames = await loadAllMoaiFullNames(moaiListData);
                setMoaiFullNames(fullNames);
            } catch (error) {
                logError(`Failed to fetch moai list: ${error}`);
            }
        };

        // 设置文件变化监听器
        const setupListener = async () => {
            unlisten = await listen<MoaiListContextType>('file-changed', async () => {
                await fetchMoaiList();
            });
        };

        // 初始化时获取数据并设置监听器
        fetchMoaiList();
        setupListener();

        // 清理函数
        return () => {
            if (unlisten) {
                unlisten();
            }
        };
    }, []);

    useEffect(() => {
        if (!moaiList) return;

        const loadTabData = async () => {
            try {
                const loadedTabs = Object.entries(moaiList).map(([id, moai]) => ({
                    label: moaiFullNames[id] || id,
                    key: id,
                    content: (
                        <>
                            <h2 className="text-xl font-semibold">
                                {moai.full_name || id}
                            </h2>
                            {moai.description && (
                                <p className="text-muted-foreground">
                                    {moai.description}
                                </p>
                            )}
                            {moai.base_time && (
                                <p className="text-sm text-muted-foreground">
                                    Base Time: {humanizeTime(moai.base_time)}
                                </p>
                            )}

                            <div
                                className="mt-4 grid grid-cols-2 gap-4"
                            >
                                {Object.entries(moai).map(([key, value]) => {
                                    if (
                                        [
                                            'full_name',
                                            'description',
                                            'base_time',
                                            'juncture',
                                            'material',
                                        ].includes(key)
                                    )
                                        return null;

                                    return (
                                        <div
                                            key={key}
                                            className="p-2 bg-muted rounded-md"
                                        >
                                            <p className="text-xs font-medium text-muted-foreground uppercase">
                                                {key.replace(/_/g, ' ')}
                                            </p>
                                            <p className="text-sm">
                                                {typeof value === 'object'
                                                    ? JSON.stringify(value)
                                                    : value}
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>

                            {moai.juncture &&
                                Object.entries(moai.juncture).length > 0 && (
                                    <div className="mt-4">
                                        <h3 className="text-lg font-medium mb-2">
                                            Junctures:
                                        </h3>
                                        {Object.entries(moai.juncture).map(
                                            ([key, value]) => (
                                                <p
                                                    key={key}
                                                    className="text-sm"
                                                >
                                                    {key}: {humanizeTime(value)}
                                                </p>
                                            ),
                                        )}
                                    </div>
                                )}
                        </>
                    ),
                }));
                setTabs(loadedTabs);
            } catch (error) {
                logError(`Failed to load tab data: ${error}`);
            }
        };

        loadTabData();
    }, [moaiList, moaiFullNames]);

    const handleChange = (_: React.SyntheticEvent, newValue: number) => {
        const moaiEntries = Object.entries(moaiList || {});
        if (moaiEntries[newValue]) {
            navigate(`/moai/${moaiEntries[newValue][0]}`);
            setValue(newValue);
        }
    };

    if (!moaiList || Object.keys(moaiList).length === 0) {
        return (
            <div
                className="flex h-full items-center justify-center bg-background"
            >
                <p className="text-xl text-muted-foreground">
                    暂无可用Moai
                </p>
            </div>
        );
    }

    return (
        <RiverVerticalTabs
            tabs={tabs}
            value={value}
            onChange={handleChange}
            sortTabs={true}
            sortKey={(tab) => tab.label}
        />
    );
};

export default MoaiList;
