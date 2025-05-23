import React from "react";
import { Panel, MiniMap, Controls } from "@xyflow/react";
import { SharePanel } from "./SharePanel";
import { SaveDiscardPanel } from "./SaveDiscardPanel";

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
}) => (
    <>
        <Panel position="bottom-right" className="z-10 mr-4 mb-10 flex flex-col items-end">
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
        <Panel position="bottom-left" className="m-2">
            <div className="relative bottom-[10px] md:bottom-[20px] mb-4">
                <Controls />
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