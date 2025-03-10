import React, { useEffect, useState } from 'react';
import { useDaoContext } from '../context/DaoContext';
import RiverVerticalTabs from './common/RiverVerticalTabs';

import GanttChart from './common/GanttChart';
import { useNavigate, useParams } from 'react-router-dom';

const NarrativeFlow: React.FC = () => {
    const navigate = useNavigate();
    const { narrativeFlowList } = useDaoContext();
    const { title } = useParams<{ title?: string }>();
    const [activeTab, setActiveTab] = useState(0);

    useEffect(() => {
        if (!narrativeFlowList || !title) return;
        const index = Object.keys(narrativeFlowList).findIndex(
            (t) => t === title,
        );
        if (index !== -1) {
            setActiveTab(index);
        }
    }, [title, narrativeFlowList]);

    const handleChange = (event: React.SyntheticEvent, newValue: number) => {
        const tabTitles = Object.keys(narrativeFlowList || {});
        const selectedTitle = tabTitles[newValue];
        if (selectedTitle) {
            navigate(`/narrativeflow/${encodeURIComponent(selectedTitle)}`);
        }
        setActiveTab(newValue);
    };

    const tabs = Object.entries(narrativeFlowList || {}).map(
        ([category, narrative_flow]) => ({
            label: category,
            key: category,
            content: <GanttChart data={narrative_flow} />,
        }),
    );
    if (!narrativeFlowList || Object.keys(narrativeFlowList).length === 0) {
        return (
            <div className="flex h-full items-center justify-center bg-background">
                <p className="text-xl text-muted-foreground">
                    暂无可用narrativeFlow
                </p>
            </div>
        );
    }

    return (
        <RiverVerticalTabs
            tabs={tabs}
            value={activeTab}
            onChange={handleChange}
            sortTabs={true}
            sortKey={(tab) => tab.label}
        />
    );
};

export default NarrativeFlow;
