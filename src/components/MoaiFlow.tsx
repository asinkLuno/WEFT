import React from 'react';
import GanttChart from './common/GanttChart';
import { useDataStore } from '@/store';
import { useTranslation } from 'react-i18next';
import BaseFlow from './common/BaseFlow';

const MoaiFlow: React.FC = () => {
    const {
        moaiFlow: flowList,
        moaiNames,
        isLoading,
        error,
        fetchMoaiFlow,
    } = useDataStore();

    const { t } = useTranslation();

    // Fetch data on mount
    React.useEffect(() => {
        fetchMoaiFlow();
    }, [fetchMoaiFlow]);

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
