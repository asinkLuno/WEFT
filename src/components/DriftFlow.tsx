import React, { useEffect, useState, useRef } from 'react';
import { CateFlowContextType, processFlowData } from '../types/flow';
import RiverVerticalTabs from './common/RiverVerticalTabs';
import { useNavigate, useParams } from 'react-router-dom';
import GanttChart from './common/GanttChart';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { UnlistenFn } from '@tauri-apps/api/event';
const DriftFlow: React.FC = () => {
    const navigate = useNavigate();
    const [driftFlowList, setDriftFlowList] = useState<
        CateFlowContextType | undefined
    >(undefined);
    const { title } = useParams<{ title?: string }>();
    const [activeTab, setActiveTab] = useState(0);
    const [tabs, setTabs] = useState<any[]>([]);
    const listenerRef = useRef<{ unlisten: UnlistenFn | null }>({
        unlisten: null,
    });

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

    useEffect(() => {
        if (!driftFlowList) return;

        const loadTabData = async () => {
            const tabs = Object.entries(driftFlowList || {}).map(
                ([category, narrative_flow]) => ({
                    label: category,
                    key: category,
                    content: <GanttChart data={narrative_flow} />,
                }),
            );
            setTabs(tabs);
        };

        loadTabData();
    }, [driftFlowList]);

    useEffect(() => {
        if (!driftFlowList || !title) return;
        const index = Object.keys(driftFlowList).findIndex((t) => t === title);
        if (index !== -1) {
            setActiveTab(index);
        }
    }, [title, driftFlowList]);

    const handleChange = (event: React.SyntheticEvent, newValue: number) => {
        const tabTitles = Object.keys(driftFlowList || {});
        const selectedTitle = tabTitles[newValue];
        if (selectedTitle) {
            navigate(`/driftflow/${encodeURIComponent(selectedTitle)}`);
        }
        setActiveTab(newValue);
    };

    if (!driftFlowList || Object.keys(driftFlowList).length === 0) {
        return (
            <div className="bg-background flex h-full items-center justify-center">
                <p className="text-muted-foreground text-xl">
                    暂无可用DriftFlow
                </p>
            </div>
        );
    }

    return (
        <div className="flex-1">
            <RiverVerticalTabs
                tabs={tabs}
                value={activeTab}
                onChange={handleChange}
                sortTabs={true}
                sortKey={(tab) => tab.label}
            />
        </div>
    );
};

export default DriftFlow;
