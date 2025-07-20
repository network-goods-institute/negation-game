"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { TrashIcon } from "@/components/icons/TrashIcon";
import { cn } from "@/lib/utils/cn";
import {
    NetworkIcon,
    Repeat2Icon,
    MoreVertical,
    ClipboardCopyIcon,
} from "lucide-react";
import { DeltaComparisonWidget } from '@/components/delta/DeltaComparisonWidget';
import { SpaceChildHeader } from '@/components/layouts/headers/SpaceChildHeader';

interface PointPageHeaderProps {
    backButtonHandler: () => void;
    spaceData: any;
    canvasEnabled: boolean;
    toggleSelectNegationDialog: (open: boolean) => void;
    handleCanvasToggle: () => void;
    point: any;
    privyUser: any;
    handleCopyMarkdownLink: () => void;
    isPointOwner: boolean;
    canDeletePoint: boolean;
    setDeleteDialogOpen: (open: boolean) => void;
}

export function PointPageHeader({
    backButtonHandler,
    spaceData,
    canvasEnabled,
    toggleSelectNegationDialog,
    handleCanvasToggle,
    point,
    privyUser,
    handleCopyMarkdownLink,
    isPointOwner,
    canDeletePoint,
    setDeleteDialogOpen,
}: PointPageHeaderProps) {

    const rightActions = (
        <TooltipProvider>
            <div className="flex flex-row items-center gap-1 text-muted-foreground">
                {point && (
                    <DeltaComparisonWidget
                        comparison={{ type: "point", pointId: point.pointId }}
                        title="Point Alignment Discovery"
                        description="Find users who agree or disagree with you on this point cluster"
                        currentUserId={privyUser?.id}
                    />
                )}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            className="p-2 rounded-full size-fit hover:bg-muted/30"
                            data-action-button="true"
                            onClick={() => toggleSelectNegationDialog(true)}
                        >
                            <Repeat2Icon className="size-6 stroke-1" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                        <p>Select from related points</p>
                    </TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            size={"icon"}
                            variant={canvasEnabled ? "default" : "outline"}
                            className="rounded-full p-2 size-9"
                            data-action-button="true"
                            onClick={handleCanvasToggle}
                        >
                            <NetworkIcon className="" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                        <p>{canvasEnabled ? "Close graph view" : "View as graph"}</p>
                    </TooltipContent>
                </Tooltip>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            className="p-2 rounded-full size-fit hover:bg-muted/30"
                            data-action-button="true"
                        >
                            <MoreVertical className="size-6 stroke-1" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem
                            onClick={handleCopyMarkdownLink}
                            disabled={!point?.content}
                            className="cursor-pointer"
                        >
                            <ClipboardCopyIcon className="mr-2 size-4" />
                            <span>Copy Markdown Link</span>
                        </DropdownMenuItem>

                        {isPointOwner && (
                            <DropdownMenuItem
                                onClick={() => setDeleteDialogOpen(true)}
                                disabled={!canDeletePoint}
                                className={cn(
                                    "cursor-pointer",
                                    !canDeletePoint ? "opacity-50 cursor-not-allowed" : "text-destructive focus:text-destructive focus:bg-destructive/10"
                                )}
                                title={!canDeletePoint ? "Points can only be deleted within 8 hours of creation" : "Delete this point"}
                            >
                                <TrashIcon disabled={!canDeletePoint} className="mr-2 size-4" />
                                <div className="flex flex-col">
                                    <span>Delete Point</span>
                                    {!canDeletePoint && (
                                        <span className="text-xs text-muted-foreground">
                                            Only within 8 hours
                                        </span>
                                    )}
                                </div>
                            </DropdownMenuItem>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </TooltipProvider>
    );

    const subtitle = spaceData?.data ? (
        <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
                {spaceData.data.icon && (
                    <AvatarImage
                        src={spaceData.data.icon}
                        alt={`s/${spaceData.data.id} icon`}
                    />
                )}
                <AvatarFallback className="text-xs font-bold text-muted-foreground">
                    {spaceData.data.id.charAt(0).toUpperCase()}
                </AvatarFallback>
            </Avatar>
            <span>s/{spaceData.data.id}</span>
        </div>
    ) : undefined;

    return (
        <SpaceChildHeader
            title=""
            subtitle={subtitle}
            onBack={backButtonHandler}
            rightActions={rightActions}
        />
    );
}