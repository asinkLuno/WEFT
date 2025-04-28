import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import RelationGraph from './common/RelationGraph';
import { useTranslation } from 'react-i18next';
import MasonryCards from './common/MasonryCards';
import { useMoaiLinkStore } from '@/store/moaiLinkStore';

interface MoaiLinkProps {
    searchQuery?: string;
}

const MoaiLink: React.FC<MoaiLinkProps> = ({ searchQuery = '' }) => {
    const navigate = useNavigate();
    const {
        linkList,
        isLoading,
        error,
        fetchLinkList,
        setupListener
    } = useMoaiLinkStore();
    const { t } = useTranslation();

    useEffect(() => {
        fetchLinkList();

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
    }, [fetchLinkList, setupListener]);

    const handleCardClick = (id: string) => {
        navigate(`/moai_link/${encodeURIComponent(id)}`);
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

    // If there's no data at all, show a message
    if (!linkList || Object.keys(linkList).length === 0) {
        return (
            <div className="bg-background flex h-full items-center justify-center">
                <p className="text-muted-foreground text-xl">
                    {t('moaiLink.noData', '暂无可用MoaiLink')}
                </p>
            </div>
        );
    }

    // 准备卡片数据
    const cardItems = Object.entries(linkList).map(([title, data]) => ({
        id: title,
        title: title,
        content: (
            <div className="h-64 overflow-hidden">
                {data &&
                    data.moai_nodes &&
                    data.moai_nodes.length > 0 &&
                    data.moai_links &&
                    data.moai_links.length > 0 ? (
                    <RelationGraph
                        moai_nodes={data.moai_nodes}
                        moai_links={data.moai_links}
                    />
                ) : (
                    <div className="text-muted-foreground p-2 text-center">
                        {t('moaiLink.noGraphData', 'No graph data available for this Moai. Please check that both nodes and links are defined.')}
                    </div>
                )}
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

export default MoaiLink;
