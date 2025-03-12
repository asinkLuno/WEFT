import React, { useEffect, useState } from 'react';
import { CateFlowContextType, processFlowData } from '../types/flow';
import RiverVerticalTabs from './common/RiverVerticalTabs';
import GanttChart from './common/GanttChart';
import { useNavigate, useParams } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { UnlistenFn } from '@tauri-apps/api/event';

const NarrativeFlow: React.FC = () => {
    const navigate = useNavigate();
    const [narrativeFlowList, setNarrativeFlowList] = useState<
        CateFlowContextType | undefined
    >(undefined);
    const { title } = useParams<{ title?: string }>();
    const [activeTab, setActiveTab] = useState(0);
    const [tabs, setTabs] = useState<any[]>([]);
    useEffect(() => {
        const fetchNarrativeFlowList = async () => {
            const result = await invoke<CateFlowContextType>('narrative_flow');
            setNarrativeFlowList(processFlowData(result));
        };
        fetchNarrativeFlowList();

        let unlisten: UnlistenFn;
        const setupListener = async () => {
            unlisten = await listen<CateFlowContextType>(
                'file-changed',
                async () => {
                    await fetchNarrativeFlowList();
                },
            );
        };
        setupListener();

        return () => {
            if (unlisten) {
                unlisten();
            }
        };
    }, []);

    useEffect(() => {
        if (!narrativeFlowList) return;

        const loadTabData = async () => {
            const tabs = Object.entries(narrativeFlowList || {}).map(
                ([category, narrative_flow]) => ({
                    label: category,
                    key: category,
                    content: <GanttChart data={narrative_flow} />,
                }),
            );
            setTabs(tabs);
        };

        loadTabData();
    }, [narrativeFlowList]);

    useEffect(() => {
        if (!narrativeFlowList || !title) return;
        const index = Object.keys(narrativeFlowList).findIndex(
            (t) => t === title,
        );
        if (index !== -1) {
            setActiveTab(index);
        }
    }, [title, narrativeFlowList]);

    const handleChange = (event: React.SyntheticEvent, newValue: number) => {
        const tabTitles = Object.keys(narrativeFlowList || {});
        const selectedTitle = tabTitles[newValue];
        if (selectedTitle) {
            navigate(`/narrativeflow/${encodeURIComponent(selectedTitle)}`);
        }
        setActiveTab(newValue);
    };

    if (!narrativeFlowList || Object.keys(narrativeFlowList).length === 0) {
        return (
            <div className="bg-background flex h-full items-center justify-center">
                <p className="text-muted-foreground text-xl">
                    暂无可用narrativeFlow
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

export default NarrativeFlow;
