import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { open } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import { Button } from '@/components/ui/button';
import { Terminal, FileUp, Clock, ExternalLink, Puzzle } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { logSuccess, logError, logInfo } from '@/utils/logger';
import { Separator } from '@/components/ui/separator';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useTranslation } from 'react-i18next';
import { useFileStore } from '@/store/fileStore';
import { useSettingsStore } from '@/store/settingsStore';

// Letter variations moved outside the component
const variations = {
    r: ['ℝ', 'ℜ', 'ℛ', '℟', 'ჩ', 'ᖇ', 'Ꮢ', 'ᚱ'],
    i: ['Ꭵ', 'ί', 'Ï'],
    v: ['Ꮙ', '∨', '℣'],
    e: ['℮', '€', 'є', 'ε'],
};

// Generate a random stylized River
const generateStylizedRiver = () => {
    const randomR1 =
        variations.r[Math.floor(Math.random() * variations.r.length)];
    const randomR2 =
        variations.r[Math.floor(Math.random() * variations.r.length)];
    const randomI =
        variations.i[Math.floor(Math.random() * variations.i.length)];
    const randomV =
        variations.v[Math.floor(Math.random() * variations.v.length)];
    const randomE =
        variations.e[Math.floor(Math.random() * variations.e.length)];
    return `Ink ${randomR1}${randomI}${randomV}${randomE}${randomR2}`;
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
    const { t, i18n } = useTranslation();
    const [displayText, setDisplayText] = useState<string>('River');

    // Use Zustand stores instead of context and local state
    const { filePath, setFilePath } = useFileStore();
    const { locale, recentFiles, setLocale, addRecentFile } = useSettingsStore();

    // Set the language from the store
    useEffect(() => {
        if (locale) {
            i18n.changeLanguage(locale);
        }
    }, [locale, i18n]);

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
     * Handle opening a file from recent files
     * @param filePath The file path to open
     */
    const handleOpenRecentFile = async (filePath: string) => {
        try {
            setFilePath(filePath);
            await invoke('watch_file', { filePath });
            addRecentFile(filePath);
            logSuccess(`${t('home.fileLoadSuccess')}${filePath}`);
            navigate('/tabs');
        } catch (err) {
            logError(`${t('home.fileLoadError')}${err}`);
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
                    addRecentFile(file_path as string);
                    logSuccess(`${t('home.fileLoadSuccess')}${file_path}`);
                    // 导航到主界面
                    navigate('/tabs');
                } catch (err) {
                    // 处理操作失败情况
                    logError(`${t('home.fileLoadError')}${err}`);
                    setFilePath(undefined);
                }
            } else {
                // 处理未选择文件的情况
                logInfo(t('home.noFileSelected'));
                setFilePath(undefined);
            }
        } catch (err) {
            // 处理文件选择过程中的异常
            logError(`${t('home.fileSelectError')}${err}`);
            setFilePath(undefined);
        }
    };


    // 组件渲染部分
    return (
        <div className="flex min-h-screen flex-col items-center justify-center">
            <div className="absolute top-4 right-4 flex gap-2 items-center">
                <Select value={locale} onValueChange={setLocale}>
                    <SelectTrigger className="w-[120px]">
                        <SelectValue placeholder={t('selectLanguage')} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="zh-CN">中文</SelectItem>
                        <SelectItem value="en-US">English</SelectItem>
                        <SelectItem value="ja-JP">日本語</SelectItem>
                        <SelectItem value="zh-Classical">文言文</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-2 text-center">
                <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
                    {t('home.welcome')}{' '}
                    <span className="text-blue-700">{displayText}</span>
                </h1>
                <h3 className="text-muted-foreground scroll-m-20 text-2xl font-semibold tracking-tight">
                    {t('home.selectFile')}
                </h3>
            </div>
            <div className="flex w-full max-w-md flex-col items-center space-y-6">
                <Button
                    size="lg"
                    onClick={handleFileSelect}
                    className="flex w-full items-center justify-center gap-2"
                >
                    <FileUp className="h-5 w-5" />
                    {t('home.chooseFile')}
                </Button>

                {recentFiles && recentFiles.length > 0 && (
                    <div className="w-full">
                        <Separator className="my-2" />
                        <div className="mb-2 flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <h4 className="font-medium">
                                {t('home.recentFiles')}
                            </h4>
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
                    <AlertTitle>{t('home.notice')}</AlertTitle>
                    <AlertDescription>{t('home.timeWarning')}</AlertDescription>
                </Alert>
            </div>
        </div>
    );
};

export default Home;
