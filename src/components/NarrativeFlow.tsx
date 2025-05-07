import React from 'react';
import { useNarrativeFlowStore } from '@/store/narrativeFlowStore';
import { useTranslation } from 'react-i18next';
import useFlowListener from '@/hooks/useFlowListener';
import BaseFlow from './common/BaseFlow';
import GanttChart from './common/GanttChart';
import { useNavigate } from 'react-router-dom';

const NarrativeFlow: React.FC = () => {
    const { flowList, isLoading, error, fetchFlowList, setupListener } =
        useNarrativeFlowStore();

    const { t } = useTranslation();
    const navigate = useNavigate();

    useFlowListener({
        fetchFlowList,
        setupListener,
    });

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
