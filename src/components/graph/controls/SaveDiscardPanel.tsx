"use client";

import React, { memo } from "react";
import { Panel } from "@xyflow/react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { AuthenticatedActionButton } from "@/components/editor/AuthenticatedActionButton";
import { XIcon, Trash2Icon } from "lucide-react";
import { Loader } from "@/components/ui/loader";
import { cn } from "@/lib/utils/cn";

export interface SaveDiscardPanelProps {
    onClose?: () => void;
    closeButtonClassName?: string;
    isModified: boolean;
    isContentModified: boolean;
    isNew: boolean;
    canModify?: boolean;
    isSaving: boolean;
    isSavingLocal: boolean;
    isDiscarding: boolean;
    onSave: () => void;
    onCopyAsNew: () => void;
    onOpenDiscardDialog: () => void;
    className?: string;
}

export const SaveDiscardPanel: React.FC<SaveDiscardPanelProps> = memo(({
    onClose,
    closeButtonClassName,
    isModified,
    isContentModified,
    isNew,
    canModify,
    isSaving,
    isSavingLocal,
    isDiscarding,
    onSave,
    onCopyAsNew,
    onOpenDiscardDialog,
}) => {
    const showActions = isModified || isContentModified;

    return (
        <Panel position="top-right" className="m-2">
            <div className="flex flex-col items-end gap-2 mt-16 sm:mt-0">
                {onClose && (
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        className={cn("bg-background/80", closeButtonClassName)}
                    >
                        <XIcon />
                    </Button>
                )}
                {showActions && !isNew && (
                    <div className="flex flex-col gap-2 bg-background/95 p-3 rounded-md shadow-md border border-border">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <AuthenticatedActionButton
                                    variant="default"
                                    onClick={canModify ? onSave : onCopyAsNew}
                                    disabled={isSaving || isSavingLocal}
                                    className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg px-4 py-2 flex items-center justify-center w-[160px]"
                                >
                                    {isSaving || isSavingLocal ? (
                                        <div className="flex items-center">
                                            <Loader className="size-4 animate-spin text-white mr-2" />
                                            <span className="text-white">Saving...</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center">
                                            <span className={cn(
                                                "text-xs font-medium",
                                                canModify === false && "text-[11px] leading-none"
                                            )}>
                                                {canModify
                                                    ? isNew
                                                        ? "Publish Rationale"
                                                        : "Publish Changes"
                                                    : "Save as New Rationale"}
                                            </span>
                                        </div>
                                    )}
                                </AuthenticatedActionButton>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>{canModify ? 'Save changes' : 'Save your changes as a new rationale.'}</p>
                            </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="secondary"
                                    onClick={onOpenDiscardDialog}
                                    disabled={isSaving || isSavingLocal || isDiscarding}
                                    className="bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-lg px-4 py-2 flex items-center justify-center gap-2 w-[160px]"
                                >
                                    {isDiscarding ? <Loader className="size-4 animate-spin" /> : <Trash2Icon className="size-4" />}
                                    <span className="text-sm font-medium">Discard Changes</span>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Discard changes</p>
                            </TooltipContent>
                        </Tooltip>
                    </div>
                )}
            </div>
        </Panel>
    );
});

SaveDiscardPanel.displayName = 'SaveDiscardPanel'; 