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
import { 
  CheckCircleIcon, 
  XCircleIcon, 
  LightbulbIcon,
  ArrowRightIcon 
} from "lucide-react";
import { type PointReviewResults } from "@/actions/ai/reviewProposedPointAction";

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
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogTitle>
          {isOption ? "Option" : "Point"} Review
        </DialogTitle>
        <DialogDescription className="hidden">
          Review and improve your {isOption ? "option" : "point"}
        </DialogDescription>

        <div className="space-y-6">
          {/* Current Point */}
          <div className="p-4 border rounded-lg bg-muted/30">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium">Your {isOption ? "Option" : "Point"}:</span>
              <Badge variant={isGoodEnough ? "default" : "destructive"}>
                {reviewResults.rating}/10
              </Badge>
            </div>
            <p className="text-sm">{pointContent}</p>
            {reviewResults.feedback && (
              <p className="text-xs text-muted-foreground mt-2">{reviewResults.feedback}</p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button 
              onClick={onSubmitOriginal}
              variant={isGoodEnough ? "default" : "outline"}
              className="flex items-center gap-2"
            >
              {isGoodEnough ? <CheckCircleIcon className="h-4 w-4" /> : <XCircleIcon className="h-4 w-4" />}
              Submit Original
            </Button>
            
            <DialogClose asChild>
              <Button variant="ghost">
                Cancel
              </Button>
            </DialogClose>
          </div>

          {/* Suggestions */}
          {reviewResults.suggestions.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <LightbulbIcon className="h-4 w-4 text-yellow-500" />
                <span className="font-medium text-sm">AI Suggestions</span>
              </div>
              {reviewResults.suggestions.map((suggestion, index) => (
                <div key={index} className="p-3 border rounded-lg bg-background hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm flex-1">{suggestion}</p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onSelectSuggestion(suggestion)}
                      className="flex items-center gap-1 shrink-0"
                    >
                      <ArrowRightIcon className="h-3 w-3" />
                      Use This
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Existing Similar Points */}
          {hasExisting && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">
                  Similar Existing {isOption ? "Options" : "Points"} ({reviewResults.existingSimilarPoints.length})
                </span>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {reviewResults.existingSimilarPoints.map((point, index) => (
                  <div
                    key={`${point.pointId}-${index}`}
                    className="p-3 border rounded-lg bg-background hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => onSelectExisting(point.pointId)}
                  >
                    <div className="flex flex-col gap-2">
                      <p className="text-sm">{point.content}</p>
                      <PointStats
                        favor={point.favor}
                        amountNegations={point.amountNegations}
                        amountSupporters={point.amountSupporters}
                        cred={point.cred}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}