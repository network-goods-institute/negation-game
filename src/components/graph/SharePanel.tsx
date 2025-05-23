"use client";

import React, { memo } from "react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Share2Icon, XIcon } from "lucide-react";

export interface SharePanelProps {
    isSharing: boolean;
    hideShareButton?: boolean;
    numberOfSelectedPoints: number;
    handleGenerateAndCopyShareLink?: () => void;
    toggleSharingMode?: () => void;
    isSaving?: boolean;
    isDiscarding?: boolean;
}

export const SharePanel: React.FC<SharePanelProps> = memo(({
    isSharing,
    hideShareButton,
    numberOfSelectedPoints,
    handleGenerateAndCopyShareLink,
    toggleSharingMode,
    isSaving,
    isDiscarding,
}) => {
    if (hideShareButton) return null;

    return (
        // This div provides the consistent positioning and appearance for the share controls block.
        // mb-1 is a slight adjustment from mb-48 to be just above the minimap in the new combined panel structure.
        // GraphControls will ensure this is placed correctly relative to the MiniMap.
        <div className="flex flex-col gap-2 mb-48 mr-6 bg-background/95 p-3 rounded-md shadow-md border border-border">
            {isSharing ? (
                <>
                    <Button
                        variant="default"
                        onClick={handleGenerateAndCopyShareLink}
                        disabled={numberOfSelectedPoints === 0 || isSaving}
                        className="shadow-lg px-4 py-2 flex items-center justify-center gap-2 w-[160px] text-sm"
                    >
                        <Share2Icon className="size-4" />
                        <span>Generate Link</span>
                        {numberOfSelectedPoints > 0 && (
                            <span className="ml-1 font-bold">({numberOfSelectedPoints})</span>
                        )}
                    </Button>
                    <Button
                        variant="secondary"
                        onClick={toggleSharingMode}
                        disabled={isDiscarding}
                        className="bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-lg px-4 py-2 flex items-center justify-center gap-2 w-[160px] text-sm"
                    >
                        <XIcon className="size-4" />
                        <span>Cancel Sharing</span>
                    </Button>
                </>
            ) : (
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="secondary"
                            onClick={toggleSharingMode}
                            disabled={isSaving || isDiscarding}
                            className="bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-lg px-4 py-2 flex items-center justify-center gap-2 w-[160px] text-sm"
                        >
                            <Share2Icon className="size-4" />
                            <span>Share Points</span>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Share points</p>
                    </TooltipContent>
                </Tooltip>
            )}
        </div>
    );
});

SharePanel.displayName = 'SharePanel'; 