import React from 'react';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from '@/components/ui/card';

interface MasonryItem {
    id: string;
    title: string;
    description?: string;
    content: React.ReactNode;
}

interface MasonryCardsProps {
    items: MasonryItem[];
    onItemClick?: (id: string) => void;
    columnCount?: number;
    searchQuery?: string;
}

const MasonryCards: React.FC<MasonryCardsProps> = ({
    items,
    onItemClick,
    columnCount = 3,
    searchQuery = '',
}) => {
    // 过滤项目基于搜索查询
    const filteredItems = items.filter(
        (item) =>
            item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (item.description &&
                item.description
                    .toLowerCase()
                    .includes(searchQuery.toLowerCase())),
    );

    // 将项目分配到列中
    const columns: MasonryItem[][] = Array.from(
        { length: columnCount },
        () => [],
    );

    // 简单分配到列中 (可以根据内容高度优化，但这里使用简单的方法)
    filteredItems.forEach((item, index) => {
        const columnIndex = index % columnCount;
        columns[columnIndex].push(item);
    });

    return (
        <div className="h-full w-full overflow-auto p-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {columns.map((column, columnIndex) => (
                    <div
                        key={`column-${columnIndex}`}
                        className="flex flex-col gap-4"
                    >
                        {column.map((item) => (
                            <Card
                                key={item.id}
                                className="transition-shadow duration-200 hover:shadow-md"
                            >
                                <CardHeader>
                                    <CardTitle
                                        className="hover:text-primary cursor-pointer hover:underline"
                                        onClick={() => onItemClick?.(item.id)}
                                    >
                                        {item.title}
                                    </CardTitle>
                                    {item.description && (
                                        <CardDescription>
                                            {item.description}
                                        </CardDescription>
                                    )}
                                </CardHeader>
                                <CardContent>{item.content}</CardContent>
                            </Card>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default MasonryCards;
