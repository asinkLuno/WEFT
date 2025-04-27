import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import RelationGraph from './common/RelationGraph';
import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import MasonryCards from './common/MasonryCards';

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

type MoaiLinkListContextType = { [key: string]: MoaiLinkContextType };

interface MoaiLinkProps {
    searchQuery?: string;
}

const MoaiLink: React.FC<MoaiLinkProps> = ({ searchQuery = '' }) => {
    const navigate = useNavigate();
    const [moaiLinkList, setMoaiLinkList] = useState<
        MoaiLinkListContextType | undefined
    >(undefined);
    const listenerRef = useRef<{ unlisten: UnlistenFn | null }>({
        unlisten: null,
    });

    useEffect(() => {
        const fetchMoaiLinkList = async () => {
            const result =
                await invoke<MoaiLinkListContextType>('get_all_moai_links');
            setMoaiLinkList(result);
        };
        fetchMoaiLinkList();

        const setupListener = async () => {
            // 确保没有重复设置监听器
            if (listenerRef.current.unlisten) {
                await listenerRef.current.unlisten();
            }

            listenerRef.current.unlisten =
                await listen<MoaiLinkListContextType>(
                    'file-changed',
                    async () => {
                        await fetchMoaiLinkList();
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
        navigate(`/moai_link/${encodeURIComponent(id)}`);
    };

    // If there's no data at all, show a message
    if (!moaiLinkList || Object.keys(moaiLinkList).length === 0) {
        return (
            <div className="bg-background flex h-full items-center justify-center">
                <p className="text-muted-foreground text-xl">
                    暂无可用MoaiLink
                </p>
            </div>
        );
    }

    // 准备卡片数据
    const cardItems = Object.entries(moaiLinkList).map(([title, data]) => ({
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
                        No graph data available for this Moai. Please check that
                        both nodes and links are defined.
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
