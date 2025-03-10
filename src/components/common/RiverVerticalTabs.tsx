import React from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

interface TabItem {
    label: string;
    content: React.ReactNode;
    key?: string; // Optional key for sorting
}

interface RiverVerticalTabsProps {
    tabs: TabItem[];
    value: number;
    onChange: (event: React.SyntheticEvent, newValue: number) => void;
    sortTabs?: boolean; // Optional prop to enable sorting
    sortKey?: (tab: TabItem) => string; // Optional custom sort function
}

const RiverVerticalTabs: React.FC<RiverVerticalTabsProps> = ({
    tabs,
    value,
    onChange,
    sortTabs = false,
    sortKey = (tab) => tab.label,
}) => {
    // Create sorted tabs array if sorting is enabled
    const sortedTabs = React.useMemo(() => {
        if (!sortTabs) return tabs;
        return [...tabs].sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
    }, [tabs, sortTabs, sortKey]);

    // Create a mapping from sorted indices to original indices
    const sortedToOriginalIndex = React.useMemo(() => {
        if (!sortTabs) return null;
        return sortedTabs.map(sortedTab => 
            tabs.findIndex(originalTab => 
                (sortedTab.key && originalTab.key) 
                    ? sortedTab.key === originalTab.key 
                    : sortedTab.label === originalTab.label
            )
        );
    }, [tabs, sortedTabs, sortTabs]);

    // Handle change event with index mapping
    const handleChange = (event: React.SyntheticEvent, newValue: number) => {
        if (sortTabs && sortedToOriginalIndex) {
            onChange(event, sortedToOriginalIndex[newValue]);
        } else {
            onChange(event, newValue);
        }
    };

    // Get the current sorted index from the original value
    const currentSortedValue = React.useMemo(() => {
        if (!sortTabs || !tabs[value]) return value;
        return sortedTabs.findIndex(sortedTab => 
            (tabs[value].key && sortedTab.key) 
                ? tabs[value].key === sortedTab.key 
                : tabs[value].label === sortedTab.label
        );
    }, [sortTabs, tabs, value, sortedTabs]);

    // Get the current selected tab value as a string for Shadcn Tabs
    const currentTabValue = String(currentSortedValue);

    return (
        <div className="flex flex-1 h-[calc(100vh-28px-48px)] overflow-hidden">
            <Tabs
                orientation="vertical"
                value={currentTabValue}
                onValueChange={(newValue) => handleChange({} as React.SyntheticEvent, parseInt(newValue))}
                className="flex flex-row h-full"
            >
                <TabsList 
                    className="flex flex-col h-full w-[225px] bg-background rounded-none justify-start items-stretch border-r overflow-auto no-scrollbar" 
                    style={{ 
                        scrollbarWidth: 'none', /* Firefox */
                        msOverflowStyle: 'none',  /* IE and Edge */
                    }}
                    aria-label="River vertical tabs"
                >
                    {(sortTabs ? sortedTabs : tabs).map((tab, index) => (
                        <TabsTrigger
                            key={tab.key || `tab-${index}`}
                            value={String(index)}
                            className="justify-start text-left px-4 py-2 rounded-none data-[state=active]:bg-muted"
                        >
                            {tab.label}
                        </TabsTrigger>
                    ))}
                </TabsList>
                <div className="flex-1 h-full">
                    {tabs.map((tab, index) => (
                        <TabsContent
                            key={tab.key || `panel-${index}`}
                            value={String(index === value ? currentSortedValue : -1)} // Only show if this tab is active
                            className={cn(
                                "p-3 h-full w-full", 
                                index !== value && "hidden" // Hide inactive tabs
                            )}
                        >
                            <div className="h-[calc(100vh-48px-48px)] w-[calc(100vw-225px-48px)] overflow-auto ">
                            {tab.content}
                            </div>
                        </TabsContent>
                    ))}
                </div>
            </Tabs>
        </div>
    );
};

export default RiverVerticalTabs;
