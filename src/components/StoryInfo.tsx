import React, { useState, useEffect } from 'react';
import { Book, FileText } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import { logError } from '@/utils/logger';
export interface StoryContextType {
    title: string;
    description?: string;
}

const StoryInfo: React.FC = () => {
    const [story, setStory] = useState<StoryContextType | null>(null);
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
        let unlisten: UnlistenFn;
        const setupListener = async () => {
            unlisten = await listen<StoryContextType>(
                'file-changed',
                async () => {
                    await fetchStory();
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

    if (!story) {
        return (
            <div className="flex h-full items-center justify-center">
                <p className="text-muted-foreground text-xl">暂无可用Story</p>
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
