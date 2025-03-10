import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDaoContext } from '../context/DaoContext';
import RiverVerticalTabs from './common/RiverVerticalTabs';
import RelationGraph from './common/RelationGraph';

const MoaiLink: React.FC = () => {
    const navigate = useNavigate();
    const { moaiLinkList } = useDaoContext();
    const { title } = useParams<{ title?: string }>();
    const [activeTab, setActiveTab] = useState(0);

    useEffect(() => {
        if (!moaiLinkList || !title) return;
        const index = Object.keys(moaiLinkList).findIndex((t) => t === title);
        if (index !== -1) {
            setActiveTab(index);
        }
    }, [title, moaiLinkList]);

    const handleChange = useCallback(
        (event: React.SyntheticEvent, newValue: number) => {
            if (!moaiLinkList) return;
            const tabTitles = Object.keys(moaiLinkList);
            const selectedTitle = tabTitles[newValue];
            if (selectedTitle) {
                navigate(`/moai/${encodeURIComponent(selectedTitle)}`);
            }
            setActiveTab(newValue);
        },
        [moaiLinkList, navigate],
    );

    const tabs = useMemo(() => {
        if (!moaiLinkList) return [];

        return Object.entries(moaiLinkList).map(([title, data]) => ({
            label: title,
            key: title,
            content: (
                <>
                    {data &&
                    data.moai_nodes &&
                    data.moai_nodes.length > 0 &&
                    data.moai_links &&
                    data.moai_links.length > 0 ? (
                        <RelationGraph
                            moai_nodes={data.moai_nodes}
                            moai_links={data.moai_links}
                        />
                    ) : (
                        <div className="text-muted-foreground text-center p-2">
                            No graph data available for this Moai. Please check
                            that both nodes and links are defined.
                        </div>
                    )}
                </>
            ),
        }));
    }, [moaiLinkList]);

    // If there's no data at all, show a message
    if (!moaiLinkList || Object.keys(moaiLinkList).length === 0) {
        return (
            <div className="flex h-full items-center justify-center bg-background">
                <p className="text-xl text-muted-foreground">
                    暂无可用MoaiLink
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

export default MoaiLink;
