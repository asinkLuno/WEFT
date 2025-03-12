import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { open } from '@tauri-apps/plugin-dialog';
import { useFileContext } from '../context/FileContext';
import { invoke } from '@tauri-apps/api/core';
import { Button } from '@/components/ui/button';
import { Terminal, FileUp, Clock, ExternalLink } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { logSuccess, logError, logInfo } from '@/utils/logger';
import { load, Store } from '@tauri-apps/plugin-store';
import { Separator } from '@/components/ui/separator';

// Letter variations moved outside the component
const variations = {
    r: ['ℝ', 'ℜ', 'ℛ', '℟', 'ჩ', 'ᖇ', 'Ꮢ', 'ᚱ'],
    i: ['Ꭵ', 'ί', 'Ï'],
    v: ['Ꮙ', '∨', '℣'],
    e: ['℮', '€', 'є', 'ε'],
};

// Generate a random stylized River
const generateStylizedRiver = () => {
    const randomR =
        variations.r[Math.floor(Math.random() * variations.r.length)];
    const randomI =
        variations.i[Math.floor(Math.random() * variations.i.length)];
    const randomV =
        variations.v[Math.floor(Math.random() * variations.v.length)];
    const randomE =
        variations.e[Math.floor(Math.random() * variations.e.length)];
    return `${randomR}${randomI}${randomV}${randomE}r`;
};

// Animation function
const animateRiverText = (setDisplayText: (text: string) => void) => {
    let iterationCount = 0;
    const totalIterations = 9; // Total number of changes
    const startDelay = 100; // Starting delay between changes
    const maxDelay = 800; // Maximum delay at the end

    const animate = () => {
        if (iterationCount >= totalIterations) return;

        iterationCount++;
        // Calculate delay using easeOutQuad timing function
        const progress = iterationCount / totalIterations;
        const delay =
            startDelay + (maxDelay - startDelay) * (progress * progress);

        setTimeout(() => {
            setDisplayText(generateStylizedRiver());
            animate();
        }, delay);
    };

    // Start animation
    animate();
};

const Home: React.FC = () => {
    const navigate = useNavigate();
    const { setFilePath } = useFileContext();

    // State for current displayed text
    const [displayText, setDisplayText] = useState<string>('River');
    // State for store
    const [store, setStore] = useState<Store | null>(null);
    // State for recent files
    const [recentFiles, setRecentFiles] = useState<string[]>([]);

    // Load store and recent files
    useEffect(() => {
        const initStore = async () => {
            try {
                const storeInstance = await load('settings.json', {
                    autoSave: true,
                });
                setStore(storeInstance);

                // Get recent files from store
                const storedRecentFiles =
                    await storeInstance.get<string[]>('recent_files');
                if (storedRecentFiles) {
                    setRecentFiles(storedRecentFiles);
                }
            } catch (err) {
                logError(`Failed to load store: ${err}`);
            }
        };

        initStore();
    }, []);

    // Animation effect
    useEffect(() => {
        // Start the animation
        animateRiverText(setDisplayText);

        // Clean up any pending timeouts on unmount
        return () => {
            setDisplayText(generateStylizedRiver());
        };
    }, []); // Run once on mount

    /**
     * Update recent files list
     * @param filePath The file path to add to recent files
     */
    const updateRecentFiles = async (filePath: string) => {
        if (!store) return;

        try {
            // Create a new array with the current file at the beginning
            let updatedRecentFiles = [filePath];

            // Add previous recent files, excluding the current one to avoid duplicates
            if (recentFiles && recentFiles.length > 0) {
                updatedRecentFiles = [
                    filePath,
                    ...recentFiles.filter((path) => path !== filePath),
                ].slice(0, 3); // Keep only the 3 most recent files
            }

            // Update state and store
            setRecentFiles(updatedRecentFiles);
            await store.set('recent_files', updatedRecentFiles);
        } catch (err) {
            logError(`Failed to update recent files: ${err}`);
        }
    };

    /**
     * Handle opening a file from recent files
     * @param filePath The file path to open
     */
    const handleOpenRecentFile = async (filePath: string) => {
        try {
            setFilePath(filePath);
            await invoke('watch_file', { filePath });
            await updateRecentFiles(filePath);
            logSuccess(`文件已成功加载：${filePath}`);
            navigate('/tabs');
        } catch (err) {
            logError(`文件加载失败：${err}`);
            setFilePath(undefined);
        }
    };

    /**
     * 处理文件选择操作
     * @async
     */
    const handleFileSelect = async () => {
        //TODO: 防止打开多个文件选择对话框
        try {
            const file_path = await open({
                multiple: false, // 禁止多选
                directory: false, // 禁止选择目录
                filters: [
                    {
                        name: 'YAML Files',
                        extensions: ['yaml', 'yml'], // 文件类型过滤
                    },
                ],
            });

            if (file_path) {
                try {
                    setFilePath(file_path as string);
                    await invoke('watch_file', { filePath: file_path });
                    await updateRecentFiles(file_path as string);
                    logSuccess(`文件已成功加载：${file_path}`);
                    // 导航到主界面
                    navigate('/tabs');
                } catch (err) {
                    // 处理操作失败情况
                    logError(`文件加载失败：${err}`);
                    setFilePath(undefined);
                }
            } else {
                // 处理未选择文件的情况
                logInfo('未选择文件');
                setFilePath(undefined);
            }
        } catch (err) {
            // 处理文件选择过程中的异常
            logError(`文件选择错误：${err}`);
            setFilePath(undefined);
        }
    };

    // 组件渲染部分
    return (
        <div className="flex min-h-screen flex-col items-center justify-center">
            <div className="space-y-2 text-center">
                <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
                    Welcome to{' '}
                    <span className="text-blue-700">{displayText}</span>
                </h1>
                <h3 className="text-muted-foreground scroll-m-20 text-2xl font-semibold tracking-tight">
                    请选择一个YAML/YML文件开始操作
                </h3>
            </div>

            <div className="flex w-full max-w-md flex-col items-center space-y-6">
                <Button
                    size="lg"
                    onClick={handleFileSelect}
                    className="flex w-full items-center justify-center gap-2"
                >
                    <FileUp className="h-5 w-5" />
                    选择YAML文件
                </Button>

                {recentFiles && recentFiles.length > 0 && (
                    <div className="w-full">
                        <Separator className="my-2" />
                        <div className="mb-2 flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <h4 className="font-medium">最近打开的文件</h4>
                        </div>
                        <div className="space-y-2">
                            {recentFiles.map((filePath, index) => (
                                <Button
                                    key={index}
                                    variant="link"
                                    className="w-full justify-start truncate text-left"
                                    onClick={() =>
                                        handleOpenRecentFile(filePath)
                                    }
                                >
                                    <ExternalLink className="mr-2 h-4 w-4 flex-shrink-0" />
                                    <span className="truncate">{filePath}</span>
                                </Button>
                            ))}
                        </div>
                    </div>
                )}

                <Alert className="w-full">
                    <Terminal className="h-4 w-4" />
                    <AlertTitle>注意</AlertTitle>
                    <AlertDescription>
                        仅支持公元前 271821 年至公元后 275760 年，请谨慎操控时间
                    </AlertDescription>
                </Alert>
            </div>
        </div>
    );
};

export default Home;
