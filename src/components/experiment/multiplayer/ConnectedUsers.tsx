import React, { useEffect, useState } from "react";
import { WebsocketProvider } from "y-websocket";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

type YProvider = WebsocketProvider | null;

interface ConnectedUsersProps {
    provider: YProvider;
    isConnected: boolean;
    currentUserId?: string;
    isLeader?: boolean;
}

export const ConnectedUsers: React.FC<ConnectedUsersProps> = ({ provider, isConnected, currentUserId, isLeader = true }) => {
    const [count, setCount] = useState<number>(0);

    const [names, setNames] = useState<string[]>([]);
    const [selfName, setSelfName] = useState<string>("You");
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!provider) {
            setCount(0);
            setNames([]);
            return;
        }
        // y-websocket has awareness on provider
        // @ts-ignore
        const awareness = provider.awareness;
        if (!awareness) return;

        const update = () => {
            try {
                const states = awareness.getStates();
                const localState = awareness.getLocalState?.();
                const myName = localState?.user?.name;

                const allNames: string[] = [];
                states?.forEach((state: any) => {
                    const user = state?.user;
                    if (user?.name) {
                        allNames.push(user.name);
                    }
                });

                const uniqueNames = [...new Set(allNames)];
                const otherNames = uniqueNames.filter(name => name !== myName);

                if (myName) setSelfName(myName);
                setNames(otherNames);

                // Count: others + self if leader
                const totalCount = otherNames.length + (isLeader ? 1 : 0);
                setCount(totalCount);

            } catch (error) {
                console.warn('ConnectedUsers update error:', error);
                setCount(isLeader ? 1 : 0);
                setNames([]);
            }
        };

        update();
        awareness.on?.("update", update);
        // Some providers emit 'change'
        awareness.on?.("change", update);
        return () => {
            awareness.off?.("update", update);
            awareness.off?.("change", update);
        };
    }, [provider, isLeader, currentUserId]);

    const others = names.length;
    const statusText = isLeader ? 'Connected' : 'Connected (Read-only)';
    const text = isConnected ? (others > 0 ? `${statusText} • ${others} others` : statusText) : 'Offline';

    const tooltip = isConnected
        ? (others > 0
            ? `${statusText} as ${selfName}. Others editing: ${names.join(', ')}`
            : `${statusText} as ${selfName}. ${isLeader ? 'No other users currently here.' : 'You\'re viewing in read-only mode.'}`)
        : 'Offline';

    return (
        <div className="flex items-center gap-2 text-xs mt-1">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            {mounted ? (
                <Tooltip>
                    <TooltipTrigger>
                        <div className="text-gray-500 cursor-default select-none">{text}</div>
                    </TooltipTrigger>
                    <TooltipContent>
                        <div className="max-w-xs whitespace-pre-wrap">{tooltip}</div>
                    </TooltipContent>
                </Tooltip>
            ) : (
                <div className="text-gray-500 cursor-default select-none">{text}</div>
            )}
        </div>
    );
};