import React from 'react';
import MasonryCards from './MasonryCards';
import GanttChart from './GanttChart';
import { useTranslation } from 'react-i18next';

interface BaseFlowProps {
    flowList: Record<string, any>;
    isLoading: boolean;
    error: string | null;
    noDataKey: string;
    onItemClick?: (id: string) => void;
    children?: (data: any) => React.ReactNode;
}

const BaseFlow: React.FC<BaseFlowProps> = ({
    flowList,
    isLoading,
    error,
    noDataKey,
    onItemClick,
    children,
}) => {
    const { t } = useTranslation();

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
                <p className="text-muted-foreground text-xl">{t(noDataKey)}</p>
            </div>
        );
    }

    // 准备卡片数据
    const cardItems = Object.entries(flowList).map(([category, flowData]) => ({
        id: category,
        title: category,
        content: (
            <div className="h-64 overflow-hidden">
                {children ? children(flowData) : <GanttChart data={flowData} />}
            </div>
        ),
    }));

    // 按标题排序
    const sortedItems = [...cardItems].sort((a, b) =>
        a.title.localeCompare(b.title),
    );

    return (
        <div className="flex-1 overflow-auto p-4 pb-8">
            <MasonryCards
                items={sortedItems}
                onItemClick={onItemClick}
                columnCount={3}
            />
        </div>
    );
};

export default BaseFlow;
