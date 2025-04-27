import { useState, useEffect, useCallback } from "react";
import { useDeletePoint } from "@/mutations/useDeletePoint";
import { isWithinDeletionTimelock } from "@/lib/negation-game/deleteTimelock";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { AlertTriangleIcon, TrashIcon } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";

interface DeletePointDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    pointId: number;
    createdAt: Date;
}

export function DeletePointDialog({
    open,
    onOpenChange,
    pointId,
    createdAt,
}: DeletePointDialogProps) {
    const { mutate: deletePoint, isPending, isSuccess } = useDeletePoint();
    const canDelete = isWithinDeletionTimelock(createdAt);
    const [confirmText, setConfirmText] = useState("");
    const [hasDeleted, setHasDeleted] = useState(false);
    const router = useRouter();
    const pathname = usePathname();

    const timeSinceCreation = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60));
    const hoursLeft = 8 - timeSinceCreation;

    // Get the current space from pathname if we're in a space
    const getCurrentSpaceUrl = useCallback(() => {
        // If we're in a space (/s/[space]/...), redirect to that space root
        const spaceMatch = pathname?.match(/^\/s\/([^\/]+)/);
        if (spaceMatch && spaceMatch[1]) {
            return `/s/${spaceMatch[1]}`;
        }
        // Otherwise redirect to global root
        return "/";
    }, [pathname]);

    // Handle redirection to space root after deletion
    useEffect(() => {
        if (hasDeleted) {
            const redirectUrl = getCurrentSpaceUrl();

            // Try multiple approaches to ensure navigation works
            try {
                router.replace(redirectUrl);
            } catch (e) {
                console.error("Router replace failed:", e);
            }

            // Use setTimeout to ensure the window.location redirect happens
            // even if router.replace fails
            const timer = setTimeout(() => {
                window.location.href = redirectUrl;
            }, 300);

            return () => clearTimeout(timer);
        }
    }, [hasDeleted, router, pathname, getCurrentSpaceUrl]);

    const handleDelete = () => {
        if (confirmText !== "delete") return;

        // Close the dialog first to prevent UI issues
        onOpenChange(false);

        // Initiate the delete action
        deletePoint({
            pointId
        });

        // Mark as deleted to trigger redirection
        setHasDeleted(true);

        // Immediate fallback redirect
        setTimeout(() => {
            window.location.href = getCurrentSpaceUrl();
        }, 500);
    };

    return (
        <Dialog
            open={open}
            onOpenChange={(open) => {
                // Reset confirmation text when dialog is closed
                if (!open) {
                    setConfirmText("");
                }
                onOpenChange(open);
            }}
        >
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <TrashIcon className="h-5 w-5 text-destructive" />
                        Delete Point
                    </DialogTitle>
                    <DialogDescription>
                        {canDelete
                            ? `You have ${hoursLeft} hours left to delete this point. All cred will be reimbursed to the respective users.`
                            : "This point can no longer be deleted because it was created more than 8 hours ago."}
                    </DialogDescription>
                </DialogHeader>

                {canDelete ? (
                    <>
                        <div className="grid gap-4 py-4">
                            <div className="flex items-start gap-2 text-amber-500 bg-amber-500/10 p-3 rounded-md">
                                <AlertTriangleIcon className="h-5 w-5 shrink-0 mt-0.5" />
                                <div className="text-sm">
                                    <p className="font-medium">Warning</p>
                                    <p>
                                        This action cannot be undone. This will permanently delete the
                                        point and all associated data.
                                    </p>
                                </div>
                            </div>
                            <div>
                                <p className="text-sm mb-2">Type <span className="font-bold">delete</span> to confirm</p>
                                <input
                                    type="text"
                                    value={confirmText}
                                    onChange={(e) => setConfirmText(e.target.value)}
                                    className="w-full p-2 border rounded-md"
                                    autoFocus
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button
                                variant="ghost"
                                onClick={() => onOpenChange(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={handleDelete}
                                disabled={confirmText !== "delete" || isPending}
                            >
                                {isPending ? (
                                    <>
                                        <span className="size-4 border-2 border-background border-t-transparent rounded-full animate-spin mr-2" />
                                        Deleting...
                                    </>
                                ) : (
                                    "Delete"
                                )}
                            </Button>
                        </DialogFooter>
                    </>
                ) : (
                    <DialogFooter>
                        <Button onClick={() => onOpenChange(false)}>
                            Close
                        </Button>
                    </DialogFooter>
                )}
            </DialogContent>
        </Dialog>
    );
} 