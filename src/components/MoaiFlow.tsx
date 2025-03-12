import React, { useEffect, useState, useRef } from 'react';
import { CateFlowContextType, processFlowData } from '../types/flow';
import RiverVerticalTabs from './common/RiverVerticalTabs';
import GanttChart from './common/GanttChart';
import { useNavigate, useParams } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { UnlistenFn } from '@tauri-apps/api/event';
const MoaiFlow: React.FC = () => {
    const navigate = useNavigate();
    const [moaiFlowList, setMoaiFlowList] = useState<
        CateFlowContextType | undefined
    >(undefined);
    const { title } = useParams<{ title?: string }>();
    const [activeTab, setActiveTab] = useState(0);
    const [tabs, setTabs] = useState<any[]>([]);
    const listenerRef = useRef<{ unlisten: UnlistenFn | null }>({
        unlisten: null,
    });

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

    useEffect(() => {
        if (!moaiFlowList) return;

        const loadTabData = async () => {
            const loadedTabs = await Promise.all(
                Object.entries(moaiFlowList).map(
                    async ([category, moai_flow]) => ({
                        label: await invoke<string>('get_moai_full_name', {
                            id: category,
                        }),
                        key: category,
                        content: <GanttChart data={moai_flow} />,
                    }),
                ),
            );
            setTabs(loadedTabs);
        };

        loadTabData();
    }, [moaiFlowList]);

    useEffect(() => {
        if (!moaiFlowList || !title) return;
        const index = Object.keys(moaiFlowList).findIndex((t) => t === title);
        if (index !== -1) {
            setActiveTab(index);
        }
    }, [title, moaiFlowList]);

    const handleChange = (event: React.SyntheticEvent, newValue: number) => {
        const tabTitles = Object.keys(moaiFlowList || {});
        const selectedTitle = tabTitles[newValue];
        if (selectedTitle) {
            navigate(`/moaiflow/${encodeURIComponent(selectedTitle)}`);
        }
        setActiveTab(newValue);
    };
    if (!moaiFlowList || Object.keys(moaiFlowList).length === 0) {
        return (
            <div className="bg-background flex h-full items-center justify-center">
                <p className="text-muted-foreground text-xl">
                    暂无可用MoaiFlow
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

export default MoaiFlow;
