import React, { useEffect, useRef } from 'react';
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

    // 添加 refs 跟踪监听器
    const unlistenStopRef = useRef<(() => void) | null>(null);
    const unlistenDaoFailedRef = useRef<(() => void) | null>(null);

    useEffect(() => {
        const currentTab = tabs[activeTab];
        if (currentTab.fetchData) {
            currentTab.fetchData().catch((err) => {
                logError(`Error fetching data: ${err}`);
                navigate('/');
            });
        }
    }, [activeTab, navigate]);

    // 事件监听器应该只设置一次
    useEffect(() => {
        let mounted = true;

        const setupListeners = async () => {
            try {
                // 确保先清理之前的监听器（如果存在）
                if (unlistenStopRef.current) {
                    unlistenStopRef.current();
                    unlistenStopRef.current = null;
                }

                if (unlistenDaoFailedRef.current) {
                    unlistenDaoFailedRef.current();
                    unlistenDaoFailedRef.current = null;
                }

                // 设置新的监听器
                const unlistenStop = await listen('stop-watching', () => {
                    setFilePath(undefined);
                    navigate('/');
                });

                const unlistenDaoFailed = await listen(
                    'dao-update-failed',
                    (event) => {
                        logError(`文件更新失败: ${event.payload}`);
                    },
                );

                // 只有组件仍然挂载时才保存引用
                if (mounted) {
                    unlistenStopRef.current = unlistenStop;
                    unlistenDaoFailedRef.current = unlistenDaoFailed;
                } else {
                    // 如果组件已卸载，立即清理
                    unlistenStop();
                    unlistenDaoFailed();
                }
            } catch (err) {
                logError(`Failed to setup listeners: ${err}`);
                if (mounted) {
                    navigate('/');
                }
            }
        };

        setupListeners();

        // 返回清理函数
        return () => {
            mounted = false;

            // 清理监听器
            if (unlistenStopRef.current) {
                unlistenStopRef.current();
                unlistenStopRef.current = null;
            }

            if (unlistenDaoFailedRef.current) {
                unlistenDaoFailedRef.current();
                unlistenDaoFailedRef.current = null;
            }
        };
    }, []); // 空依赖数组，确保监听器只设置一次

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
