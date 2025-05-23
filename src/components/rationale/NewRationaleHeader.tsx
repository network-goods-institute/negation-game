"use client";

import RationaleHeaderBar from "@/components/RationaleHeaderBar";
import { Separator } from "@/components/ui/separator";
import { DEFAULT_SPACE } from "@/constants/config";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AuthenticatedActionButton } from "@/components/AuthenticatedActionButton";
import { Button } from "@/components/ui/button";
import { Trash2Icon } from "lucide-react";
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

export default function NewRationaleHeader({
    spaceData,
    openConfirmDialog,
    isConfirmDialogOpen,
    setIsConfirmDialogOpen,
    isPending,
    publish,
    isPublishing,
    canPublish,
    isInitialLoadDialogOpen,
    isCopiedFromSessionStorage,
    setIsInitialLoadDialogOpen,
    handleDiscardWithoutNavigation,
    isDiscardingWithoutNav,
    clearGraphAndState,
    handleBackClick,
    canvasEnabled,
    toggleCanvas,
}: {
    spaceData?: { id: string; icon?: string };
    spaceId: string;
    openConfirmDialog: () => void;
    isConfirmDialogOpen: boolean;
    setIsConfirmDialogOpen: (open: boolean) => void;
    isPending: boolean;
    publish: () => Promise<string>;
    isPublishing: boolean;
    canPublish: boolean;
    isInitialLoadDialogOpen: boolean;
    isCopiedFromSessionStorage: boolean;
    setIsInitialLoadDialogOpen: (open: boolean) => void;
    handleDiscardWithoutNavigation: () => void;
    isDiscardingWithoutNav: boolean;
    clearGraphAndState: () => void;
    handleBackClick: () => void;
    canvasEnabled: boolean;
    toggleCanvas: () => void;
}) {
    return (
        <>
            <RationaleHeaderBar
                title="New Rationale"
                onBack={handleBackClick}
                isCanvasEnabled={canvasEnabled}
                toggleCanvas={toggleCanvas}
            />
            <Separator />
            <div className="sticky top-[calc(2.5rem+1px)] z-50 w-full flex items-center justify-between gap-3 px-4 py-3 bg-background/70 backdrop-blur">
                {spaceData && spaceData.id !== DEFAULT_SPACE ? (
                    <div className="flex items-center gap-2">
                        <Avatar className="border-4 border-background size-8">
                            {spaceData.icon && (
                                <AvatarImage
                                    src={spaceData.icon}
                                    alt={`s/${spaceData.id} icon`}
                                />
                            )}
                            <AvatarFallback className="text-xl font-bold text-muted-foreground">
                                {spaceData.id.charAt(0).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                        <span className="text-md font-semibold">s/{spaceData.id}</span>
                    </div>
                ) : (
                    <div />
                )}
                <div className="flex gap-sm items-center text-muted-foreground">
                    <Button variant="ghost" size="icon" onClick={openConfirmDialog}>
                        <Trash2Icon />
                    </Button>
                    <AuthenticatedActionButton
                        size="sm"
                        className="rounded-full w-24"
                        disabled={!canPublish || isPublishing}
                        rightLoading={isPublishing}
                        onClick={() => publish()}
                    >
                        Publish
                    </AuthenticatedActionButton>
                </div>
            </div>
            <Separator />
            <AlertDialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Abandon Rationale</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to abandon this rationale? All your work will be lost.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={clearGraphAndState} disabled={isPending}>
                            {isPending ? "Abandoning..." : "Yes, abandon it"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <AlertDialog
                open={isInitialLoadDialogOpen && !isCopiedFromSessionStorage}
                onOpenChange={(open) => {
                    if (!isCopiedFromSessionStorage) setIsInitialLoadDialogOpen(open);
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Existing Draft Found</AlertDialogTitle>
                        <AlertDialogDescription>
                            Would you like to keep working on your existing draft or start fresh?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setIsInitialLoadDialogOpen(false)} disabled={isDiscardingWithoutNav}>
                            Keep Draft
                        </AlertDialogCancel>
                        <AlertDialogAction onClick={handleDiscardWithoutNavigation} disabled={isDiscardingWithoutNav}>
                            {isDiscardingWithoutNav ? (
                                <>
                                    <span className="opacity-0">Start Fresh</span>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="size-4 border-2 border-background border-t-transparent rounded-full animate-spin" />
                                    </div>
                                </>
                            ) : (
                                "Start Fresh"
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
} 