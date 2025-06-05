import React from "react";
import { Panel, MiniMap, Controls } from "@xyflow/react";
import { SharePanel } from "./SharePanel";
import { SaveDiscardPanel } from "./SaveDiscardPanel";
import { useAtom } from 'jotai';
import { dynamicNodeSizingAtom } from '@/atoms/graphSettingsAtom';
import { Switch } from '@/components/ui/switch';
import { useReactFlow } from "@xyflow/react";
import { nanoid } from "nanoid";
import { MessageSquareIcon } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import type { AppNode } from "@/components/graph/nodes/AppNode";

export interface GraphControlsProps {
    isSharing?: boolean;
    hideShareButton?: boolean;
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
}

function DynamicSizingToggle() {
    const [dynamicSizing, setDynamicSizing] = useAtom(dynamicNodeSizingAtom);
    return (
        <div className="self-start flex items-center space-x-2 mb-4 bg-gray-100 dark:bg-gray-800 p-2 rounded">
            <Switch checked={dynamicSizing} onCheckedChange={setDynamicSizing} />
            <span className="text-sm">Dynamic node sizing</span>
        </div>
    );
}

export const GraphControls: React.FC<GraphControlsProps> = ({
    isSharing = false,
    hideShareButton = false,
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
}) => {
    const reactFlow = useReactFlow<AppNode>();
    const handleAddComment = () => {
        const { x: vpX, y: vpY, zoom } = reactFlow.getViewport();
        const screenX = window.innerWidth / 2;
        const screenY = window.innerHeight / 2;
        const position = { x: (screenX - vpX) / zoom, y: (screenY - vpY) / zoom };
        const id = `comment-${nanoid()}`;
        reactFlow.addNodes([{ id, type: "comment", position, data: { content: "" } }]);
    };

    return (
        <>
            <Panel position="top-left" className="z-10 mt-1 ml-2 flex items-center">
                {canModify && (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="outline" size="icon" onClick={handleAddComment}>
                                <MessageSquareIcon className="size-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                            <p>Add comment</p>
                        </TooltipContent>
                    </Tooltip>
                )}
            </Panel>
            <Panel position="bottom-left" className="m-2">
                <div className="relative bottom-[10px] md:bottom-[20px] mb-4">
                    <Controls />
                </div>
            </Panel>
            <Panel position="bottom-right" className="z-10 mr-4 mb-10 flex flex-col items-end">
                <DynamicSizingToggle />
                <SharePanel
                    isSharing={isSharing}
                    hideShareButton={hideShareButton}
                    numberOfSelectedPoints={numberOfSelectedPoints}
                    handleGenerateAndCopyShareLink={handleGenerateAndCopyShareLink}
                    toggleSharingMode={toggleSharingMode}
                    isSaving={isSaving}
                    isDiscarding={isDiscarding}
                />
                <div className="relative mt-4">
                    <MiniMap nodeStrokeWidth={3} zoomable pannable />
                </div>
            </Panel>
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
        </>
    );
}; 