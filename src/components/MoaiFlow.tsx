import React, { useEffect, useState, useRef } from 'react';
import { CateFlowContextType, processFlowData } from '../types/flow';
import GanttChart from './common/GanttChart';
import { useNavigate, useParams } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { UnlistenFn } from '@tauri-apps/api/event';
import { useTranslation } from 'react-i18next';
import MasonryCards from './common/MasonryCards';

const MoaiFlow: React.FC = () => {
    const navigate = useNavigate();
    const [moaiFlowList, setMoaiFlowList] = useState<
        CateFlowContextType | undefined
    >(undefined);
    const { title } = useParams<{ title?: string }>();
    const [moaiNames, setMoaiNames] = useState<Record<string, string>>({});
    const listenerRef = useRef<{ unlisten: UnlistenFn | null }>({
        unlisten: null,
    });
    const { t } = useTranslation();

    useEffect(() => {
        const fetchMoaiFlowList = async () => {
            const result = await invoke<CateFlowContextType>('moai_flow');
            setMoaiFlowList(processFlowData(result));
        };
        fetchMoaiFlowList();

        const setupListener = async () => {
            // 确保没有重复设置监听器
            if (listenerRef.current.unlisten) {
                await listenerRef.current.unlisten();
            }

            listenerRef.current.unlisten = await listen<CateFlowContextType>(
                'file-changed',
                async () => {
                    await fetchMoaiFlowList();
                },
            );
        };
        setupListener();

        return () => {
            // 组件卸载时清理监听器
            if (listenerRef.current.unlisten) {
                listenerRef.current.unlisten();
                listenerRef.current.unlisten = null;
            }
        };
    }, []);

    // 获取Moai名称
    useEffect(() => {
        if (!moaiFlowList) return;

        const fetchMoaiNames = async () => {
            const names = await Promise.all(
                Object.keys(moaiFlowList).map(async (category) => ({
                    id: category,
                    name: await invoke<string>('get_moai_full_name', {
                        id: category,
                    }),
                })),
            );
            setMoaiNames(
                Object.fromEntries(names.map((item) => [item.id, item.name])),
            );
        };

        fetchMoaiNames();
    }, [moaiFlowList]);

    const handleCardClick = (id: string) => {
        navigate(`/moaiflow/${encodeURIComponent(id)}`);
    };

    if (!moaiFlowList || Object.keys(moaiFlowList).length === 0) {
        return (
            <div className="bg-background flex h-full items-center justify-center">
                <p className="text-muted-foreground text-xl">
                    {t('moaiFlow.noData')}
                </p>
            </div>
        );
    }

    // 准备卡片数据
    const cardItems = Object.entries(moaiFlowList).map(
        ([category, moai_flow]) => ({
            id: category,
            title: moaiNames[category] || category,
            content: (
                <div className="h-64 overflow-hidden">
                    <GanttChart data={moai_flow} />
                </div>
            ),
        }),
    );

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
            />
        </div>
    );
};

export default MoaiFlow;
