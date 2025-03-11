import React from 'react';
import { useFileContext } from '../context/FileContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react'; // Using Lucide icons which is used by Shadcn
import { logError } from '@/utils/logger';

const Footer: React.FC = () => {
    const { filePath, setFilePath } = useFileContext();
    const navigate = useNavigate();

    const handleUnwatch = () => {
        // Clear file path
        setFilePath(undefined);

        // Clear all stored data
        try {
            // Clear localStorage data related to the application
            localStorage.clear();

            // Navigate back to home page
            navigate('/');
        } catch (err) {
            logError(`Error while unwatching file: ${err}`);
        }
    };

    return (
        <footer className="fixed bottom-0 left-0 right-0 h-7 bg-primary text-primary-foreground flex items-center justify-between px-4 text-xs font-mono border-t border-border shadow-sm">
            <div>{filePath ? `绑定文件：${filePath}` : '未绑定文件'}</div>

            {filePath && (
                <Button
                    variant="secondary"
                    size="sm"
                    className="h-5 py-0 px-2 text-xs font-normal flex items-center gap-1"
                    onClick={handleUnwatch}
                >
                    <X className="h-3 w-3" />
                    解除绑定
                </Button>
            )}
        </footer>
    );
};

export default Footer;
