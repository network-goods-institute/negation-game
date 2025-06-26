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
    parentPointId?: number;
    pointId?: number;
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
}: PointCardHeaderProps) => {
    return (
        <div className={cn("flex items-start gap-2", inGraphNode && "pt-4")}>
            {isCommand && space && space !== "global" ? (
                <FeedCommandIcon />
            ) : isPinned && space && space !== "global" ? (
                <PinnedIcon />
            ) : isObjection ? (
                <ObjectionIcon className="w-5 h-5 stroke-1 text-muted-foreground" />
            ) : (
                <PointIcon />
            )}
            <div className="tracking-tight text-md @xs/point:text-md @sm/point:text-lg -mt-1 mb-sm select-text flex-1 break-words whitespace-normal overflow-hidden">
                {content}
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