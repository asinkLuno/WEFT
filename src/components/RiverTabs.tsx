import React, { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFileContext } from '../context/FileContext';
import {
    CateFlowContextType,
    MoaiLinkListContextType,
    processFlowData,
    useDaoContext,
} from '../context/DaoContext';
import { StoryContextType, MoaiListContextType } from '../context/DaoContext';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import StoryInfo from './StoryInfo';
import MoaiList from './Moai';
import { useSnackbar } from '../context/SnackContext';
import MoaiLink from './MoaiLink';
import DriftFlow from './DriftFlow';
import MoaiFlow from './MoaiFlow';
import NarrativeFlow from './NarrativeFlow';

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
    const {
        story,
        setStory,
        moaiList,
        setMoaiList,
        moaiLinkList,
        setMoaiLinkList,
        driftFlowList,
        setDriftFlowList,
        moaiFlowList,
        setMoaiFlowList,
        narrativeFlowList,
        setNarrativeFlowList,
    } = useDaoContext();
    const { showMessage } = useSnackbar();

    const fetchStory = useCallback(async () => {
        if (story === undefined) {
            const result = await invoke<StoryContextType>('get_story');
            setStory(result);
        }
    }, [story, setStory]);

    const fetchMoais = useCallback(async () => {
        if (moaiList === undefined) {
            const result = await invoke<MoaiListContextType>('get_all_moais');
            setMoaiList(result);
        }
    }, [moaiList, setMoaiList]);

    const fetchMoaiLinks = useCallback(async () => {
        if (moaiLinkList === undefined) {
            const result = await invoke<MoaiLinkListContextType>(
                'get_all_moai_links',
            );
            setMoaiLinkList(result);
        }
    }, [moaiLinkList, setMoaiLinkList]); // Fixed dependency array

    const fetchDriftFlowList = useCallback(async () => {
        if (driftFlowList === undefined) {
            const result = await invoke<CateFlowContextType>('drift_flow');
            setDriftFlowList(processFlowData(result));
        }
    }, [driftFlowList, setDriftFlowList]);

    const fetchMoaiFlowList = useCallback(async () => {
        if (moaiFlowList === undefined) {
            const result = await invoke<CateFlowContextType>('moai_flow');
            setMoaiFlowList(processFlowData(result));
        }
    }, [moaiFlowList, setMoaiFlowList]);

    const fetchNarrativeFlowList = useCallback(async () => {
        if (narrativeFlowList === undefined) {
            const result = await invoke<CateFlowContextType>('narrative_flow');
            setNarrativeFlowList(processFlowData(result));
        }
    }, [narrativeFlowList, setNarrativeFlowList]);
    const tabs: TabConfig[] = [
        {
            label: 'Story',
            path: '/intro',
            component: <StoryInfo />,
            fetchData: fetchStory,
        },
        {
            label: 'Moai',
            path: '/moai',
            component: <MoaiList />,
            fetchData: fetchMoais,
        },
        {
            label: 'MoaiLink',
            path: '/moai_link',
            component: <MoaiLink />,
            fetchData: fetchMoaiLinks,
        },
        {
            label: 'NarrativeFlow',
            path: '/narrativeflow',
            component: <NarrativeFlow />,
            fetchData: fetchNarrativeFlowList,
        },
        {
            label: 'DriftFlow',
            path: '/driftflow',
            component: <DriftFlow />,
            fetchData: fetchDriftFlowList,
        },
        {
            label: 'MoaiFlow',
            path: '/moaiflow',
            component: <MoaiFlow />,
            fetchData: fetchMoaiFlowList,
        },
    ];

    const [activeTab, setActiveTab] = React.useState(() => {
        const path = window.location.pathname;
        return tabs.findIndex((tab) => path.includes(tab.path)) || 0;
    });

    const handleChange = (_: React.SyntheticEvent, newValue: number) => {
        setActiveTab(newValue);
        navigate(tabs[newValue].path);
    };

    useEffect(() => {
        const currentTab = tabs[activeTab];
        if (currentTab.fetchData) {
            currentTab.fetchData().catch((err) => {
                showMessage(`Error fetching data: ${err}`, 'error');
                navigate('/');
            });
        }
    }, [activeTab, navigate, showMessage]);

    useEffect(() => {
        const setupListeners = async () => {
            try {
                const unlistenFile = await listen('file-changed', async () => {
                    const currentTab = tabs[activeTab];
                    if (currentTab.fetchData) await currentTab.fetchData();
                });

                const unlistenStop = await listen('stop-watching', () => {
                    setFilePath(undefined);
                    setStory(undefined);
                    setMoaiList(undefined);
                    setMoaiLinkList(undefined);
                    navigate('/');
                });

                const unlistenDaoFailed = await listen(
                    'dao-update-failed',
                    (event) => {
                        showMessage(`文件更新失败: ${event.payload}`, 'error'); // [^1]
                    },
                );

                return () => {
                    unlistenFile();
                    unlistenStop();
                    unlistenDaoFailed();
                };
            } catch (err) {
                showMessage(`Failed to setup listeners: ${err}`, 'error');
                navigate('/');
            }
        };

        setupListeners();
    }, [activeTab, setFilePath, setStory, setMoaiList, showMessage, navigate]);

    return (
        <div className="flex-1 flex flex-col overflow-auto h-full w-full">
            <Tabs
                defaultValue={String(activeTab)}
                onValueChange={(value) => setActiveTab(Number(value))}
            >
                <TabsList className={`grid w-full grid-cols-6`}>
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
