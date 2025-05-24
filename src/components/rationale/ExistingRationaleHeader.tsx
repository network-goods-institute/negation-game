"use client";

import RationaleHeaderBar from "./RationaleHeaderBar";
import { Button } from "@/components/ui/button";
import { AuthenticatedActionButton } from "@/components/editor/AuthenticatedActionButton";
import { CopyIcon, LinkIcon, CheckIcon, Share2Icon } from "lucide-react";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils/cn";
import { ViewpointIcon } from "@/components/icons/AppIcons";

export interface ExistingRationaleHeaderProps {
    isSharing: boolean;
    isCopying: boolean;
    isCopyingUrl: boolean;
    toggleSharingMode: () => void;
    handleCopyUrl: () => void;
    isPageCopyConfirmOpen: boolean;
    setIsPageCopyConfirmOpen: (open: boolean) => void;
    handleCopy: () => void;
    handleBackClick: () => void;
    canvasEnabled: boolean;
    toggleCanvas: () => void;
}

export default function ExistingRationaleHeader({
    isSharing,
    isCopying,
    isCopyingUrl,
    toggleSharingMode,
    handleCopyUrl,
    isPageCopyConfirmOpen,
    setIsPageCopyConfirmOpen,
    handleCopy,
    handleBackClick,
    canvasEnabled,
    toggleCanvas,
}: ExistingRationaleHeaderProps) {
    return (
        <>
            <RationaleHeaderBar
                title={
                    <>
                        <ViewpointIcon className="size-4" />
                        <span>Rationale{isSharing ? " (Sharing)" : ""}</span>
                    </>
                }
                onBack={handleBackClick}
                isCanvasEnabled={canvasEnabled}
                toggleCanvas={toggleCanvas}
            >
                <div className="flex items-center gap-1.5 md:hidden">
                    <Button
                        size="icon"
                        variant={isSharing ? "default" : "outline"}
                        className="rounded-full p-1 size-7"
                        onClick={toggleSharingMode}
                    >
                        <Share2Icon className="size-3.5" />
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                            "rounded-full flex items-center gap-1 px-2 py-1 h-7 text-xs",
                            isCopyingUrl && "text-green-500 border-green-500"
                        )}
                        onClick={handleCopyUrl}
                    >
                        <span className="font-medium whitespace-nowrap">
                            {isCopyingUrl ? "Copied" : "Link"}
                        </span>
                        {isCopyingUrl ? (
                            <CheckIcon className="size-3" />
                        ) : (
                            <LinkIcon className="size-3" />
                        )}
                    </Button>
                    <AuthenticatedActionButton
                        variant="default"
                        size="sm"
                        className="rounded-full flex items-center gap-1 px-2 py-1 h-7 text-xs"
                        onClick={() => setIsPageCopyConfirmOpen(true)}
                        disabled={isCopying}
                    >
                        {isCopying ? (
                            <div className="flex items-center gap-1">
                                <span className="size-3 border border-background border-t-transparent rounded-full animate-spin" />
                                <span className="font-medium whitespace-nowrap">Copying</span>
                            </div>
                        ) : (
                            <>
                                <span className="font-medium whitespace-nowrap">Copy</span>
                                <CopyIcon className="size-3" />
                            </>
                        )}
                    </AuthenticatedActionButton>
                </div>
            </RationaleHeaderBar>

            <div className="hidden md:block sticky top-10 z-50 w-full bg-background/70 backdrop-blur border-b">
                <div className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            className={cn(
                                "rounded-full flex items-center gap-2 px-4",
                                isCopyingUrl && "text-green-500 border-green-500"
                            )}
                            onClick={handleCopyUrl}
                        >
                            <span className="text-sm font-bold">
                                {isCopyingUrl ? "Copied!" : "Copy Link"}
                            </span>
                            {isCopyingUrl ? (
                                <CheckIcon className="size-4" />
                            ) : (
                                <LinkIcon className="size-4" />
                            )}
                        </Button>
                        <AuthenticatedActionButton
                            variant="default"
                            className="rounded-full flex items-center gap-2 px-4"
                            onClick={() => setIsPageCopyConfirmOpen(true)}
                            disabled={isCopying}
                        >
                            {isCopying ? (
                                <div className="flex items-center gap-2">
                                    <span className="size-4 border-2 border-background border-t-transparent rounded-full animate-spin" />
                                    <span className="text-sm font-bold">Copying...</span>
                                </div>
                            ) : (
                                <>
                                    <span className="text-sm font-bold">Make a Copy</span>
                                    <CopyIcon className="size-4" />
                                </>
                            )}
                        </AuthenticatedActionButton>
                    </div>
                </div>
            </div>

            <AlertDialog open={isPageCopyConfirmOpen} onOpenChange={setIsPageCopyConfirmOpen}>
                <AlertDialogContent className="sm:max-w-[425px]">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirm Copy</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to make a copy of this rationale?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => { setIsPageCopyConfirmOpen(false); handleCopy(); }}>
                            Yes, make a copy
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
} 