"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronDownIcon, SearchIcon, XIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "./ui/button";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";

interface Point {
    pointId: number;
    content: string;
    cred: number;
    favor: number;
    amountSupporters?: number;
    amountNegations?: number;
}

interface PointFilterSelectorProps {
    points: Point[];
    selectedPointIds: number[];
    onPointSelect: (pointId: number) => void;
    onPointDeselect: (pointId: number) => void;
    onClearAll?: () => void;
    onMatchTypeChange?: (type: "any" | "all") => void;
    matchType?: "any" | "all";
    onCreateTopic?: (name: string) => void;
}

export function PointFilterSelector({
    points,
    selectedPointIds,
    onPointSelect,
    onPointDeselect,
    onClearAll,
    onMatchTypeChange,
    matchType = "any",
    onCreateTopic,
}: PointFilterSelectorProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [isExpanded, setIsExpanded] = useState(false);

    const filteredPoints = useMemo(() => {
        if (!searchTerm.trim()) return points;
        const searchLower = searchTerm.toLowerCase();
        return points.filter(point =>
            point.content.toLowerCase().includes(searchLower)
        );
    }, [points, searchTerm]);

    const selectedPoints = useMemo(() =>
        points.filter(p => selectedPointIds.includes(p.pointId)),
        [points, selectedPointIds]
    );

    return (
        <div className="border-b">
            <Button
                variant="ghost"
                onClick={() => setIsExpanded(!isExpanded)}
                className={cn(
                    "w-full flex items-center justify-between px-4 py-3 rounded-none hover:bg-transparent",
                    selectedPoints.length > 0 && "text-primary font-medium"
                )}
            >
                <div className="flex items-center gap-2">
                    <span>Filter by Points</span>
                    {selectedPoints.length > 0 && (
                        <Badge variant="default" className="rounded-full px-2 py-0.5">
                            {selectedPoints.length}
                        </Badge>
                    )}
                </div>
                <ChevronDownIcon className={cn(
                    "h-4 w-4 transition-transform",
                    isExpanded && "transform rotate-180"
                )} />
            </Button>

            {isExpanded && (
                <div className="p-4 border-t">
                    <div className="flex flex-col gap-3">
                        {selectedPoints.length > 0 && (
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">Selected points</span>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={onClearAll}
                                        className="h-auto py-1 px-2.5 text-xs"
                                    >
                                        Clear all
                                    </Button>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                    {selectedPoints.map(point => (
                                        <Badge
                                            key={point.pointId}
                                            variant="secondary"
                                            className="flex items-center gap-1 pr-1"
                                        >
                                            <span className="truncate max-w-[300px]">{point.content}</span>
                                            <button
                                                onClick={() => onPointDeselect(point.pointId)}
                                                className="hover:bg-muted rounded p-0.5"
                                            >
                                                <XIcon className="h-3 w-3" />
                                            </button>
                                        </Badge>
                                    ))}
                                </div>
                                {selectedPoints.length > 1 && (
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-muted-foreground">Match:</span>
                                        <Tabs
                                            value={matchType}
                                            onValueChange={(value) => onMatchTypeChange?.(value as "any" | "all")}
                                            className="h-7"
                                        >
                                            <TabsList className="h-7 p-0.5">
                                                <TabsTrigger value="any" className="h-6 px-2.5 text-xs">
                                                    Any Point
                                                </TabsTrigger>
                                                <TabsTrigger value="all" className="h-6 px-2.5 text-xs">
                                                    All Points
                                                </TabsTrigger>
                                            </TabsList>
                                        </Tabs>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="relative">
                            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="text"
                                placeholder="Search points..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9"
                            />
                        </div>

                        {filteredPoints.length > 0 && (
                            <ScrollArea className="h-[300px] rounded-md border">
                                <div className="p-2 grid grid-cols-1 gap-2">
                                    {filteredPoints.map(point => (
                                        <button
                                            key={point.pointId}
                                            onClick={() => {
                                                if (selectedPointIds.includes(point.pointId)) {
                                                    onPointDeselect(point.pointId);
                                                } else {
                                                    onPointSelect(point.pointId);
                                                }
                                            }}
                                            className={cn(
                                                "w-full text-left p-3 rounded border transition-colors",
                                                selectedPointIds.includes(point.pointId)
                                                    ? "bg-primary/5 border-primary/20"
                                                    : "hover:bg-muted border-border"
                                            )}
                                        >
                                            <div className="flex flex-col gap-2">
                                                <span className="line-clamp-2 text-sm">{point.content}</span>
                                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                    <Badge variant="outline" className="text-[10px]">
                                                        {point.cred} cred
                                                    </Badge>
                                                    <Badge variant="outline" className="text-[10px]">
                                                        {point.favor.toFixed(1)} favor
                                                    </Badge>
                                                    {point.amountSupporters !== undefined && (
                                                        <span>{point.amountSupporters} supporters</span>
                                                    )}
                                                    {point.amountNegations !== undefined && (
                                                        <span>{point.amountNegations} negations</span>
                                                    )}
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </ScrollArea>
                        )}

                        {filteredPoints.length === 0 && searchTerm && (
                            <div className="text-center text-muted-foreground py-2">
                                No points match your search
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
} 