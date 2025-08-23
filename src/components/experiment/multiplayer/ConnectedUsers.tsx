import React, { useEffect, useMemo, useState } from "react";
import { WebsocketProvider } from "y-websocket";
import { WebrtcProvider } from "y-webrtc";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

type YProvider = WebsocketProvider | WebrtcProvider | null;

interface ConnectedUsersProps {
    provider: YProvider;
    isConnected: boolean;
}

export const ConnectedUsers: React.FC<ConnectedUsersProps> = ({ provider, isConnected }) => {
    const [count, setCount] = useState<number>(0);

    const [names, setNames] = useState<string[]>([]);
    const [selfName, setSelfName] = useState<string>("You");

    useEffect(() => {
        if (!provider) {
            setCount(0);
            setNames([]);
            return;
        }
        // y-websocket has awareness on provider; y-webrtc also exposes awareness
        // @ts-ignore
        const awareness = provider.awareness;
        if (!awareness) return;

        const update = () => {
            try {
                const states = awareness.getStates();
                const size = states?.size ?? 0;
                setCount(size);
                const list: string[] = [];
                states?.forEach((state: any, clientId: number) => {
                    if (clientId !== awareness.clientID && state?.user?.name) list.push(state.user.name);
                });
                setNames(list);
                const ln = awareness.getLocalState?.()?.user?.name;
                if (ln) setSelfName(ln);
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
            <Tooltip>
                <TooltipTrigger asChild>
                    <span className="text-gray-500 cursor-default">{text}</span>
                </TooltipTrigger>
                <TooltipContent>
                    <div className="max-w-xs whitespace-pre-wrap">{tooltip}</div>
                </TooltipContent>
            </Tooltip>
        </div>
    );
};


