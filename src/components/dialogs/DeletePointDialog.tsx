import { useState, useEffect, useCallback } from "react";
import { useDeletePoint } from "@/mutations/points/useDeletePoint";
import { validatePointDeletion, ValidationResult } from "@/actions/points/validatePointDeletion";
import {
    generateConfirmationRequirement,
    validateConfirmation,
    getConfirmationPreview,
    ConfirmationRequirement
} from "@/lib/negation-game/deletionConfirmation";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { AlertTriangleIcon, TrashIcon, XCircleIcon, InfoIcon } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

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
    const [confirmText, setConfirmText] = useState("");
    const [confirmationRequirement, setConfirmationRequirement] = useState<ConfirmationRequirement | null>(null);
    const router = useRouter();
    const pathname = usePathname();

    const {
        data: validation,
        isLoading: isValidating,
        error: validationError
    } = useQuery({
        queryKey: ['validate-deletion', pointId],
        queryFn: () => validatePointDeletion(pointId),
        enabled: open && !!pointId,
        staleTime: 30000,
    });

    useEffect(() => {
        if (validation?.point?.content && validation.canDelete) {
            const requirement = generateConfirmationRequirement(
                validation.point.content,
                validation.point.id
            );
            setConfirmationRequirement(requirement);
        } else {
            setConfirmationRequirement(null);
        }
    }, [validation]);

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

    // Reset confirmation text when dialog opens/closes
    useEffect(() => {
        if (!open) {
            setConfirmText("");
            setConfirmationRequirement(null);
        }
    }, [open]);

    // Handle redirect after successful deletion
    useEffect(() => {
        if (isSuccess) {
            // Close dialog and redirect
            onOpenChange(false);
            const redirectUrl = getCurrentSpaceUrl();

            // Small delay to allow success toast to show
            setTimeout(() => {
                router.replace(redirectUrl);
            }, 500);
        }
    }, [isSuccess, onOpenChange, router, getCurrentSpaceUrl]);

    const isConfirmationValid = confirmationRequirement && validateConfirmation(confirmText, confirmationRequirement);
    const canSubmit = validation?.canDelete && isConfirmationValid && !isPending;

    const handleDelete = () => {
        if (!canSubmit) return;

        // Initiate the delete action
        // Dialog will close and redirect automatically on success via useEffect
        deletePoint({ pointId });
    };

    const timeSinceCreation = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60));
    const hoursLeft = 8 - timeSinceCreation;

    const renderValidationErrors = () => {
        if (!validation?.errors.length) return null;

        return (
            <div className="flex items-start gap-2 text-red-600 bg-red-50 dark:bg-red-950/20 p-3 rounded-md">
                <XCircleIcon className="h-5 w-5 shrink-0 mt-0.5" />
                <div className="text-sm">
                    <p className="font-medium">Cannot Delete Point</p>
                    <ul className="mt-1 space-y-1">
                        {validation.errors.map((error, index) => (
                            <li key={index}>• {error}</li>
                        ))}
                    </ul>
                </div>
            </div>
        );
    };

    const renderValidationWarnings = () => {
        if (!validation?.warnings.length) return null;

        return (
            <div className="flex items-start gap-2 text-amber-600 bg-amber-50 dark:bg-amber-950/20 p-3 rounded-md">
                <InfoIcon className="h-5 w-5 shrink-0 mt-0.5" />
                <div className="text-sm">
                    <p className="font-medium">Additional Effects</p>
                    <ul className="mt-1 space-y-1">
                        {validation.warnings.map((warning, index) => (
                            <li key={index}>• {warning}</li>
                        ))}
                    </ul>
                </div>
            </div>
        );
    };

    const renderPointPreview = () => {
        if (!validation?.point?.content) return null;

        return (
            <div className="bg-muted/30 p-3 rounded-md">
                <p className="text-xs text-muted-foreground mb-1">Point to be deleted:</p>
                <p className="text-sm font-medium">
                    &quot;{validation.point.content.length > 100
                        ? validation.point.content.substring(0, 100) + "..."
                        : validation.point.content}&quot;
                </p>
            </div>
        );
    };

    const renderConfirmationInput = () => {
        if (!confirmationRequirement || !validation?.canDelete) return null;

        const preview = getConfirmationPreview(confirmationRequirement);
        const isValid = validateConfirmation(confirmText, confirmationRequirement);

        return (
            <div>
                <div className="mb-2">
                    <p className="text-sm font-medium mb-1">{confirmationRequirement.description}:</p>
                    <p className="text-sm text-muted-foreground">
                        Expected: <span className="font-mono bg-muted px-1 rounded">{preview}</span>
                    </p>
                </div>
                <input
                    type="text"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    className={`w-full p-2 border rounded-md ${confirmText && !isValid
                        ? 'border-red-500 bg-red-50 dark:bg-red-950/20'
                        : isValid
                            ? 'border-green-500 bg-green-50 dark:bg-green-950/20'
                            : ''
                        }`}
                    placeholder="Type the required text..."
                    autoFocus
                />
                {confirmText && !isValid && (
                    <p className="text-xs text-red-600 mt-1">Text doesn&apos;t match. Check spelling and punctuation.</p>
                )}
            </div>
        );
    };

    return (
        <Dialog
            open={open}
            onOpenChange={onOpenChange}
        >
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <TrashIcon className="h-5 w-5 text-destructive" />
                        Delete Point
                    </DialogTitle>
                    <DialogDescription>
                        {hoursLeft > 0
                            ? `You have ${hoursLeft} hours left to delete this point. All cred will be reimbursed.`
                            : "This point can no longer be deleted because it was created more than 8 hours ago."}
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    {/* Loading state */}
                    {isValidating && (
                        <div className="flex items-center justify-center py-4">
                            <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
                            <span className="ml-2 text-sm text-muted-foreground">Validating deletion...</span>
                        </div>
                    )}

                    {/* Validation error */}
                    {validationError && (
                        <div className="flex items-start gap-2 text-red-600 bg-red-50 dark:bg-red-950/20 p-3 rounded-md">
                            <XCircleIcon className="h-5 w-5 shrink-0 mt-0.5" />
                            <div className="text-sm">
                                <p className="font-medium">Validation Failed</p>
                                <p>Unable to check deletion requirements. Please try again.</p>
                            </div>
                        </div>
                    )}

                    {/* Point preview */}
                    {validation && renderPointPreview()}

                    {/* Validation errors */}
                    {validation && renderValidationErrors()}

                    {/* Validation warnings */}
                    {validation && renderValidationWarnings()}

                    {/* Confirmation input for valid deletions */}
                    {validation?.canDelete && (
                        <>
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
                            {renderConfirmationInput()}
                        </>
                    )}
                </div>

                <DialogFooter>
                    <Button
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        disabled={isPending}
                    >
                        Cancel
                    </Button>
                    {validation?.canDelete && (
                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={!canSubmit}
                        >
                            {isPending ? (
                                <>
                                    <span className="size-4 border-2 border-background border-t-transparent rounded-full animate-spin mr-2" />
                                    Deleting...
                                </>
                            ) : (
                                "Delete Point"
                            )}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
} 