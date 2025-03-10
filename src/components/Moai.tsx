import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { humanizeTime, useDaoContext } from '../context/DaoContext';
import RiverVerticalTabs from './common/RiverVerticalTabs';
import { invoke } from '@tauri-apps/api/core';

const MoaiList: React.FC = () => {
    const navigate = useNavigate();
    const { moaiList } = useDaoContext();
    const [value, setValue] = React.useState(0);
    const [tabs, setTabs] = React.useState<any[]>([]);

    React.useEffect(() => {
        if (!moaiList) return;

        const loadTabData = async () => {
            const moaiEntries = Object.entries(moaiList);
            const loadedTabs = await Promise.all(
                moaiEntries.map(async ([id, moai]) => ({
                    label: await invoke<string>('get_moai_full_name', { id }),
                    key: id,
                    content: (
                        <>
                            <h2 className="text-xl font-semibold">
                                {moai.full_name || id}
                            </h2>
                            {moai.description && (
                                <p className="text-muted-foreground">
                                    {moai.description}
                                </p>
                            )}
                            {moai.base_time && (
                                <p className="text-sm text-muted-foreground">
                                    Base Time: {humanizeTime(moai.base_time)}
                                </p>
                            )}

                            <div
                                className="mt-4 grid grid-cols-2 gap-4"
                            >
                                {Object.entries(moai).map(([key, value]) => {
                                    if (
                                        [
                                            'full_name',
                                            'description',
                                            'base_time',
                                            'juncture',
                                            'material',
                                        ].includes(key)
                                    )
                                        return null;

                                    return (
                                        <div
                                            key={key}
                                            className="p-2 bg-muted rounded-md"
                                        >
                                            <p className="text-xs font-medium text-muted-foreground uppercase">
                                                {key.replace(/_/g, ' ')}
                                            </p>
                                            <p className="text-sm">
                                                {typeof value === 'object'
                                                    ? JSON.stringify(value)
                                                    : value}
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>

                            {moai.juncture &&
                                Object.entries(moai.juncture).length > 0 && (
                                    <div className="mt-4">
                                        <h3 className="text-lg font-medium mb-2">
                                            Junctures:
                                        </h3>
                                        {Object.entries(moai.juncture).map(
                                            ([key, value]) => (
                                                <p
                                                    key={key}
                                                    className="text-sm"
                                                >
                                                    {key}: {humanizeTime(value)}
                                                </p>
                                            ),
                                        )}
                                    </div>
                                )}
                        </>
                    ),
                })),
            );
            setTabs(loadedTabs);
        };

        loadTabData();
    }, [moaiList]);

    const handleChange = (_: React.SyntheticEvent, newValue: number) => {
        const moaiEntries = Object.entries(moaiList || {});
        if (moaiEntries[newValue]) {
            navigate(`/moai/${moaiEntries[newValue][0]}`);
            setValue(newValue);
        }
    };

    if (!moaiList || Object.keys(moaiList).length === 0) {
        return (
            <div
                className="flex h-full items-center justify-center bg-background"
            >
                <p className="text-xl text-muted-foreground">
                    暂无可用Moai
                </p>
            </div>
        );
    }

    return (
        <RiverVerticalTabs
            tabs={tabs}
            value={value}
            onChange={handleChange}
            sortTabs={true}
            sortKey={(tab) => tab.label}
        />
    );
};

export default MoaiList;
