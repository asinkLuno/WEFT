import React, {
    useEffect,
    useMemo,
    useState,
    useCallback,
    useRef,
} from 'react';
import { useNavigate } from 'react-router-dom';
import RiverVerticalTabs from './common/RiverVerticalTabs';
import RelationGraph from './common/RelationGraph';
import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
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

const MoaiLink: React.FC = () => {
    const navigate = useNavigate();
    const [moaiLinkList, setMoaiLinkList] = useState<
        MoaiLinkListContextType | undefined
    >(undefined);
    const [activeTab, setActiveTab] = useState(0);
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

    const handleChange = useCallback(
        (event: React.SyntheticEvent, newValue: number) => {
            if (!moaiLinkList) return;
            const tabTitles = Object.keys(moaiLinkList);
            const selectedTitle = tabTitles[newValue];
            if (selectedTitle) {
                navigate(`/moai/${encodeURIComponent(selectedTitle)}`);
            }
            setActiveTab(newValue);
        },
        [moaiLinkList, navigate],
    );

    const tabs = useMemo(() => {
        if (!moaiLinkList) return [];

        return Object.entries(moaiLinkList).map(([title, data]) => ({
            label: title,
            key: title,
            content: (
                <>
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
                            No graph data available for this Moai. Please check
                            that both nodes and links are defined.
                        </div>
                    )}
                </>
            ),
        }));
    }, [moaiLinkList]);

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

    return (
        <RiverVerticalTabs
            tabs={tabs}
            value={activeTab}
            onChange={handleChange}
            sortTabs={true}
            sortKey={(tab) => tab.label}
        />
    );
};

export default MoaiLink;
