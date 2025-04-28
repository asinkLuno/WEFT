import React, { useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import StoryInfo from './StoryInfo';
import MoaiList from './Moai';
import MoaiLink from './MoaiLink';
import MoaiLinkDetail from './MoaiLinkDetail';
import DriftFlow from './DriftFlow';
import MoaiFlow from './MoaiFlow';
import NarrativeFlow from './NarrativeFlow';
import { logError } from '@/utils/logger';
import { Input } from '@/components/ui/input';
import { useFileStore, useTabsStore } from '@/store/index';

import {
    NavigationMenu,
    NavigationMenuList,
    NavigationMenuItem,
    NavigationMenuLink,
} from '@/components/ui/navigation-menu';

interface TabConfig {
    label: string;
    path: string;
    component: React.ReactNode;
    fetchData?: () => Promise<void>;
}

export default function RiverTabs() {
    const navigate = useNavigate();
    const location = useLocation();
    const params = useParams();
    const { setFilePath } = useFileStore();
    const {
        activeTab,
        searchQuery,
        setActiveTab,
        setSearchQuery,
        setupListeners,
    } = useTabsStore();

    // Check if we're in detail view
    const isDetailView = !!location.pathname.match(/\/moai_link\/[^/]+$/);

    const tabs: TabConfig[] = [
        {
            label: 'Story',
            path: '/intro',
            component: <StoryInfo />,
        },
        {
            label: 'Moai',
            path: '/moai',
            component: <MoaiList searchQuery={searchQuery} />,
        },
        {
            label: 'MoaiLink',
            path: '/moai_link',
            component: isDetailView ? (
                <MoaiLinkDetail />
            ) : (
                <MoaiLink searchQuery={searchQuery} />
            ),
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

    // 初始化activeTab
    useEffect(() => {
        const path = window.location.pathname;
        const tabIndex = tabs.findIndex((tab) => path.includes(tab.path)) || 0;
        setActiveTab(tabIndex);

        // Clear search query if on Story tab
        if (tabIndex === 0 && searchQuery) {
            setSearchQuery('');
        }
    }, []);

    useEffect(() => {
        const currentTab = tabs[activeTab];
        if (currentTab.fetchData) {
            currentTab.fetchData().catch((err) => {
                logError(`Error fetching data: ${err}`);
                navigate('/');
            });
        }
    }, [activeTab, navigate]);

    // 设置全局事件监听器
    useEffect(() => {
        let cleanupListener: (() => void) | undefined;

        const setup = async () => {
            cleanupListener = await setupListeners();
        };

        setup();

        // 监听stop-watching事件，返回首页
        const handleStopWatching = () => {
            setFilePath(undefined);
            navigate('/');
        };

        window.addEventListener('stop-watching', handleStopWatching);

        // 清理函数
        return () => {
            if (cleanupListener) {
                cleanupListener();
            }
            window.removeEventListener('stop-watching', handleStopWatching);
        };
    }, [navigate, setFilePath, setupListeners]);

    // Clear search query when switching to Story tab
    useEffect(() => {
        if (activeTab === 0 && searchQuery) {
            setSearchQuery('');
        }
    }, [activeTab, searchQuery]);

    const handleNavigate = (path: string, index: number) => {
        navigate(path);
        setActiveTab(index);

        // Clear search query when switching to Story tab
        if (index === 0 && searchQuery) {
            setSearchQuery('');
        }
    };

    // Determine if search should be disabled
    const isSearchDisabled = activeTab === 0 || isDetailView;

    return (
        <div className="flex h-full w-full flex-col">
            <div className="bg-background sticky top-0 z-10 w-full border-b p-2">
                <div className="flex items-center justify-between">
                    <NavigationMenu className="max-w-none">
                        <NavigationMenuList className="flex space-x-2">
                            {tabs.map((tab, index) => (
                                <NavigationMenuItem key={index}>
                                    <NavigationMenuLink
                                        className="hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground w-full rounded-md px-4 py-2 text-center transition-colors"
                                        data-active={location.pathname.includes(
                                            tab.path,
                                        )}
                                        onClick={() =>
                                            handleNavigate(tab.path, index)
                                        }
                                    >
                                        {tab.label}
                                    </NavigationMenuLink>
                                </NavigationMenuItem>
                            ))}
                        </NavigationMenuList>
                    </NavigationMenu>

                    <Input
                        type="text"
                        placeholder={
                            isSearchDisabled
                                ? activeTab === 0
                                    ? 'Story视图不支持搜索'
                                    : '详情视图不支持搜索'
                                : '搜索...'
                        }
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={`ml-4 max-w-xs ${isSearchDisabled ? 'cursor-not-allowed opacity-60' : ''}`}
                        disabled={isSearchDisabled}
                    />
                </div>
            </div>
            <div className="flex-1 overflow-auto p-4 pb-8">
                {tabs[activeTab].component}
            </div>
        </div>
    );
}
