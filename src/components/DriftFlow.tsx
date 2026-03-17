import React from 'react';
import { useDataStore } from '@/store';
import { useTranslation } from 'react-i18next';
import BaseFlow from './common/BaseFlow';
import GanttChart from './common/GanttChart';
import { useNavigate } from 'react-router-dom';

const DriftFlow: React.FC = () => {
    const { driftFlow: flowList, isLoading, error, fetchDriftFlow } =
        useDataStore();

    const { t } = useTranslation();
    const navigate = useNavigate();

    // Fetch data on mount
    React.useEffect(() => {
        fetchDriftFlow();
    }, [fetchDriftFlow]);

    const handleCardClick = (id: string) => {
        navigate(`/driftflow/${encodeURIComponent(id)}`);
    };

    return (
        <BaseFlow
            flowList={flowList}
            isLoading={isLoading}
            error={error}
            noDataKey="driftFlow.noData"
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

export default DriftFlow;
