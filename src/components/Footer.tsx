import React from 'react';
import { useFileContext } from '../context/FileContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react'; // Using Lucide icons which is used by Shadcn
import { logError } from '@/utils/logger';
import { useTranslation } from 'react-i18next'; // Import translation hook

const Footer: React.FC = () => {
    const { t } = useTranslation(); // Initialize translation function
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
        <footer className="bg-primary text-primary-foreground border-border fixed right-0 bottom-0 left-0 flex h-7 items-center justify-between border-t px-4 font-mono text-xs shadow-sm">
            <div>
                {filePath
                    ? `${t('footer.boundFile')}: ${filePath}`
                    : t('footer.noFileBound')}
            </div>
            {filePath && (
                <Button
                    variant="secondary"
                    size="sm"
                    className="flex h-5 items-center gap-1 px-2 py-0 text-xs font-normal"
                    onClick={handleUnwatch}
                >
                    <X className="h-3 w-3" />
                    {t('footer.unbind')}
                </Button>
            )}
        </footer>
    );
};
export default Footer;
