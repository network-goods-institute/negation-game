import { reviewProposedCounterpointAction } from "@/actions/reviewProposedCounterpointAction";
import { negatedPointIdAtom } from "@/atoms/negatedPointIdAtom";
import { negationContentAtom } from "@/atoms/negationContentAtom";
import { CredInput } from "@/components/CredInput";
import { PointEditor } from "@/components/PointEditor";
import { PointStats } from "@/components/PointStats";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  GOOD_ENOUGH_POINT_RATING,
  POINT_MAX_LENGTH,
  POINT_MIN_LENGTH,
} from "@/constants/config";
import { useCredInput } from "@/hooks/useCredInput";
import { useSubmitHotkey } from "@/hooks/useSubmitHotkey";
import { cn } from "@/lib/cn";
import { useAddCounterpoint } from "@/mutations/useAddCounterpoint";
import { useEndorse } from "@/mutations/useEndorse";
import { useNegate } from "@/mutations/useNegate";
import { usePointData } from "@/queries/usePointData";
import { DialogProps } from "@radix-ui/react-dialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { produce } from "immer";
import { useAtom } from "jotai";
import {
  ArrowLeftIcon,
  CircleXIcon,
  DiscIcon,
  TrashIcon,
} from "lucide-react";
import { FC, ReactNode, useCallback, useEffect, useState, useMemo } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import CounterpointReview, { CounterpointCandidate } from "@/components/CounterpointReview";

export interface NegateDialogProps
  extends Omit<DialogProps, "open" | "onOpenChange"> { }

