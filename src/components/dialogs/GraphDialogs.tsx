import React from 'react';
import { cn } from '@/lib/utils/cn';
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogCancel,
    AlertDialogAction,
} from '@/components/ui/alert-dialog';
import {
    AlertDialog as CopyConfirmDialog,
    AlertDialogContent as CopyConfirmContent,
    AlertDialogHeader as CopyConfirmHeader,
    AlertDialogTitle as CopyConfirmTitle,
    AlertDialogDescription as CopyConfirmDescription,
    AlertDialogFooter as CopyConfirmFooter,
    AlertDialogCancel as CopyConfirmCancel,
    AlertDialogAction as CopyConfirmAction,
} from '@/components/ui/alert-dialog';
import { SaveConfirmDialog } from './SaveConfirmDialog';
import { ShareRationaleDialog } from './ShareRationalePointsDialog';

export interface GraphDialogsProps {
    isDiscardDialogOpen: boolean;
    closeDiscardDialog: () => void;
    handleConfirmDiscard: () => void | Promise<void>;

    isCopyConfirmOpen: boolean;
    closeCopyConfirmDialog: () => void;
    handleConfirmCopy: () => Promise<boolean>;

    isSaveAsNewConfirmOpen: boolean;
    closeSaveAsNewConfirmDialog: () => void;
    handleConfirmSaveAsNew: () => Promise<boolean>;

    isSaveConfirmDialogOpen: boolean;
    cancelSaveConfirmation: () => void;
    executeSaveExisting: () => Promise<boolean>;
    executeSaveAsNew: () => Promise<boolean>;
    saveConfirmData: {
        viewCountSinceLastUpdate: number;
        lastUpdated: Date | null;
        daysSinceUpdate: number;
    };
    currentSaveAction: 'existing' | 'new' | null;

    isShareDialogOpen: boolean;
    onShareDialogOpenChange: (open: boolean) => void;
    shareDialogMode: 'share' | 'view';
    sharedPoints: number[];
    sharedByUsername?: string;
    rationaleId?: string;
    spaceId: string;
}

export const GraphDialogs: React.FC<GraphDialogsProps> = ({
    isDiscardDialogOpen,
    closeDiscardDialog,
    handleConfirmDiscard,

    isCopyConfirmOpen,
    closeCopyConfirmDialog,
    handleConfirmCopy,

    isSaveAsNewConfirmOpen,
    closeSaveAsNewConfirmDialog,
    handleConfirmSaveAsNew,

    isSaveConfirmDialogOpen,
    cancelSaveConfirmation,
    executeSaveExisting,
    executeSaveAsNew,
    saveConfirmData,
    currentSaveAction,

    isShareDialogOpen,
    onShareDialogOpenChange,
    shareDialogMode,
    sharedPoints,
    sharedByUsername,
    rationaleId,
    spaceId,
}) => (
    <>
        <AlertDialog
            open={isDiscardDialogOpen}
            onOpenChange={(open) => (open ? null : closeDiscardDialog())}
        >
            <AlertDialogContent className={cn('sm:max-w-[425px]')}>
                <AlertDialogHeader>
                    <AlertDialogTitle>You have unsaved changes</AlertDialogTitle>
                    <AlertDialogDescription>
                        Do you want to save your changes or discard them?
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel
                        disabled={currentSaveAction !== null}
                        onClick={closeDiscardDialog}
                        className="bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                        Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                        disabled={currentSaveAction !== null}
                        onClick={handleConfirmDiscard}
                        className="bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    >
                        Discard changes
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        <CopyConfirmDialog
            open={isCopyConfirmOpen}
            onOpenChange={(open) => (open ? null : closeCopyConfirmDialog())}
        >
            <CopyConfirmContent>
                <CopyConfirmHeader>
                    <CopyConfirmTitle>Confirm Copy</CopyConfirmTitle>
                    <CopyConfirmDescription>
                        Are you sure you want to make a copy of this rationale?
                    </CopyConfirmDescription>
                </CopyConfirmHeader>
                <CopyConfirmFooter>
                    <CopyConfirmCancel onClick={closeCopyConfirmDialog}>
                        Cancel
                    </CopyConfirmCancel>
                    <CopyConfirmAction onClick={() => handleConfirmCopy()}>
                        Yes, make a copy
                    </CopyConfirmAction>
                </CopyConfirmFooter>
            </CopyConfirmContent>
        </CopyConfirmDialog>

        <AlertDialog
            open={isSaveAsNewConfirmOpen}
            onOpenChange={(open) => (open ? null : closeSaveAsNewConfirmDialog())}
        >
            <AlertDialogContent className="sm:max-w-[425px]">
                <AlertDialogHeader>
                    <AlertDialogTitle>
                        Confirm Save as New Rationale
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        Are you sure you want to save your changes as a new rationale? This will create a copy.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={closeSaveAsNewConfirmDialog}>
                        Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction onClick={async () => {
                        await handleConfirmSaveAsNew();
                    }}>
                        Yes, save as new
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        <SaveConfirmDialog
            open={isSaveConfirmDialogOpen}
            onOpenChange={(open) => open ? null : cancelSaveConfirmation()}
            onSaveExisting={executeSaveExisting}
            onSaveAsNew={executeSaveAsNew}
            onCancel={cancelSaveConfirmation}
            viewCountSinceLastUpdate={saveConfirmData.viewCountSinceLastUpdate}
            lastUpdated={saveConfirmData.lastUpdated || undefined}
            isProcessing={currentSaveAction !== null}
            saveAction={currentSaveAction}
        />

        <ShareRationaleDialog
            open={isShareDialogOpen}
            onOpenChange={onShareDialogOpenChange}
            rationaleId={rationaleId}
            spaceId={spaceId}
            initialPoints={shareDialogMode === 'view' ? sharedPoints : undefined}
            sharedBy={shareDialogMode === 'view' ? sharedByUsername : undefined}
        />
    </>
); 