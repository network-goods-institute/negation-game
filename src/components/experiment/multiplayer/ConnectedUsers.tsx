import React, { useEffect, useMemo, useState } from "react";
import { WebsocketProvider } from "y-websocket";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

type YProvider = WebsocketProvider | null;

interface ConnectedUsersProps {
    provider: YProvider;
    isConnected: boolean;
}

export const ConnectedUsers: React.FC<ConnectedUsersProps> = ({ provider, isConnected }) => {
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
                const unique = new Map<string, string>();
                states?.forEach((state: any, clientId: number) => {
                    const u = state?.user;
                    if (!u) return;
                    const id = u.id || u.name;
                    if (!unique.has(id)) unique.set(id, u.name);
                });
                const ln = awareness.getLocalState?.()?.user?.name;
                if (ln) setSelfName(ln);
                // Exclude self name from others
                const others = Array.from(unique.values()).filter((n) => n !== ln);
                setNames(others);
                setCount(unique.size);
            } catch {
                setCount(0);
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
    }, [provider]);

    const others = Math.max(count - 1, 0);
    const text = isConnected ? (others > 0 ? `Connected • ${others} others` : 'Connected') : 'Offline';
    const tooltip = isConnected
        ? (others > 0
            ? `Connected as ${selfName}. Others here (${others}): ${names.join(', ')}`
            : `Connected as ${selfName}. No other users currently here.`)
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