export const NegateDialog: FC<NegateDialogProps> = ({ ...props }) => {
  const [negatedPointId, setNegatedPointId] = useAtom(negatedPointIdAtom);
  const { data: negatedPoint } = usePointData(negatedPointId);
  const [counterpointContent, setCounterpointContent] = useAtom(
    negationContentAtom(negatedPoint?.pointId)
  );
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);

  // Track review state for each unique negated point with a simpler approach
  const [viewedReviews, setViewedReviews] = useState<Set<number>>(new Set());

  const {
    credInput: cred,
    setCredInput: setCred,
    notEnoughCred,
    resetCredInput: resetCred,
  } = useCredInput({
    resetWhen: !negatedPointId,
  });
  const { mutateAsync: addCounterpoint, isPending: isAddingCounterpoint } =
    useAddCounterpoint();
  const { mutateAsync: negate, isPending: isNegating } = useNegate();
  const { mutateAsync: endorse, isPending: isEndorsing } = useEndorse();

  const [guidanceNotes, setGuidanceNotes] = useState<ReactNode | undefined>(
    undefined
  );

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [selectedCounterpointCandidate, selectCounterpointCandidate] = useState<
    CounterpointCandidate | undefined
  >(undefined);
  const charactersLeft = POINT_MAX_LENGTH - counterpointContent.length;

  const queryClient = useQueryClient();

  // Reset the query function for better performance
  const {
    data: reviewResults,
    isLoading: isReviewingCounterpoint,
    isSuccess: counterpointWasReviewed,
    isStale: reviewIsStale,
    refetch: reviewCounterpoint,
    status,
  } = useQuery({
    enabled: false,
    staleTime: 60_000,
    queryKey: [
      "counterpoint-review",
      negatedPoint?.pointId,
      counterpointContent,
      negatedPoint?.content
    ] as const,
    queryFn: async ({ queryKey: [, pointId, content] }) => {
      if (!pointId) throw new Error("No point ID");

      const reviewResults = await reviewProposedCounterpointAction({
        negatedPointId: pointId,
        negatedPointContent: negatedPoint!.content,
        counterpointContent: content,
      });

      setGuidanceNotes(undefined);

      // More efficient way to mark as viewed
      setViewedReviews(prev => {
        const newSet = new Set(prev);
        newSet.add(pointId);
        return newSet;
      });

      // Cache for rephrasings
      reviewResults.suggestions.forEach((selectedSuggestion) =>
        queryClient.setQueryData<typeof reviewResults>(
          ["counterpoint-review", pointId, selectedSuggestion] as const,
          produce(reviewResults, (draft) => {
            draft.rating = 10;
            draft.suggestions = draft.suggestions.filter(
              (suggestion) => suggestion !== selectedSuggestion
            );
          })
        )
      );

      if (
        reviewResults.existingSimilarCounterpoints.length > 0 ||
        reviewResults.rating < GOOD_ENOUGH_POINT_RATING
      )
        setReviewDialogOpen(true);

      return reviewResults;
    },
  });

  // Simpler and more efficient calculation
  const hasViewedCurrentPointReview = useMemo(() =>
    negatedPoint ? viewedReviews.has(negatedPoint.pointId) : false,
    [viewedReviews, negatedPoint]);

  const canReview =
    charactersLeft >= 0 && counterpointContent.length >= POINT_MIN_LENGTH;

  const canSubmit = selectedCounterpointCandidate?.isCounterpoint
    ? cred > 0
    : charactersLeft >= 0 && counterpointContent.length >= POINT_MIN_LENGTH;

  // Only reset necessary state
  const resetForm = useCallback(() => {
    selectCounterpointCandidate(undefined);
    setGuidanceNotes(undefined);
    resetCred();
    setCounterpointContent("");
    // Don't reset viewed state for points - we want to remember which ones were viewed
  }, [resetCred, setCounterpointContent]);

  useEffect(() => {
    if (!negatedPointId) resetForm();
  }, [negatedPointId, resetForm]);

  // Debug effect to track negatedPointId changes
  useEffect(() => {
    console.log("negatedPointId changed:", negatedPointId);
  }, [negatedPointId]);

  const handleSubmit = useCallback(() => {
    if (!canSubmit || isSubmitting) return;

    setIsSubmitting(true);
    (selectedCounterpointCandidate === undefined
      ? addCounterpoint({
        content: counterpointContent,
        cred,
        negatedPointId: negatedPoint!.pointId,
      })
      : selectedCounterpointCandidate.isCounterpoint
        ? endorse({
          pointId: selectedCounterpointCandidate.id,
          cred,
        })
        : negate({
          negatedPointId: negatedPoint!.pointId,
          counterpointId: selectedCounterpointCandidate.id,
          cred,
        })
    )
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ["feed"] });
        resetForm();
        setNegatedPointId(undefined);
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  }, [
    canSubmit,
    isSubmitting,
    selectedCounterpointCandidate,
    counterpointContent,
    cred,
    negatedPoint,
    queryClient,
    resetForm,
    setNegatedPointId,
    addCounterpoint,
    endorse,
    negate,
  ]);

  const handleSubmitOrReview = useCallback(() => {
    if (!negatedPointId) return;

    // If review hasn't been done yet and we can review, trigger review
    if (!counterpointWasReviewed && canReview && !isReviewingCounterpoint) {
      reviewCounterpoint();
      return;
    }

    // Only submit if we have explicitly selected a counterpoint candidate
    // or if we've reviewed and closed the suggestions popover
    if (
      (counterpointWasReviewed && !reviewIsStale && canSubmit && !isSubmitting && !reviewDialogOpen) ||
      (hasViewedCurrentPointReview && canSubmit && !isSubmitting)
    ) {
      handleSubmit();
    }
  }, [
    negatedPointId,
    counterpointWasReviewed,
    canReview,
    isReviewingCounterpoint,
    reviewIsStale,
    canSubmit,
    isSubmitting,
    reviewDialogOpen,
    hasViewedCurrentPointReview,
    reviewCounterpoint,
    handleSubmit,
  ]);

  useSubmitHotkey(handleSubmitOrReview, !!negatedPointId);

  const [platformKey, setPlatformKey] = useState('Alt');

  useEffect(() => {
    setPlatformKey(navigator?.platform?.includes('Mac') ? '⌥' : 'Alt');
  }, []);

  return (
    <>
      <Dialog
        {...props}
        open={negatedPointId !== undefined}
        onOpenChange={(open) => {
          console.log("NegateDialog onOpenChange called with:", open);
          if (open === false) {
            console.log("NegateDialog closing, setting negatedPointId to undefined");
            setNegatedPointId(undefined);
          }
        }}
      >
        <DialogContent className="@container sm:top-xl flex flex-col overflow-hidden sm:translate-y-0 h-full rounded-none sm:rounded-md sm:h-fit gap-0 bg-background p-4 sm:p-8 shadow-sm w-full max-w-xl max-h-[90vh]">
          <div className="w-full flex items-center justify-between mb-xl">
            <DialogTitle>Negate</DialogTitle>
            <DialogDescription hidden>
              Add a negation to the Point
            </DialogDescription>
            <DialogClose className="text-primary">
              <ArrowLeftIcon />
            </DialogClose>
          </div>

          <div className="flex w-full gap-md">
            <div className="flex flex-col items-center">
              <DiscIcon className="shrink-0 size-6 stroke-1 text-muted-foreground " />
              <div
                className={cn(
                  "w-px -my-px flex-grow border-l border-muted-foreground",
                  (!selectedCounterpointCandidate ||
                    !selectedCounterpointCandidate.isCounterpoint) &&
                  "border-dashed border-endorsed"
                )}
              />
            </div>
            <div className="@container/point flex-grow flex flex-col mb-md pt-1">
              <p className="tracking-tight text-md @sm/point:text-lg mb-lg -mt-2">
                {negatedPoint?.content}
              </p>
            </div>
          </div>

          <div className="flex w-full gap-md mb-lg">
            <div className="flex flex-col items-center">
              <CircleXIcon
                className={cn(
                  "shrink-0 size-6 stroke-1 text-muted-foreground",
                  !selectedCounterpointCandidate &&
                  "circle-dashed-2 text-endorsed"
                )}
              />
              {cred > 0 && (
                <span className="relative text-endorsed text-xs">
                  <span className="absolute -left-2">+</span>
                  {cred}
                </span>
              )}
            </div>

            {selectedCounterpointCandidate ? (
              <div className="flex flex-col items-start w-full">
                <div className="relative flex flex-col p-4 gap-2 w-full border rounded-md mb-2">
                  <Button
                    className="absolute -right-2 -bottom-4 text-muted-foreground border rounded-full p-2 size-fit"
                    variant={"outline"}
                    size={"icon"}
                    onClick={() => selectCounterpointCandidate(undefined)}
                  >
                    <TrashIcon className="size-5" />
                  </Button>
                  <span className="flex-grow text-sm">
                    {selectedCounterpointCandidate.content}
                  </span>
                  <PointStats
                    favor={selectedCounterpointCandidate.favor}
                    amountNegations={
                      selectedCounterpointCandidate.amountNegations
                    }
                    amountSupporters={
                      selectedCounterpointCandidate.amountSupporters
                    }
                    cred={selectedCounterpointCandidate.cred}
                  />
                </div>

                <CredInput
                  credInput={cred}
                  setCredInput={setCred}
                  notEnoughCred={notEnoughCred}
                />
              </div>
            ) : (
              <PointEditor
                className="w-full -mt-1"
                content={counterpointContent}
                setContent={setCounterpointContent}
                cred={cred}
                setCred={setCred}
                placeholder="Make your counterpoint"
                guidanceNotes={guidanceNotes}
                textareaClassName="-ml-2 -mt-2"
              />
            )}
          </div>

          {counterpointWasReviewed && !reviewIsStale ? (
            <div className="items-end mt-md flex flex-col w-full xs:flex-row justify-end gap-2">
              <Button
                className="min-w-28 w-full xs:w-fit"
                rightLoading={
                  isReviewingCounterpoint ||
                  isNegating ||
                  isEndorsing ||
                  isAddingCounterpoint
                }
                disabled={!canSubmit || isSubmitting}
                onClick={handleSubmit}
              >
                {selectedCounterpointCandidate?.isCounterpoint
                  ? isSubmitting
                    ? "Endorsing"
                    : "Endorse"
                  : isSubmitting
                    ? "Negating"
                    : "Negate"}
              </Button>

              {reviewResults && (
                <Button
                  variant={hasViewedCurrentPointReview ? "outline" : "default"}
                  className="min-w-28 w-full xs:w-fit"
                  onClick={() => {
                    setReviewDialogOpen(true);
                  }}
                >
                  Review suggestions{" "}
                  <Badge className={cn(
                    "ml-2 px-1.5",
                    hasViewedCurrentPointReview
                      ? "bg-muted text-muted-foreground border border-muted"
                      : "bg-white text-primary"
                  )}>
                    {reviewResults.existingSimilarCounterpoints.length +
                      reviewResults.suggestions.length}
                  </Badge>
                </Button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 mt-md self-end">
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Button
                    disabled={!canReview || (isReviewingCounterpoint && !hasViewedCurrentPointReview) || isSubmitting}
                    className="min-w-28 w-full xs:w-fit"
                    rightLoading={isReviewingCounterpoint || isSubmitting}
                    onClick={(e) => {
                      if (e.altKey || hasViewedCurrentPointReview) {
                        handleSubmit();
                        return;
                      }
                      reviewCounterpoint();
                    }}
                  >
                    {isSubmitting ? "Negating..." : isReviewingCounterpoint ? "Reviewing..." : hasViewedCurrentPointReview ? "Negate" : "Review & Negate"}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  Hold {platformKey} and click to skip review
                </TooltipContent>
              </Tooltip>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {reviewResults && (
        <Dialog
          open={reviewDialogOpen}
          onOpenChange={(open) => {
            setReviewDialogOpen(open);
          }}
          modal={true}
        >
          <DialogContent
            className="max-w-[700px] w-[95vw] p-0 rounded-xl shadow-xl border-2 overflow-hidden"
          >
            <DialogTitle className="sr-only">Choose a Counterpoint Approach</DialogTitle>
            <CounterpointReview
              reviewResults={reviewResults}
              counterpointContent={counterpointContent}
              setCounterpointContent={setCounterpointContent}
              selectCounterpointCandidate={selectCounterpointCandidate}
              setGuidanceNotes={setGuidanceNotes}
              onClose={() => setReviewDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};
