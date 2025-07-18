"use client";

import React from "react";
import {
    PointIcon,
    PinnedIcon,
    FeedCommandIcon,
} from "@/components/icons/AppIcons";
import { cn } from "@/lib/utils/cn";
import PinBadges from "./PinBadges";
import { ObjectionIcon } from "@/components/icons/ObjectionIcon";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

export interface PointCardHeaderProps {
    inGraphNode: boolean;
    graphNodeLevel?: number;
    isCommand: boolean;
    isPinned: boolean;
    isPriority?: boolean;
    space?: string;
    linkDisabled: boolean;
    pinnedCommandPointId?: number;
    pinStatus?: string;
    parsePinCommand?: string;
    onPinBadgeClickCapture?: React.MouseEventHandler;
    handlePinCommandClick: React.MouseEventHandler;
    handleTargetPointClick: React.MouseEventHandler;
    content: string;
    isObjection?: boolean;
    isNegation?: boolean;
    parentPointId?: number;
    pointId?: number;
    isEdited?: boolean;
    editedAt?: Date;
    editCount?: number;
}

export const PointCardHeader = ({
    inGraphNode,
    isCommand,
    isPinned,
    isPriority,
    space,
    linkDisabled,
    pinnedCommandPointId,
    pinStatus,
    parsePinCommand,
    onPinBadgeClickCapture,
    handlePinCommandClick,
    handleTargetPointClick,
    content,
    isObjection,
    isNegation,
    isEdited,
    editedAt,
    editCount,
}: PointCardHeaderProps) => {
    return (
        <div className={cn("flex items-start gap-2", inGraphNode && "pt-4")}>
            {isCommand && space && space !== "global" ? (
                <FeedCommandIcon />
            ) : isPinned && space && space !== "global" ? (
                <PinnedIcon />
            ) : isObjection ? (
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div>
                            <ObjectionIcon className="w-5 h-5 stroke-1 text-muted-foreground" />
                        </div>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                        <p>Objection</p>
                    </TooltipContent>
                </Tooltip>
            ) : (
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div>
                            <PointIcon />
                        </div>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                        <p>Counterpoint</p>
                    </TooltipContent>
                </Tooltip>
            )}
            <div className="tracking-tight text-md @xs/point:text-md @sm/point:text-lg -mt-1 mb-sm select-text flex-1 break-words whitespace-normal overflow-hidden">
                <div className="flex items-start gap-2 flex-wrap">
                    <span className="flex-1">{content}</span>
                    {isEdited && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Badge variant="secondary" className="text-xs shrink-0 bg-muted/50 text-muted-foreground border-muted">
                                    Edited
                                </Badge>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                                <div className="text-xs">
                                    {editedAt && `Last edited ${formatDistanceToNow(editedAt, { addSuffix: true })}`}
                                    {editCount && editCount > 1 && (
                                        <div>{editCount} edit{editCount !== 1 ? 's' : ''} total</div>
                                    )}
                                </div>
                            </TooltipContent>
                        </Tooltip>
                    )}
                </div>
                <PinBadges
                    space={space}
                    linkDisabled={linkDisabled}
                    pinnedCommandPointId={pinnedCommandPointId}
                    pinStatus={pinStatus}
                    parsePinCommand={parsePinCommand}
                    onPinBadgeClickCapture={onPinBadgeClickCapture}
                    handlePinCommandClick={handlePinCommandClick}
                    handleTargetPointClick={handleTargetPointClick}
                />
            </div>
        </div>
    );
};