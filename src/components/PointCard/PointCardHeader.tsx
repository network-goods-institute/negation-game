import React from "react";
import {
    PointIcon,
    PinnedIcon,
    FeedCommandIcon,
    ThickCircleIcon,
    SlashedCircleIcon,
} from "@/components/icons/AppIcons";
import { cn } from "@/lib/cn";
import PinBadges from "./PinBadges";

export interface PointCardHeaderProps {
    inGraphNode: boolean;
    graphNodeLevel?: number;
    isCommand: boolean;
    isPinned: boolean;
    space?: string;
    linkDisabled: boolean;
    pinnedCommandPointId?: number;
    pinStatus?: string;
    parsePinCommand?: string;
    onPinBadgeClickCapture?: React.MouseEventHandler;
    handlePinCommandClick: React.MouseEventHandler;
    handleTargetPointClick: React.MouseEventHandler;
    content: string;
}

export const PointCardHeader: React.FC<PointCardHeaderProps> = ({
    inGraphNode,
    graphNodeLevel,
    isCommand,
    isPinned,
    space,
    linkDisabled,
    pinnedCommandPointId,
    pinStatus,
    parsePinCommand,
    onPinBadgeClickCapture,
    handlePinCommandClick,
    handleTargetPointClick,
    content,
}) => {
    let Icon: React.ComponentType<any>;
    if (inGraphNode && graphNodeLevel !== undefined) {
        Icon = graphNodeLevel % 2 === 0 ? SlashedCircleIcon : ThickCircleIcon;
    } else if (isCommand && space && space !== "global") {
        Icon = FeedCommandIcon;
    } else if (isPinned && space && space !== "global") {
        Icon = PinnedIcon;
    } else {
        Icon = PointIcon;
    }

    return (
        <div className={cn("flex items-start gap-2", inGraphNode && "pt-4")}>
            <Icon />
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

export default PointCardHeader; 