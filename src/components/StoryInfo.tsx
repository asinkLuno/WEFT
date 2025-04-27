import React, { useState, useEffect, useRef } from 'react';
import { Book, FileText, Quote } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import { logError } from '@/utils/logger';
import { useTranslation } from 'react-i18next';

export interface StoryContextType {
    title: string;
    summary?: string;
    description?: string;
}

const StoryInfo: React.FC = () => {
    const [story, setStory] = useState<StoryContextType | null>(null);
    const listenerRef = useRef<{ unlisten: UnlistenFn | null }>({
        unlisten: null,
    });
    const { t } = useTranslation();

    useEffect(() => {
        const fetchStory = async () => {
            try {
                const storyData = await invoke<StoryContextType>('get_story');
                setStory(storyData);
            } catch (error) {
                logError(`Failed to fetch story: ${error}`);
            }
        };

        fetchStory();

        // 监听故事变化
        const setupListener = async () => {
            // 确保没有重复设置监听器
            if (listenerRef.current.unlisten) {
                await listenerRef.current.unlisten();
            }

            listenerRef.current.unlisten = await listen<StoryContextType>(
                'file-changed',
                async () => {
                    await fetchStory();
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

    if (!story) {
        return (
            <div className="flex h-full items-center justify-center">
                <p className="text-muted-foreground text-xl">
                    {t('story.noData')}
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col overflow-auto p-4 md:p-6">
            <div className="mb-4 flex items-center gap-3">
                <Book className="text-primary h-6 w-6" />
                <h1 className="text-primary text-2xl font-bold">
                    {story.title || 'Untitled Story'}
                </h1>
            </div>
            <Separator className="mb-4" />

            {story.summary && (
                <div className="mb-4">
                    <div className="flex items-start gap-3">
                        <Quote className="text-primary mt-1 h-5 w-5" />
                        <div className="flex-1">
                            <blockquote className="border-l-2 border-primary pl-4 italic text-muted-foreground">
                                {story.summary}
                            </blockquote>
                        </div>
                    </div>
                </div>
            )}

            {story.description && (
                <div className="mt-2">
                    <div className="flex items-start gap-3">
                        <FileText className="text-secondary mt-1 h-5 w-5" />
                        <div className="flex-1">
                            <p className="text-foreground text-base leading-relaxed">
                                {story.description}
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StoryInfo;
