"use client";

import React, { useCallback } from "react";
import { useAtom } from "jotai";
import { feedEnabledAtom } from "@/atoms/feedEnabledAtom";
import { useReactFlow } from "@xyflow/react";
import { useParams } from "next/navigation";
import RationaleSpacePointsFeed from "@/components/rationale/RationaleSpacePointsFeed";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ChevronLeftIcon, XIcon } from "lucide-react";
import type { PointInSpace } from "@/actions/points/fetchAllSpacePoints";
import { cn } from "@/lib/utils/cn";

const PointsFeedContainer: React.FC = () => {
    const reactFlow = useReactFlow();
    const { space: spaceSlug } = useParams<{ space: string; rationaleId?: string }>();
    const [feedEnabled, setFeedEnabled] = useAtom(feedEnabledAtom);
    const showFeed = feedEnabled;

    const handleAddPoint = useCallback((pt: PointInSpace) => {
        const addNode = reactFlow.getNodes().find((n) => n.type === "addPoint");
        if (addNode) {
            const parentId = (addNode.data as any).parentId as string;
            const position = addNode.position;
            const uniqueId = `point-${pt.pointId}-${Date.now()}`;
            reactFlow.addNodes({
                id: uniqueId,
                type: "point",
                position,
                data: { pointId: pt.pointId, parentId },
            });
            reactFlow.addEdges({
                id: `edge-${pt.pointId}-${Date.now()}`,
                source: uniqueId,
                target: parentId,
                type: "negation",
            });
            reactFlow.deleteElements({ nodes: [{ id: addNode.id }] });
            return;
        }
        const { x, y } = reactFlow.getViewport();
        reactFlow.addNodes({
            id: `point-${pt.pointId}-${Date.now()}`,
            type: "point",
            position: { x, y },
            data: { pointId: pt.pointId },
        });
    }, [reactFlow]);

    return showFeed ? (
        <>
            <RationaleSpacePointsFeed
                onPointAdd={handleAddPoint}
                spaceSlug={spaceSlug!}
                className={cn(
                    "!fixed inset-0 top-[var(--header-height)] !h-[calc(100vh-var(--header-height))]",
                    "md:!relative md:col-start-4 md:inset-[reset] md:top-[reset] md:!h-full md:!z-auto md:min-h-0 md:overflow-y-auto"
                )}
            />
            <div className="hidden md:flex absolute top-4 right-4 z-50">
                <Button size="icon" variant="ghost" onClick={() => setFeedEnabled(false)} aria-label="Collapse feed">
                    <XIcon className="h-4 w-4 text-muted-foreground" />
                </Button>
            </div>
        </>
    ) : (
        <div className="hidden md:flex absolute top-4 right-4 z-50">
            <TooltipProvider delayDuration={200}>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setFeedEnabled(true)}
                            aria-label="Open feed"
                        >
                            <ChevronLeftIcon className="h-4 w-4 text-muted-foreground" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="left">Show points feed</TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </div>
    );
};

export default PointsFeedContainer;