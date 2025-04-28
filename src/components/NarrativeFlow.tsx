import React, { useEffect } from 'react';
import GanttChart from './common/GanttChart';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import MasonryCards from './common/MasonryCards';
import { useNarrativeFlowStore } from '@/store/narrativeFlowStore';

const NarrativeFlow: React.FC = () => {
    const navigate = useNavigate();
    const {
        flowList,
        isLoading,
        error,
        fetchFlowList,
        setupListener
    } = useNarrativeFlowStore();
    const { t } = useTranslation();

    useEffect(() => {
        fetchFlowList();

        // 设置监听器并返回清理函数
        let cleanupListener: (() => void) | undefined;

        const setup = async () => {
            cleanupListener = await setupListener();
        };

        setup();

        // 清理函数
        return () => {
            if (cleanupListener) {
                cleanupListener();
            }
        };
    }, [fetchFlowList, setupListener]);

    const handleCardClick = (id: string) => {
        navigate(`/narrativeflow/${encodeURIComponent(id)}`);
    };

    if (isLoading) {
        return (
            <div className="bg-background flex h-full items-center justify-center">
                <p className="text-muted-foreground text-xl">
                    {t('common.loading')}
                </p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-background flex h-full items-center justify-center">
                <p className="text-destructive text-xl">
                    {t('common.error')}: {error}
                </p>
            </div>
        );
    }

    if (!flowList || Object.keys(flowList).length === 0) {
        return (
            <div className="bg-background flex h-full items-center justify-center">
                <p className="text-muted-foreground text-xl">
                    {t('narrativeFlow.noData')}
                </p>
            </div>
        );
    }

    // 准备卡片数据
    const cardItems = Object.entries(flowList).map(
        ([category, narrative_flow]) => ({
            id: category,
            title: category,
            content: (
                <div className="h-64 overflow-hidden">
                    <GanttChart data={narrative_flow} />
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

export default NarrativeFlow;
