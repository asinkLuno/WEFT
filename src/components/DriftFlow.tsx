import React, { useEffect, useState, useRef } from 'react';
import { CateFlowContextType, processFlowData } from '../types/flow';
import { useNavigate, useParams } from 'react-router-dom';
import GanttChart from './common/GanttChart';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { UnlistenFn } from '@tauri-apps/api/event';
import { useTranslation } from 'react-i18next';
import MasonryCards from './common/MasonryCards';

const DriftFlow: React.FC = () => {
    const navigate = useNavigate();
    const [driftFlowList, setDriftFlowList] = useState<
        CateFlowContextType | undefined
    >(undefined);
    const { graphKey } = useParams<{ graphKey?: string }>();
    const listenerRef = useRef<{ unlisten: UnlistenFn | null }>({
        unlisten: null,
    });
    const { t } = useTranslation();

    useEffect(() => {
        const fetchDriftFlowList = async () => {
            const result = await invoke<CateFlowContextType>('drift_flow');
            setDriftFlowList(processFlowData(result));
        };
        fetchDriftFlowList();

        const setupListener = async () => {
            // 确保没有重复设置监听器
            if (listenerRef.current.unlisten) {
                await listenerRef.current.unlisten();
            }

            listenerRef.current.unlisten = await listen<CateFlowContextType>(
                'file-changed',
                async () => {
                    await fetchDriftFlowList();
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

    const handleCardClick = (id: string) => {
        navigate(`/driftflow/${encodeURIComponent(id)}`);
    };

    if (!driftFlowList || Object.keys(driftFlowList).length === 0) {
        return (
            <div className="bg-background flex h-full items-center justify-center">
                <p className="text-muted-foreground text-xl">
                    {t('driftFlow.noData')}
                </p>
            </div>
        );
    }

    // 准备卡片数据
    const cardItems = Object.entries(driftFlowList).map(
        ([category, flow_data]) => ({
            id: category,
            title: category,
            content: (
                <div className="h-64 overflow-hidden">
                    <GanttChart data={flow_data} />
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

export default DriftFlow;
