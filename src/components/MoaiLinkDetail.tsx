import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import RelationGraph from './common/RelationGraph';
import { Button } from './ui/button';
import { ChevronLeft } from 'lucide-react';
import { MoaiLinkContextType } from './MoaiLink';

const MoaiLinkDetail: React.FC = () => {
    const { graphKey } = useParams();
    const navigate = useNavigate();
    const [graphData, setGraphData] = useState<MoaiLinkContextType | null>(
        null,
    );
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchGraphData = async () => {
            try {
                if (!graphKey) return;

                const result =
                    await invoke<Record<string, MoaiLinkContextType>>(
                        'get_all_moai_links',
                    );
                const decodedKey = decodeURIComponent(graphKey);

                if (result && result[decodedKey]) {
                    setGraphData(result[decodedKey]);
                }
            } catch (error) {
                console.error('Failed to fetch graph data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchGraphData();
    }, [graphKey]);

    const handleBack = () => {
        navigate('/moai_link');
    };

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center">
                <p className="text-muted-foreground">Loading...</p>
            </div>
        );
    }

    if (!graphData || !graphData.moai_nodes || !graphData.moai_links) {
        return (
            <div className="p-4">
                <Button onClick={handleBack} variant="outline" className="mb-4">
                    <ChevronLeft className="mr-2 h-4 w-4" /> Back to all graphs
                </Button>
                <div className="flex h-[80vh] items-center justify-center">
                    <p className="text-muted-foreground">
                        Graph not found or has no data
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4">
            <Button onClick={handleBack} variant="outline" className="mb-4">
                <ChevronLeft className="mr-2 h-4 w-4" /> Back to all graphs
            </Button>

            <h1 className="mb-4 text-2xl font-bold">
                {graphKey && decodeURIComponent(graphKey)}
            </h1>

            <div className="h-[80vh] w-full overflow-hidden rounded-lg border">
                <RelationGraph
                    moai_nodes={graphData.moai_nodes}
                    moai_links={graphData.moai_links}
                />
            </div>
        </div>
    );
};

export default MoaiLinkDetail;
