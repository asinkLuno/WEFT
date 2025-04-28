import { humanizeTime, SupportedLocale } from '../types/flow';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import MasonryCards from './common/MasonryCards';
import { useMoaiStore } from '@/store/moaiStore';

interface MoaiListProps {
    searchQuery?: string;
}

const MoaiList: React.FC<MoaiListProps> = ({ searchQuery = '' }) => {
    const {
        moaiList,
        moaiFullNames,
        isLoading,
        error,
        fetchMoaiList,
        setupListener
    } = useMoaiStore();

    const { t } = useTranslation();
    const locale = i18n.language;

    // 获取Moai列表数据和设置文件变化监听器
    useEffect(() => {
        fetchMoaiList();

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
    }, [fetchMoaiList, setupListener]);

    if (isLoading) {
        return (
            <div className="bg-background flex h-full items-center justify-center">
                <p className="text-muted-foreground text-xl">
                    {t('common.loading')}
                </p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-background flex h-full items-center justify-center">
                <p className="text-destructive text-xl">
                    {t('common.error')}: {error}
                </p>
            </div>
        );
    }

    if (!moaiList || Object.keys(moaiList).length === 0) {
        return (
            <div className="bg-background flex h-full items-center justify-center">
                <p className="text-muted-foreground text-xl">
                    {t('moai.noData')}
                </p>
            </div>
        );
    }

    // 将moaiList转换为MasonryItem数组
    const cardItems = Object.entries(moaiList).map(([id, moai]) => ({
        id,
        title: moaiFullNames[id] || id,
        description: moai.description,
        content: (
            <div>
                {moai.base_time && (
                    <p className="text-muted-foreground mb-4 text-sm">
                        Base Time:{' '}
                        {humanizeTime(
                            moai.base_time,
                            locale as SupportedLocale,
                        )}
                    </p>
                )}
                <div className="grid grid-cols-2 gap-4">
                    {Object.entries(moai).map(([key, value]) => {
                        if (
                            ['full_name', 'description', 'base_time'].includes(
                                key,
                            )
                        )
                            return null;

                        return (
                            <div key={key} className="bg-muted rounded-md p-2">
                                <p className="text-muted-foreground text-xs font-medium uppercase">
                                    {key.replace(/_/g, ' ')}
                                </p>
                                <p className="text-sm">
                                    {typeof value === 'object'
                                        ? JSON.stringify(value)
                                        : value}
                                </p>
                            </div>
                        );
                    })}
                </div>
            </div>
        ),
    }));

    // 按标题排序
    const sortedItems = [...cardItems].sort((a, b) =>
        a.title.localeCompare(b.title),
    );

    return (
        <div className="h-full w-full overflow-hidden">
            <MasonryCards
                items={sortedItems}
                columnCount={3}
                searchQuery={searchQuery}
            />
        </div>
    );
};

export default MoaiList;
