import React, { useEffect } from 'react';
import { Book, FileText, Quote } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useTranslation } from 'react-i18next';
import { useStoryStore } from '@/store/storyStore';

const StoryInfo: React.FC = () => {
    const {
        story,
        isLoading,
        error,
        fetchStory,
        setupListener
    } = useStoryStore();

    const { t } = useTranslation();

    useEffect(() => {
        fetchStory();

        // 设置监听器并返回清理函数
        let cleanupListener: (() => void) | undefined;

        const setup = async () => {
            cleanupListener = await setupListener();
        };

        setup();

        // 清理函数
        return () => {
            if (cleanupListener) {
                cleanupListener();
            }
        };
    }, [fetchStory, setupListener]);

    if (isLoading) {
        return (
            <div className="flex h-full items-center justify-center">
                <p className="text-muted-foreground text-xl">
                    {t('common.loading')}
                </p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex h-full items-center justify-center">
                <p className="text-destructive text-xl">
                    {t('common.error')}: {error}
                </p>
            </div>
        );
    }

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
