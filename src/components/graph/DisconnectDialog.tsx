import React from "react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export interface DisconnectDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
    isCollapsing: boolean;
}

export function DisconnectDialog({
    open,
    onOpenChange,
    onConfirm,
    isCollapsing,
}: DisconnectDialogProps) {
    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Disconnect Point</AlertDialogTitle>
                    <AlertDialogDescription>
                        Are you sure you want to disconnect this point? You won&apos;t be able to reopen it from the statement node, but you can always add it again later via search.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isCollapsing}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={onConfirm}
                        disabled={isCollapsing}
                        className="relative"
                    >
                        {isCollapsing ? (
                            <>
                                <span className="opacity-0">Yes, disconnect it</span>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="size-4 border-2 border-background border-t-transparent rounded-full animate-spin" />
                                </div>
                            </>
                        ) : (
                            "Yes, disconnect it"
                        )}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
} 