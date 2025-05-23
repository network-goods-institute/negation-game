import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getPointUrl } from "@/lib/negation-game/getPointUrl";

export interface PinBadgesProps {
    space?: string;
    linkDisabled?: boolean;
    pinnedCommandPointId?: number;
    pinStatus?: string;
    parsePinCommand?: string | null;
    onPinBadgeClickCapture?: React.MouseEventHandler;
    handlePinCommandClick: React.MouseEventHandler;
    handleTargetPointClick: React.MouseEventHandler;
}

export const PinBadges: React.FC<PinBadgesProps> = ({
    space,
    linkDisabled,
    pinnedCommandPointId,
    pinStatus,
    parsePinCommand,
    onPinBadgeClickCapture,
    handlePinCommandClick,
    handleTargetPointClick,
}) => {
    if (!space || space === 'global') return null;

    return (
        <>
            {pinnedCommandPointId && (
                <Badge variant="outline" className="ml-2 text-xs">
                    {!linkDisabled ? (
                        <Link
                            href={getPointUrl(pinnedCommandPointId, space)}
                            onClick={(e) => {
                                e.stopPropagation();
                                onPinBadgeClickCapture?.(e);
                            }}
                            className="inline-block w-full h-full"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <Button
                                type="button"
                                variant="link"
                                className="h-auto p-0 text-muted-foreground hover:text-foreground w-full"
                                data-action-button="true"
                                onClick={handlePinCommandClick}
                            >
                                {pinStatus || "Pinned by command"}
                            </Button>
                        </Link>
                    ) : (
                        <Button
                            type="button"
                            variant="link"
                            className="h-auto p-0 text-muted-foreground hover:text-foreground"
                            data-action-button="true"
                            onClick={handlePinCommandClick}
                        >
                            {pinStatus || "Pinned by command"}
                        </Button>
                    )}
                </Badge>
            )}
            {parsePinCommand && (
                <Badge variant="outline" className="ml-2 text-xs">
                    {!linkDisabled ? (
                        <Link
                            href={`/s/${space}/${parsePinCommand}`}
                            onClick={(e) => {
                                e.stopPropagation();
                                onPinBadgeClickCapture?.(e);
                            }}
                            className="inline-block w-full h-full"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <Button
                                type="button"
                                variant="link"
                                className="h-auto p-0 text-muted-foreground hover:text-foreground w-full"
                                data-action-button="true"
                                onClick={handleTargetPointClick}
                            >
                                Proposal to pin
                            </Button>
                        </Link>
                    ) : (
                        <Button
                            type="button"
                            variant="link"
                            className="h-auto p-0 text-muted-foreground hover:text-foreground"
                            data-action-button="true"
                            onClick={handleTargetPointClick}
                        >
                            Proposal to pin
                        </Button>
                    )}
                </Badge>
            )}
        </>
    );
};

export default PinBadges; 