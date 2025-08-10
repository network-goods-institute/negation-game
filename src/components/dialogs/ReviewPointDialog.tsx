"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { GOOD_ENOUGH_POINT_RATING } from "@/constants/config";
import { PointStats } from "@/components/cards/pointcard/PointStats";
import { type PointReviewResults } from "@/actions/ai/reviewProposedPointAction";
import ReviewSubmissionLayout from "@/components/review/ReviewSubmissionLayout";

interface ReviewPointDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reviewResults: PointReviewResults | null;
  isLoading: boolean;
  onSelectSuggestion: (suggestion: string) => void;
  onSubmitOriginal: () => void;
  onSelectExisting: (pointId: number) => void;
  pointContent: string;
  isOption: boolean;
}

export function ReviewPointDialog({
  open,
  onOpenChange,
  reviewResults,
  isLoading,
  onSelectSuggestion,
  onSubmitOriginal,
  onSelectExisting,
  pointContent,
  isOption,
}: ReviewPointDialogProps) {
  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogTitle>Reviewing {isOption ? "Option" : "Point"}...</DialogTitle>
          <DialogDescription className="hidden">
            AI is reviewing your {isOption ? "option" : "point"}
          </DialogDescription>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!reviewResults) return null;

  const isGoodEnough = reviewResults.rating >= GOOD_ENOUGH_POINT_RATING;
  const hasExisting = reviewResults.existingSimilarPoints.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0">
        <DialogTitle className="px-6 pt-4 pb-2 border-b">
          {isOption ? "Choose an Option Approach" : "Choose a Point Approach"}
        </DialogTitle>
        <DialogDescription className="hidden">Review and improve your submission</DialogDescription>
        <div className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm font-medium">Your {isOption ? "Option" : "Point"}:</span>
            <Badge variant={isGoodEnough ? "default" : "destructive"}>{reviewResults.rating}/10</Badge>
          </div>
          <ReviewSubmissionLayout
            title={isOption ? "Choose an Option Approach" : "Choose a Point Approach"}
            existingHeader={`Reuse an Existing ${isOption ? "Option" : "Point"}`}
            existingItems={reviewResults.existingSimilarPoints.map((p, idx) => ({
              key: `${p.pointId}-${idx}`,
              item: p,
              onClick: () => onSelectExisting(p.pointId),
            }))}
            renderExistingItem={(p: any) => (
              <div className="flex flex-col gap-2">
                <p className="text-sm">{p.content}</p>
                <PointStats
                  favor={p.favor}
                  amountNegations={p.amountNegations}
                  amountSupporters={p.amountSupporters}
                  cred={p.cred}
                />
              </div>
            )}
            suggestions={(reviewResults.suggestions || []).map((s) => ({ text: s }))}
            onSelectSuggestion={(text) => {
              onSelectSuggestion(text);
              onOpenChange(false);
            }}
            onRetry={() => {
              // re-run review with current content
              onSelectSuggestion(pointContent); // no-op hook consumer; kept for symmetry
            }}
            retryLabel="Review again"
            originalText={pointContent}
            isGoodEnough={isGoodEnough}
            feedback={reviewResults.feedback}
            originalPositiveLabel={isOption ? "Your Option" : "Your Point"}
            onSelectOriginal={onSubmitOriginal}
          />

          <div className="mt-4 flex justify-end">
            <DialogClose asChild>
              <Button variant="ghost">Cancel</Button>
            </DialogClose>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}