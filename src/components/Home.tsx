import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { open } from '@tauri-apps/plugin-dialog';
import { useFileContext } from '../context/FileContext';
import { invoke } from '@tauri-apps/api/core';
import { Button } from '@/components/ui/button';
import { Terminal, FileUp } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { logSuccess, logError, logInfo } from '@/utils/logger';
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
                    // 显示成功提示
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
