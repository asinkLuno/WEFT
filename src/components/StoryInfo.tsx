import React from 'react';
import { useFileContext } from '../context/FileContext';
import { useDaoContext } from '../context/DaoContext';
import { Book, FileText } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

const StoryInfo: React.FC = () => {
    const { filePath } = useFileContext();
    const { story } = useDaoContext();

    if (!filePath) {
        return (
            <div className="flex h-full items-center justify-center bg-background">
                <p className="text-xl text-muted-foreground">暂无可用Story</p>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col overflow-auto p-4 md:p-6">
            <div className="flex items-center gap-3 mb-4">
                <Book className="h-6 w-6 text-primary" />
                <h1 className="font-bold text-2xl text-primary">
                    {story?.title || 'Untitled Story'}
                </h1>
            </div>
            <Separator className="mb-4" />

            {story?.description && (
                <div className="mt-2">
                    <div className="flex gap-3 items-start">
                        <FileText className="h-5 w-5 mt-1 text-secondary" />
                        <div className="flex-1">
                            <p className="text-base leading-relaxed text-foreground">
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
