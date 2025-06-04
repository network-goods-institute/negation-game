"use client";

import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchAllSpacePoints, PointInSpace } from "@/actions/points/fetchAllSpacePoints";
import { Input } from "@/components/ui/input";
import { SearchIcon, XIcon, PlusIcon, ExternalLink } from "lucide-react";
import { Loader } from "@/components/ui/loader";
import { encodeId } from "@/lib/negation-game/encodeId";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import { useAtom } from 'jotai';
import { feedEnabledAtom } from '@/atoms/feedEnabledAtom';
import Link from 'next/link';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { InfoIcon } from "lucide-react";

export interface RationaleSpacePointsFeedProps {
    className?: string;
    onPointAdd?: (point: PointInSpace) => void;
    spaceSlug: string;
}

const RationaleSpacePointsFeed: React.FC<RationaleSpacePointsFeedProps> = ({
    className,
    onPointAdd,
    spaceSlug,
}) => {
    const [, setFeedEnabled] = useAtom(feedEnabledAtom);
    const { data: points, isLoading } = useQuery<PointInSpace[]>({
        queryKey: ["space-points-for-rationale"],
        queryFn: fetchAllSpacePoints,
    });

    const [searchTerm, setSearchTerm] = useState("");
    const filteredPoints = useMemo(() => {
        if (!points) return [];
        const lower = searchTerm.toLowerCase();
        return points.filter((pt) =>
            pt.content.toLowerCase().includes(lower) ||
            encodeId(pt.pointId).toLowerCase().includes(lower)
        );
    }, [points, searchTerm]);

    return (
        <div className={cn("flex flex-col h-full border-l overflow-hidden", className)}>
            {/* Desktop collapse header */}
            <div className="sticky top-0 z-20 flex justify-end px-4 py-2 border-b bg-background">
                <h2 className="text-lg font-semibold mr-auto">Space Points Feed</h2>
                <Button size="icon" variant="ghost" className="hidden md:flex" onClick={() => setFeedEnabled(false)} aria-label="Collapse feed">
                    <XIcon className="h-4 w-4 text-muted-foreground" />
                </Button>
            </div>
            <div className="flex items-center px-4 py-2 border-b gap-2">
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <InfoIcon className="size-5 text-muted-foreground cursor-help shrink-0" />
                        </TooltipTrigger>
                        <TooltipContent side="right" align="start" className="max-w-xs">
                            Click the "+" button next to a point to add it into the graph.<br />
                            New points will attach to the "Add Point" node when it exists, otherwise it will be dropped into the graph with no connections.<br />
                            To create connections, drag two nodes on top of each other. Clicking connect will make the last node you touched, negate the other. <br />
                            This will create an edge between the two nodes.
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
                <div className="relative flex-grow">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Search points..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-10 w-full"
                    />
                    {searchTerm && (
                        <button onClick={() => setSearchTerm("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                            <XIcon className="h-4 w-4" />
                        </button>
                    )}
                </div>
            </div>
            <div className="flex-grow overflow-auto p-2">
                {isLoading ? (
                    <div className="flex-grow flex items-center justify-center">
                        <Loader className="h-6 w-6" />
                    </div>
                ) : (
                    filteredPoints.map((pt) => (
                        <div key={pt.pointId} className="px-4 py-2 border-b flex items-center justify-between">
                            <div className="flex flex-col flex-1 break-words">
                                <div>{pt.content}</div>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs text-muted-foreground">Negations: {pt.amountNegations}</span>
                                    <span className="text-xs text-muted-foreground">Supporters: {pt.amountSupporters}</span>
                                    <span className="text-xs text-muted-foreground">Cred: {pt.cred}</span>
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-1 min-w-[120px]">
                                <div className="flex gap-1">
                                    {onPointAdd && (
                                        <Button size="icon" variant="outline" onClick={() => onPointAdd(pt)}>
                                            <PlusIcon className="size-4" />
                                        </Button>
                                    )}
                                    <Button size="icon" variant="outline" asChild>
                                        <Link
                                            href={`/s/${spaceSlug}/${encodeId(pt.pointId)}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            <ExternalLink className="size-4" />
                                        </Link>
                                    </Button>
                                </div>
                                <span className="text-xs text-muted-foreground">ID: {encodeId(pt.pointId)}</span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default RationaleSpacePointsFeed; 