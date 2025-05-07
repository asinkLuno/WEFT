import { useEffect } from 'react';

interface FlowListenerOptions {
    fetchFlowList: () => void;
    setupListener: () => Promise<() => void>;
}

const useFlowListener = ({
    fetchFlowList,
    setupListener,
}: FlowListenerOptions) => {
    useEffect(() => {
        fetchFlowList();

        // 设置监听器并返回清理函数
        let cleanupListener: (() => void) | undefined;

        const setup = async () => {
            cleanupListener = await setupListener();
        };

        setup();

        // 清理函数
        return () => {
            if (cleanupListener) {
                cleanupListener();
            }
        };
    }, [fetchFlowList, setupListener]);
};

export default useFlowListener;
