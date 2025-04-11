import React, {
    createContext,
    useState,
    useContext,
    Dispatch,
    SetStateAction,
    useEffect,
} from 'react';

interface FileContextType {
    filePath: string | undefined;
    setFilePath: Dispatch<SetStateAction<string | undefined>>;
}

const FileContext = createContext<FileContextType | undefined>(undefined);

export const FileProvider: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    const [filePath, setFilePath] = useState<string | undefined>(() => {
        // Try to get the saved filepath from localStorage when component mounts
        const savedFilePath = localStorage.getItem('filePath');
        return savedFilePath ? savedFilePath : undefined;
    });

    // Save to localStorage whenever filePath changes
    useEffect(() => {
        if (filePath) {
            localStorage.setItem('filePath', filePath);
        }
    }, [filePath]);

    return (
        <FileContext.Provider value={{ filePath, setFilePath }}>
            {children}
        </FileContext.Provider>
    );
};

export const useFileContext = (): FileContextType => {
    const context = useContext(FileContext);
    if (!context) {
        throw new Error('useFileContext must be used within a FileProvider');
    }
    return context;
};
