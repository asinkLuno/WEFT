import React from 'react';
import GanttChart from './common/GanttChart';
import { useMoaiFlowStore } from '@/store/moaiFlowStore';
import { useTranslation } from 'react-i18next';
import useFlowListener from '@/hooks/useFlowListener';
import BaseFlow from './common/BaseFlow';
import { SupportedLocale } from '../types/flow';

const MoaiFlow: React.FC = () => {
    const {
        flowList,
        moaiNames,
        isLoading,
        error,
        fetchFlowList,
        setupListener,
    } = useMoaiFlowStore();

    const { t } = useTranslation();

    useFlowListener({
        fetchFlowList,
        setupListener,
    });

    return (
        <BaseFlow
            flowList={flowList}
            isLoading={isLoading}
            error={error}
            noDataKey="moaiFlow.noData"
        >
            {(flowData) => (
                <div className="h-64 overflow-hidden">
                    <GanttChart data={flowData} />
                </div>
            )}
        </BaseFlow>
    );
};

export default MoaiFlow;
