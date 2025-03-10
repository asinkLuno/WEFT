import React, { useEffect, useState } from 'react';
import { useDaoContext } from '../context/DaoContext';
import RiverVerticalTabs from './common/RiverVerticalTabs';
import { useNavigate, useParams } from 'react-router-dom';
import GanttChart from './common/GanttChart';

const DriftFlow: React.FC = () => {
    const navigate = useNavigate();
    const { driftFlowList } = useDaoContext();
    const { title } = useParams<{ title?: string }>();
    const [activeTab, setActiveTab] = useState(0);

    useEffect(() => {
        if (!driftFlowList || !title) return;
        const index = Object.keys(driftFlowList).findIndex((t) => t === title);
        if (index !== -1) {
            setActiveTab(index);
        }
    }, [title, driftFlowList]);

    const handleChange = (event: React.SyntheticEvent, newValue: number) => {
        const tabTitles = Object.keys(driftFlowList || {});
        const selectedTitle = tabTitles[newValue];
        if (selectedTitle) {
            navigate(`/driftflow/${encodeURIComponent(selectedTitle)}`);
        }
        setActiveTab(newValue);
    };

    const tabs = Object.entries(driftFlowList || {}).map(
        ([category, drift_flow]) => ({
            label: category,
            key: category,
            content: (
                <div className="h-[calc(100vh-28px-48px)] w-[calc(100vw-225px-48px)] overflow-auto">
                    <GanttChart data={drift_flow} />
                </div>
            ),
        }),
    );
    if (!driftFlowList || Object.keys(driftFlowList).length === 0) {
        return (
            <div className="flex h-full items-center justify-center bg-background">
                <p className="text-xl text-muted-foreground">
                    暂无可用DriftFlow
                </p>
            </div>
        );
    }

    return (
        <div className="flex-1">
            <RiverVerticalTabs
                tabs={tabs}
                value={activeTab}
                onChange={handleChange}
                sortTabs={true}
                sortKey={(tab) => tab.label}
            />
        </div>
    );
};

export default DriftFlow;
