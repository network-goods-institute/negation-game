"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon, SaveIcon } from "lucide-react";
import { useState } from "react";
import { editPoint } from "@/actions/points/editPoint";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useSetAtom } from "jotai";
import { usePrivy } from "@privy-io/react-auth";
import { useInvalidateRelatedPoints } from "@/queries/points/usePointData";
import { AutosizeTextarea } from "@/components/ui/autosize-textarea";
import { POINT_MAX_LENGTH, POINT_MIN_LENGTH } from "@/constants/config";
import { addAffectedEdgeAtom } from "@/atoms/affectedRelationshipsAtom";

interface PointEditDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    pointId: number;
    currentContent: string;
    canEdit: boolean;
}

export const PointEditDialog = ({
    open,
    onOpenChange,
    pointId,
    currentContent,
    canEdit,
}: PointEditDialogProps) => {
    const handleOpenChange = (newOpen: boolean, event?: Event) => {
        if (event) {
            event.stopPropagation();
        }
        onOpenChange(newOpen);
    };
    const [content, setContent] = useState(currentContent);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const queryClient = useQueryClient();
    const addAffectedEdge = useSetAtom(addAffectedEdgeAtom);
    const { user } = usePrivy();
    const invalidateRelatedPoints = useInvalidateRelatedPoints();

    const isContentChanged = content.trim() !== currentContent.trim();
    const isContentValid = content.trim().length >= POINT_MIN_LENGTH && 
                          content.trim().length <= POINT_MAX_LENGTH;
    const canSubmit = isContentChanged && isContentValid && !isSubmitting && canEdit;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!canSubmit) return;

        setIsSubmitting(true);

        try {
            const result = await editPoint({
                pointId,
                content: content.trim(),
            });

            // Process affected relationships for visual highlighting
            if (result.affectedRelationships.length > 0) {
                result.affectedRelationships.forEach((relationship) => {
                    if (relationship.relatedPointId && 
                        (relationship.type === 'negation' || relationship.type === 'restake' || relationship.type === 'doubt')) {
                        
                        // Generate edge ID for the relationship
                        const edgeId = relationship.type === 'negation' 
                            ? `negation-${Math.min(pointId, relationship.relatedPointId)}-${Math.max(pointId, relationship.relatedPointId)}`
                            : `${relationship.type}-${pointId}-${relationship.relatedPointId}`;
                        
                        addAffectedEdge({
                            edgeId,
                            pointId,
                            relatedPointId: relationship.relatedPointId,
                            type: relationship.type,
                            affectedAt: Date.now(),
                        });
                    }
                });

                toast.success(`Point updated! ${result.affectedRelationships.length} relationships may be affected.`);
            } else {
                toast.success("Point updated successfully!");
            }
            
            // Comprehensive cache invalidation to update all views
            
            // Invalidate point and all related points (handles negations, favor history, etc.)
            invalidateRelatedPoints(pointId);
            
            // Additional specific point queries
            queryClient.invalidateQueries({ queryKey: ['pointById', pointId] });
            queryClient.invalidateQueries({ queryKey: ['points'] });
            queryClient.invalidateQueries({ queryKey: ['point-data'] });
            queryClient.invalidateQueries({ queryKey: ['point', pointId, 'endorsementBreakdown'] });
            
            // Feed queries (all variants)
            queryClient.invalidateQueries({ queryKey: ['feed'] });
            if (user?.id) {
                queryClient.invalidateQueries({ queryKey: ['feed', user.id] });
            }
            
            // Profile and priority points
            queryClient.invalidateQueries({ queryKey: ['profile-points'] });
            queryClient.invalidateQueries({ queryKey: ['priority-points'] });
            
            // Graph and rationale views
            queryClient.invalidateQueries({ queryKey: ['viewpoints'] });
            queryClient.invalidateQueries({ queryKey: ['rationales'] });
            
            onOpenChange(false);
            setContent(currentContent); // Reset to original if dialog reopens
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Failed to update point";
            toast.error(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancel = (e?: React.MouseEvent) => {
        if (e) {
            e.stopPropagation();
        }
        setContent(currentContent); // Reset to original content
        onOpenChange(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Escape") {
            handleCancel();
        } else if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && canSubmit) {
            e.preventDefault();
            handleSubmit(e as any);
        }
    };

    if (!canEdit) {
        return null;
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent 
                className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col"
                onKeyDown={handleKeyDown}
                onInteractOutside={(e) => {
                    e.stopPropagation();
                }}
            >
                <DialogHeader className="flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <DialogClose asChild>
                            <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <ArrowLeftIcon className="h-4 w-4" />
                            </Button>
                        </DialogClose>
                        <DialogTitle>Edit Point</DialogTitle>
                    </div>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
                    <div className="flex-1 min-h-0 mb-4">
                        <AutosizeTextarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            maxLength={POINT_MAX_LENGTH}
                            placeholder="Edit your point..."
                            className="h-full min-h-[200px] resize-none"
                            minHeight={200}
                        />
                    </div>

                    <div className="flex-shrink-0 space-y-2">
                        <div className="flex justify-between text-sm text-muted-foreground">
                            <span>
                                {content.trim().length} / {POINT_MAX_LENGTH} characters
                            </span>
                            {!isContentValid && content.trim().length > 0 && (
                                <span className="text-destructive">
                                    {content.trim().length < POINT_MIN_LENGTH 
                                        ? `Minimum ${POINT_MIN_LENGTH} characters required`
                                        : "Content too long"
                                    }
                                </span>
                            )}
                        </div>

                        <div className="flex gap-2 justify-end">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={(e) => handleCancel(e)}
                                disabled={isSubmitting}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={!canSubmit}
                                className="min-w-[100px]"
                            >
                                {isSubmitting ? (
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 border-2 border-background border-t-transparent rounded-full animate-spin" />
                                        Saving...
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <SaveIcon className="h-4 w-4" />
                                        Save Changes
                                    </div>
                                )}
                            </Button>
                        </div>

                        <div className="text-xs text-muted-foreground">
                            <p>Tip: Press Ctrl/Cmd + Enter to save quickly</p>
                        </div>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
};