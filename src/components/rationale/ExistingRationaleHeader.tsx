"use client";

import RationaleHeaderBar from "./RationaleHeaderBar";
import { Button } from "@/components/ui/button";
import { AuthenticatedActionButton } from "@/components/editor/AuthenticatedActionButton";
import { CopyIcon, LinkIcon, CheckIcon, Share2Icon, Handshake as HandshakeIcon } from "lucide-react";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils/cn";
import { ViewpointIcon } from "@/components/icons/AppIcons";
import { useAtom } from "jotai";
import { showEndorsementsAtom } from "@/atoms/showEndorsementsAtom";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

export interface ExistingRationaleHeaderProps {
    isSharing: boolean;
    isCopying: boolean;
    isCopyingUrl: boolean;
    toggleSharingMode: () => void;
    handleCopyUrl: () => void;
    isPageCopyConfirmOpen: boolean;
    setIsPageCopyConfirmOpen: (open: boolean) => void;
    handleCopy: (publishOnCopy: boolean) => void;
    handleBackClick: () => void;
    canvasEnabled: boolean;
    toggleCanvas: () => void;
    isOwner: boolean;
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
    isOwner,
}: ExistingRationaleHeaderProps) {
    const [showEndorsements, setShowEndorsements] = useAtom(showEndorsementsAtom);
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
                <div className="flex items-center gap-2 md:hidden">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                size="icon"
                                variant={showEndorsements ? "default" : "outline"}
                                className="rounded-full p-1 size-7"
                                onClick={() => setShowEndorsements(!showEndorsements)}
                            >
                                <HandshakeIcon className="size-3.5" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" align="center">
                            Toggle showing all endorsements<br />
                            (gold = OP-only; gold+stripe = OP+others; blue = others-only)
                        </TooltipContent>
                    </Tooltip>
                    <Button
                        size="icon"
                        variant={isSharing ? "default" : "outline"}
                        className="rounded-full p-1 size-7"
                        onClick={toggleSharingMode}
                    >
                        <Share2Icon className="size-3.5" />
                    </Button>
                    <Button
                        size="icon"
                        variant="outline"
                        className={cn(
                            "rounded-full p-1 size-7",
                            isCopyingUrl && "text-green-500 border-green-500"
                        )}
                        onClick={handleCopyUrl}
                    >
                        {isCopyingUrl ? (
                            <CheckIcon className="size-3.5" />
                        ) : (
                            <LinkIcon className="size-3.5" />
                        )}
                    </Button>
                    <AuthenticatedActionButton
                        size="icon"
                        variant={isOwner ? "outline" : "default"}
                        className="rounded-full p-1 size-7"
                        onClick={() => setIsPageCopyConfirmOpen(true)}
                        disabled={isCopying}
                    >
                        {isCopying ? (
                            <div className="flex items-center justify-center size-full">
                                <span className="size-3 border border-background border-t-transparent rounded-full animate-spin" />
                            </div>
                        ) : (
                            <CopyIcon className="size-3.5" />
                        )}
                    </AuthenticatedActionButton>
                </div>
            </RationaleHeaderBar>

            <div className="hidden md:block sticky top-10 z-40 w-full bg-background/70 backdrop-blur border-b">
                <div className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="flex items-center gap-2">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    size="icon"
                                    variant={showEndorsements ? "default" : "outline"}
                                    className="rounded-full p-1 size-7"
                                    onClick={() => setShowEndorsements(!showEndorsements)}
                                >
                                    <HandshakeIcon className="size-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" align="center">
                                Toggle showing all endorsements<br />
                                (gold = OP-only; gold+stripe = OP+others; blue = others-only)
                            </TooltipContent>
                        </Tooltip>
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
                            variant={isOwner ? "outline" : "default"}
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
                        <Button
                            variant="outline"
                            className="mt-2 sm:mt-0"
                            onClick={() => {
                                setIsPageCopyConfirmOpen(false);
                                handleCopy(false);
                            }}
                        >
                            Copy
                        </Button>
                        <AlertDialogAction
                            onClick={() => {
                                setIsPageCopyConfirmOpen(false);
                                handleCopy(true);
                            }}
                        >
                            Copy & Publish
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
} 