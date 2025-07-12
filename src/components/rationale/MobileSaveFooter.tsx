import React from 'react';
import { Button } from '@/components/ui/button';
import { AuthenticatedActionButton } from '@/components/editor/AuthenticatedActionButton';
import useIsMobile from '@/hooks/ui/useIsMobile';

export interface MobileSaveFooterProps {
    isOwner: boolean;
    isGraphModified: boolean;
    isContentModified: boolean;
    isSaving: boolean;
    commitSaveChanges: () => Promise<boolean>;
    resetContentModifications: () => void;
    clearGraphModifications: () => void;
    canvasEnabled: boolean;
}

export default function MobileSaveFooter({
    isOwner,
    isGraphModified,
    isContentModified,
    isSaving,
    commitSaveChanges,
    resetContentModifications,
    clearGraphModifications,
    canvasEnabled,
}: MobileSaveFooterProps) {
    const isMobile = useIsMobile(768);

    if (!isMobile || canvasEnabled || !(isGraphModified || isContentModified)) {
        return null;
    }

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-background/95 border-t border-border p-3 flex flex-col gap-2 z-20 md:hidden">
            <AuthenticatedActionButton
                variant="default"
                size="sm"
                className="w-full"
                onClick={() => commitSaveChanges()}
                disabled={isSaving || (!isContentModified && !isGraphModified)}
                rightLoading={isSaving}
            >
                {isOwner ? 'Publish Changes' : 'Save as Copy'}
            </AuthenticatedActionButton>
            <Button
                variant="secondary"
                size="sm"
                className="w-full"
                onClick={() => {
                    resetContentModifications();
                    clearGraphModifications();
                }}
                disabled={!isContentModified && !isGraphModified}
            >
                Discard Changes
            </Button>
        </div>
    );
} 