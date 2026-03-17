import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import RelationGraph from './common/RelationGraph';
import { useDataStore } from '@/store';
import type { MoaiLinkContextType } from '@/api';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

const MoaiLinkDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { linkList, isLoading, error, fetchLinkList } = useDataStore();
    const [graphData, setGraphData] = useState<MoaiLinkContextType | null>(
        null,
    );

    useEffect(() => {
        // Fetch data if not already available
        if (Object.keys(linkList).length === 0) {
            fetchLinkList();
        } else if (id && linkList[id]) {
            setGraphData(linkList[id]);
        }
    }, [id, linkList, fetchLinkList]);

    useEffect(() => {
        // Update graphData when linkList changes
        if (id && linkList[id]) {
            setGraphData(linkList[id]);
        }
    }, [id, linkList]);

    const handleBack = () => {
        navigate('/moai_link');
    };

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

    if (!id || !graphData) {
        return (
            <div className="bg-background flex h-full items-center justify-center">
                <p className="text-muted-foreground text-xl">
                    {t('moaiLink.noGraphFound', 'Graph not found')}
                </p>
            </div>
        );
    }

    return (
        <div className="flex h-full w-full flex-col">
            <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={handleBack}
                        className="mr-2"
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <h1 className="text-foreground text-2xl font-bold">{id}</h1>
                </div>
            </div>

            <div
                className="border-border relative flex-1 overflow-hidden rounded-lg border"
                style={{ height: 'calc(100vh - 12rem)' }}
            >
                {graphData && graphData.moai_nodes && graphData.moai_links ? (
                    <div className="h-full w-full">
                        <RelationGraph
                            moai_nodes={graphData.moai_nodes}
                            moai_links={graphData.moai_links}
                        />
                    </div>
                ) : (
                    <div className="text-muted-foreground flex h-full items-center justify-center">
                        {t(
                            'moaiLink.noGraphData',
                            'No graph data available for this Moai',
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MoaiLinkDetail;
