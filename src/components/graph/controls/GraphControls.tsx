import React, { useState } from "react";
import { Panel, MiniMap, Controls } from "@xyflow/react";
import { SharePanel } from "./SharePanel";
import { SaveDiscardPanel } from "./SaveDiscardPanel";
import { useReactFlow } from "@xyflow/react";
import { nanoid } from "nanoid";
import { MessageSquareIcon } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import type { AppNode } from "@/components/graph/nodes/AppNode";

export interface GraphControlsProps {
    isSharing?: boolean;
    hideShareButton?: boolean;
    hideSavePanel?: boolean;
    hideComments?: boolean;
    numberOfSelectedPoints: number;
    handleGenerateAndCopyShareLink?: () => void;
    toggleSharingMode?: () => void;
    isSaving: boolean;
    isDiscarding: boolean;
    isModified: boolean;
    isContentModified: boolean;
    isNew: boolean;
    canModify?: boolean;
    isSavingLocal: boolean;
    onSave: () => void;
    onCopyAsNew: () => void;
    onOpenDiscardDialog: () => void;
    unsavedChangesModalClassName?: string;
    onClose?: () => void;
    closeButtonClassName?: string;
    topOffsetPx?: number;
    onPublish?: () => void;
    canPublish?: boolean;
    isPublishing?: boolean;
}


export const GraphControls: React.FC<GraphControlsProps> = ({
    isSharing = false,
    hideShareButton = false,
    hideSavePanel = false,
    hideComments = false,
    numberOfSelectedPoints,
    handleGenerateAndCopyShareLink,
    toggleSharingMode,
    isSaving,
    isDiscarding,
    isModified,
    isContentModified,
    isNew,
    canModify,
    isSavingLocal,
    onSave,
    onCopyAsNew,
    onOpenDiscardDialog,
    unsavedChangesModalClassName,
    onClose,
    closeButtonClassName,
    topOffsetPx = 0,
    onPublish,
    canPublish = false,
    isPublishing = false,
}) => {
    const reactFlow = useReactFlow<AppNode>();

    const handleAddComment = () => {
        const { x: vpX, y: vpY, zoom } = reactFlow.getViewport();
        const screenX = window.innerWidth / 2;
        const screenY = window.innerHeight / 2;
        const position = { x: (screenX - vpX) / zoom, y: (screenY - vpY) / zoom };
        const id = `comment-${nanoid()}`;
        reactFlow.addNodes([{
            id,
            type: "comment",
            position,
            data: { content: "", _lastModified: Date.now() }
        }]);

        // Mark as modified since we're adding a new comment
        if (typeof (reactFlow as any).markAsModified === 'function') {
            (reactFlow as any).markAsModified();
        }
    };

    return (
        <>
            <Panel position="bottom-left" className="m-2">
                <div className="relative bottom-[10px] md:bottom-[20px] mb-6">
                    <Controls />
                </div>
            </Panel>
            <Panel position="bottom-right" className="z-10 mr-2 mb-4 md:mr-6 md:mb-12 flex flex-col items-end gap-3">
                {!hideComments && (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleAddComment}
                                className="bg-white dark:bg-gray-800 border-blue-200 dark:border-blue-700 hover:bg-white dark:hover:bg-gray-800 text-blue-700 dark:text-blue-300 shadow-md mr-12"
                            >
                                <MessageSquareIcon className="size-4 mr-1" />
                                Add Comment
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="left">
                            <p>Add a comment to annotate your graph</p>
                        </TooltipContent>
                    </Tooltip>
                )}
                <SharePanel
                    isSharing={isSharing}
                    hideShareButton={hideShareButton}
                    numberOfSelectedPoints={numberOfSelectedPoints}
                    handleGenerateAndCopyShareLink={handleGenerateAndCopyShareLink}
                    toggleSharingMode={toggleSharingMode}
                    isSaving={isSaving}
                    isDiscarding={isDiscarding}
                    isNew={isNew}
                    onPublish={onPublish}
                    canPublish={canPublish}
                    isPublishing={isPublishing}
                />
                <div className="relative mt-4">
                    <MiniMap nodeStrokeWidth={3} zoomable pannable />
                </div>
            </Panel>
            {!hideSavePanel && (
                <SaveDiscardPanel
                    onClose={onClose}
                    closeButtonClassName={closeButtonClassName}
                    isModified={isModified}
                    isContentModified={isContentModified}
                    isNew={isNew}
                    canModify={canModify}
                    isSaving={isSaving}
                    isSavingLocal={isSavingLocal}
                    isDiscarding={isDiscarding}
                    onSave={onSave}
                    onCopyAsNew={onCopyAsNew}
                    onOpenDiscardDialog={onOpenDiscardDialog}
                    className={unsavedChangesModalClassName}
                />
            )}
        </>
    );
};