import React from 'react';
import { useFileContext } from '../context/FileContext';
import { useDaoContext } from '../context/DaoContext';
import { Book, FileText, Inbox } from 'lucide-react';
import { Separator } from "@/components/ui/separator"

const StoryInfo: React.FC = () => {
    const { filePath } = useFileContext();
    const { story } = useDaoContext();

    if (!filePath) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-center">
                <Inbox className="size-12 md:size-16 text-muted-foreground" />
                <h3 className="text-lg font-semibold mt-4">No Story Selected</h3>
                <p className="text-sm text-muted-foreground mt-1">
                    Please select a YAML file to begin exploring the story
                </p>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col overflow-auto">
            <div className="flex items-center gap-4 mb-6 justify-center">
                <Book className="h-8 w-8 md:h-10 md:w-10 text-primary" />
                <h1 className="font-bold text-4xl md:text-5xl text-primary">
                    {story?.title || 'Untitled Story'}
                </h1>
            </div>
            <Separator />


            {story?.description && (
                <div className="flex-1 flex flex-col gap-4 px-4 md:px-8">
                    <div className="flex gap-4 items-start">
                        <FileText 
                            className="mt-1 h-6 w-6 md:h-7 md:w-7 text-secondary" 
                        />
                        <p className="text-muted-foreground leading-relaxed">
                            {story.description}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StoryInfo;
