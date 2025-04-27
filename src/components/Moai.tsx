import { useNavigate } from 'react-router-dom';
import { humanizeTime, PhaseContextType, SupportedLocale } from '../types/flow';
import { invoke } from '@tauri-apps/api/core';
import { useEffect, useState, useRef } from 'react';
import { logError } from '@/utils/logger';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import MasonryCards from './common/MasonryCards';

export interface MoaiContextType {
    full_name?: string;
    base_time?: PhaseContextType;
    description?: string;
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
            })),
        );
        return Object.fromEntries(
            fullNames.map(({ id, fullName }) => [id, fullName]),
        );
    } catch (error) {
        logError(`Failed to load all Moai full names: ${error}`);
        return Object.fromEntries(Object.keys(moaiList).map((id) => [id, id]));
    }
};

interface MoaiListProps {
    searchQuery?: string;
}

const MoaiList: React.FC<MoaiListProps> = ({ searchQuery = '' }) => {
    const navigate = useNavigate();
    const [moaiList, setMoaiList] = useState<MoaiListContextType | undefined>(
        undefined,
    );
    const [moaiFullNames, setMoaiFullNames] = useState<Record<string, string>>(
        {},
    );
    const listenerRef = useRef<{ unlisten: UnlistenFn | null }>({
        unlisten: null,
    });
    const { t } = useTranslation();
    const locale = i18n.language;

    // 获取Moai列表数据
    useEffect(() => {
        const fetchMoaiList = async () => {
            try {
                const moaiListData =
                    await invoke<MoaiListContextType>('get_all_moais');
                setMoaiList(moaiListData);
                setMoaiFullNames(await loadAllMoaiFullNames(moaiListData));
            } catch (error) {
                logError(`Failed to fetch moai list: ${error}`);
            }
        };

        // 设置文件变化监听器
        const setupListener = async () => {
            // 确保没有重复设置监听器
            if (listenerRef.current.unlisten) {
                await listenerRef.current.unlisten();
            }

            listenerRef.current.unlisten = await listen<MoaiListContextType>(
                'file-changed',
                async () => {
                    await fetchMoaiList();
                },
            );
        };

        // 初始化时获取数据并设置监听器
        fetchMoaiList();
        setupListener();

        // 清理函数
        return () => {
            if (listenerRef.current.unlisten) {
                listenerRef.current.unlisten();
                listenerRef.current.unlisten = null;
            }
        };
    }, []);

    const handleCardClick = (id: string) => {
        navigate(`/moai/${id}`);
    };

    if (!moaiList || Object.keys(moaiList).length === 0) {
        return (
            <div className="bg-background flex h-full items-center justify-center">
                <p className="text-muted-foreground text-xl">
                    {t('moai.noData')}
                </p>
            </div>
        );
    }

    // 将moaiList转换为MasonryItem数组
    const cardItems = Object.entries(moaiList).map(([id, moai]) => ({
        id,
        title: moaiFullNames[id] || id,
        description: moai.description,
        content: (
            <div>
                {moai.base_time && (
                    <p className="text-muted-foreground mb-4 text-sm">
                        Base Time:{' '}
                        {humanizeTime(
                            moai.base_time,
                            locale as SupportedLocale,
                        )}
                    </p>
                )}
                <div className="grid grid-cols-2 gap-4">
                    {Object.entries(moai).map(([key, value]) => {
                        if (
                            ['full_name', 'description', 'base_time'].includes(
                                key,
                            )
                        )
                            return null;

                        return (
                            <div key={key} className="bg-muted rounded-md p-2">
                                <p className="text-muted-foreground text-xs font-medium uppercase">
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
            </div>
        ),
    }));

    // 按标题排序
    const sortedItems = [...cardItems].sort((a, b) =>
        a.title.localeCompare(b.title),
    );

    return (
        <div className="h-full w-full overflow-hidden">
            <MasonryCards
                items={sortedItems}
                onItemClick={handleCardClick}
                columnCount={3}
                searchQuery={searchQuery}
            />
        </div>
    );
};

export default MoaiList;
