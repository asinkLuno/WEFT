import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFileContext } from '../context/FileContext';
import { listen } from '@tauri-apps/api/event';
import StoryInfo from './StoryInfo';
import MoaiList from './Moai';
import MoaiLink from './MoaiLink';
import DriftFlow from './DriftFlow';
import MoaiFlow from './MoaiFlow';
import NarrativeFlow from './NarrativeFlow';
import { logError } from '@/utils/logger';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface TabConfig {
    label: string;
    path: string;
    component: React.ReactNode;
    fetchData?: () => Promise<void>;
}

export default function RiverTabs() {
    const navigate = useNavigate();
    const { setFilePath } = useFileContext();
    const tabs: TabConfig[] = [
        {
            label: 'Story',
            path: '/intro',
            component: <StoryInfo />,
        },
        {
            label: 'Moai',
            path: '/moai',
            component: <MoaiList />,
        },
        {
            label: 'MoaiLink',
            path: '/moai_link',
            component: <MoaiLink />,
        },
        {
            label: 'NarrativeFlow',
            path: '/narrativeflow',
            component: <NarrativeFlow />,
        },
        {
            label: 'DriftFlow',
            path: '/driftflow',
            component: <DriftFlow />,
        },
        {
            label: 'MoaiFlow',
            path: '/moaiflow',
            component: <MoaiFlow />,
        },
    ];

    const [activeTab, setActiveTab] = React.useState(() => {
        const path = window.location.pathname;
        return tabs.findIndex((tab) => path.includes(tab.path)) || 0;
    });

    useEffect(() => {
        const currentTab = tabs[activeTab];
        if (currentTab.fetchData) {
            currentTab.fetchData().catch((err) => {
                logError(`Error fetching data: ${err}`);
                navigate('/');
            });
        }
    }, [activeTab, navigate]);
    useEffect(() => {
        const setupListeners = async () => {
            try {
                const unlistenStop = await listen('stop-watching', () => {
                    setFilePath(undefined);
                    navigate('/');
                });

                const unlistenDaoFailed = await listen(
                    'dao-update-failed',
                    (event) => {
                        logError(`文件更新失败: ${event.payload}`); // [^1]
                    },
                );

                return () => {
                    unlistenStop();
                    unlistenDaoFailed();
                };
            } catch (err) {
                logError(`Failed to setup listeners: ${err}`);
                navigate('/');
            }
        };

        setupListeners();
    }, [activeTab, setFilePath, navigate]);

    return (
        <div className="flex h-full w-full flex-col overflow-auto">
            <Tabs
                defaultValue={String(activeTab)}
                onValueChange={(value) => setActiveTab(Number(value))}
            >
                <TabsList className="grid w-full grid-cols-6">
                    {tabs.map((tab, index) => (
                        <TabsTrigger value={String(index)}>
                            {tab.label}
                        </TabsTrigger>
                    ))}
                </TabsList>
                {tabs.map((tab, index) => (
                    <TabsContent value={String(index)}>
                        {tab.component}
                    </TabsContent>
                ))}
            </Tabs>
        </div>
    );
}
