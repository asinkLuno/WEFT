import React from 'react';
import { useDataStore } from '@/store';
import { useTranslation } from 'react-i18next';
import BaseFlow from './common/BaseFlow';
import GanttChart from './common/GanttChart';
import { useNavigate } from 'react-router-dom';

const NarrativeFlow: React.FC = () => {
    const { narrativeFlow: flowList, isLoading, error, fetchNarrativeFlow } =
        useDataStore();

    const { t } = useTranslation();
    const navigate = useNavigate();

    // Fetch data on mount
    React.useEffect(() => {
        fetchNarrativeFlow();
    }, [fetchNarrativeFlow]);

    const handleCardClick = (id: string) => {
        navigate(`/narrativeflow/${encodeURIComponent(id)}`);
    };

    return (
        <BaseFlow
            flowList={flowList}
            isLoading={isLoading}
            error={error}
            noDataKey="narrativeFlow.noData"
            onItemClick={handleCardClick}
        >
            {(flowData) => (
                <div className="h-64 overflow-hidden">
                    <GanttChart data={flowData} />
                </div>
            )}
        </BaseFlow>
    );
};

export default NarrativeFlow;
