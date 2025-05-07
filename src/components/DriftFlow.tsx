import React from 'react';
import { useDriftFlowStore } from '@/store/driftFlowStore';
import { useTranslation } from 'react-i18next';
import useFlowListener from '@/hooks/useFlowListener';
import BaseFlow from './common/BaseFlow';
import GanttChart from './common/GanttChart';
import { useNavigate } from 'react-router-dom';

const DriftFlow: React.FC = () => {
    const { flowList, isLoading, error, fetchFlowList, setupListener } =
        useDriftFlowStore();

    const { t } = useTranslation();
    const navigate = useNavigate();

    useFlowListener({
        fetchFlowList,
        setupListener,
    });

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
