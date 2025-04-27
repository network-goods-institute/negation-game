import { reviewProposedCounterpointAction } from "@/actions/reviewProposedCounterpointAction";
import { negatedPointIdAtom } from "@/atoms/negatedPointIdAtom";
import { negationContentAtom } from "@/atoms/negationContentAtom";
import { recentlyCreatedNegationIdAtom } from "@/atoms/recentlyCreatedNegationIdAtom";
import { makeNegationSuggestionAtom } from "@/atoms/makeNegationSuggestionAtom";
import { CredInput } from "@/components/CredInput";
import { PointEditor } from "@/components/PointEditor";
import { PointStats } from "@/components/PointStats";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  POINT_MAX_LENGTH,
  POINT_MIN_LENGTH,
  GOOD_ENOUGH_POINT_RATING,
} from "@/constants/config";
import { useCredInput } from "@/hooks/useCredInput";
import { useSubmitHotkey } from "@/hooks/useSubmitHotkey";
import { cn } from "@/lib/cn";
import { useAddCounterpoint } from "@/mutations/useAddCounterpoint";
import { useEndorse } from "@/mutations/useEndorse";
import { useNegate } from "@/mutations/useNegate";
import { usePointDataById } from "@/queries/usePointDataById";
import { DialogProps } from "@radix-ui/react-dialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { produce } from "immer";
import { useAtom } from "jotai";
import {
  ArrowLeftIcon,
  CircleXIcon,
  DiscIcon,
  TrashIcon,
  SquarePenIcon,
  AlertTriangleIcon,
} from "lucide-react";
import { FC, ReactNode, useCallback, useEffect, useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import CounterpointReview, { CounterpointCandidate } from "@/components/CounterpointReview";
import { toast } from "sonner";
import { encodeId } from '@/lib/negation-game/encodeId';
import { CreatedNegationView } from './chatbot/CreatedNegationView';

export interface NegateDialogProps
  extends Omit<DialogProps, "open" | "onOpenChange"> { }

export const NegateDialog: FC<NegateDialogProps> = ({ ...props }) => {
  const [negationSuggestion, setNegationSuggestion] = useAtom(makeNegationSuggestionAtom);

  const initialNegatedPointId = negationSuggestion?.targetId;
  const [negatedPointId, setNegatedPointId] = useAtom(negatedPointIdAtom);

  const currentNegatedPointId = initialNegatedPointId ?? negatedPointId;

  const { data: negatedPoint, isLoading: isLoadingNegatedPoint } = usePointDataById(currentNegatedPointId);

  const [counterpointContent, setCounterpointContent] = useAtom(
    negationContentAtom(currentNegatedPointId)
  );

  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [lastReviewedContent, setLastReviewedContent] = useState<string>("");
  const [hasContentBeenReviewed, setHasContentBeenReviewed] = useState(false);
  const [postReviewAction, setPostReviewAction] = useState<'reopen' | 'regenerate' | null>(null);

  const {
    credInput: cred,
    setCredInput: setCred,
    notEnoughCred,
    resetCredInput: resetCred,
  } = useCredInput({
    resetWhen: !currentNegatedPointId,
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

  const [recentlyCreatedNegation, setRecentlyCreatedNegation] = useAtom(recentlyCreatedNegationIdAtom);

  const [createdCounterpointId, setCreatedCounterpointId] = useState<number | null>(null);

  const {
    data: reviewResults,
    isLoading: isReviewingCounterpoint,
    isSuccess: counterpointWasReviewed,
    refetch: reviewCounterpoint,
  } = useQuery({
    enabled: false,
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
      setLastReviewedContent(content);
      setHasContentBeenReviewed(true);

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

      setReviewDialogOpen(true);

      return reviewResults;
    },
  });

  const needsReview = counterpointContent !== lastReviewedContent;

  const canReview =
    charactersLeft >= 0 && counterpointContent.length >= POINT_MIN_LENGTH;

  const canSubmit = selectedCounterpointCandidate?.isCounterpoint
    ? true
    : charactersLeft >= 0 && counterpointContent.length >= POINT_MIN_LENGTH;
  const resetFormOnly = useCallback(() => {
    selectCounterpointCandidate(undefined);
    setGuidanceNotes(undefined);
    resetCred();
    setCounterpointContent("");
    setLastReviewedContent("");
    setCreatedCounterpointId(null);
    setHasContentBeenReviewed(false);
    setPostReviewAction(null);
  }, [resetCred, setCounterpointContent]);

  const handleClose = useCallback(() => {
    resetFormOnly();
    setNegationSuggestion(null);
    setNegatedPointId(undefined);
    setCreatedCounterpointId(null);
    setHasContentBeenReviewed(false);
    setPostReviewAction(null);
  }, [resetFormOnly, setNegationSuggestion, setNegatedPointId]);

  const handleExitPreview = useCallback(() => {
    handleClose();
  }, [handleClose]);

  useEffect(() => {
    if (negationSuggestion) {
      setCounterpointContent(negationSuggestion.text);
      selectCounterpointCandidate(undefined);
      setGuidanceNotes(undefined);
      setLastReviewedContent("");
    }
  }, [negationSuggestion, setCounterpointContent]);

  useEffect(() => {
    if (!currentNegatedPointId) {
      handleClose();
    }
  }, [currentNegatedPointId, handleClose]);

  useEffect(() => {
    if (needsReview) {
      setHasContentBeenReviewed(false);
    }
  }, [needsReview]);

  const handleSuggestionSelected = useCallback((suggestion: string) => {
    setGuidanceNotes(
      <>
        <SquarePenIcon className="size-3 align-[-1.5px] inline-block" />{" "}
        {counterpointContent}{" "} {/* Show the original content */}
        <Button
          variant={"link"}
          className="text-xs size-fit inline-block p-0 font-normal underline underline-offset-1 ml-1"
          onClick={(e) => {
            e.stopPropagation();
            setCounterpointContent(counterpointContent);
            setLastReviewedContent("");
            setHasContentBeenReviewed(false);
            setGuidanceNotes(undefined);
          }}
        >
          restore
        </Button>
      </>
    );
    setCounterpointContent(suggestion);
    setLastReviewedContent(suggestion);
    setHasContentBeenReviewed(true);
    setReviewDialogOpen(false);
    setPostReviewAction('regenerate');
  }, [counterpointContent, setCounterpointContent, setLastReviewedContent, setHasContentBeenReviewed, setGuidanceNotes]);

  const handleSelectOwnText = useCallback(() => {
    setGuidanceNotes(
      reviewResults && reviewResults.rating < GOOD_ENOUGH_POINT_RATING ? (
        <>
          <AlertTriangleIcon className="size-3 align-[-1.5px] inline-block" />{" "}
          {reviewResults.feedback}
          <Button
            variant={"link"}
            className="text-xs size-fit inline-block p-0 font-normal underline underline-offset-1 ml-1"
            onClick={(e) => {
              e.stopPropagation();
              setGuidanceNotes(undefined);
            }}
          >
            dismiss
          </Button>
        </>
      ) : undefined
    );
    selectCounterpointCandidate(undefined);
    setHasContentBeenReviewed(true); // Mark as reviewed
    setPostReviewAction('reopen'); // <-- Set action type for keeping own text
    setReviewDialogOpen(false); // Close review dialog
  }, [reviewResults, setGuidanceNotes]);

  const handleSubmit = useCallback(() => {
    if (!canSubmit || isSubmitting || !negatedPoint) return;

    setIsSubmitting(true);
    let mutationPromise: Promise<number | void>;
    let isCreatingNew = selectedCounterpointCandidate === undefined;
    let finalCounterpointId: number | undefined;

    if (isCreatingNew) {
      mutationPromise = addCounterpoint({
        content: counterpointContent,
        cred,
        negatedPointId: negatedPoint.pointId,
      }).then(newPointId => {
        finalCounterpointId = newPointId;
        return newPointId;
      });
    } else {
      const candidate = selectedCounterpointCandidate;
      if (!candidate) {
        toast.error("Cannot proceed: No counterpoint candidate selected.");
        setIsSubmitting(false);
        return;
      }

      finalCounterpointId = candidate.id;

      if (candidate.isCounterpoint) {
        mutationPromise = endorse({
          pointId: candidate.id,
          cred,
        }).then(() => finalCounterpointId);
      } else {
        mutationPromise = negate({
          negatedPointId: negatedPoint.pointId,
          counterpointId: candidate.id,
          cred,
        }).then(() => finalCounterpointId);
      }
    }

    mutationPromise
      .then(() => {
        if (finalCounterpointId === undefined) {
          throw new Error("Could not determine relevant counterpoint ID after operation.");
        }

        if (isCreatingNew) {
          toast.success("Negation created successfully.");
        } else if (selectedCounterpointCandidate?.isCounterpoint) {
          toast.success("Point endorsed successfully");
        } else {
          toast.success("Existing negation endorsed successfully.");
        }

        setRecentlyCreatedNegation({
          negationId: finalCounterpointId,
          parentPointId: negatedPoint.pointId,
          timestamp: Date.now()
        });

        if (negatedPoint?.pointId) {
          queryClient.invalidateQueries({ queryKey: [negatedPoint.pointId, "negations"], exact: true });
          queryClient.invalidateQueries({ queryKey: ["point", negatedPoint.pointId], type: "all" });
        }
        queryClient.invalidateQueries({ queryKey: ["feed"] });

        const event = new CustomEvent('negation:created', { detail: { pointId: negatedPoint?.pointId } });
        window.dispatchEvent(event);

        if (negationSuggestion?.context === 'chat') {
          setCreatedCounterpointId(finalCounterpointId);
        } else {
          handleClose();
        }
      })
      .catch(error => {
        toast.error("Operation failed: " + (error.message || "Unknown error"));
        handleClose();
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
    handleClose,
    addCounterpoint,
    endorse,
    negate,
    setRecentlyCreatedNegation,
    negationSuggestion?.context
  ]);

  const handleSubmitOrReview = useCallback(() => {
    if (!currentNegatedPointId) return;

    // If content hasn't been reviewed yet and we can review, trigger review
    if (needsReview && canReview && !isReviewingCounterpoint) {
      reviewCounterpoint();
      return;
    }

    // Only submit if content has been reviewed and dialog is closed
    if (!needsReview && canSubmit && !isSubmitting && !reviewDialogOpen) {
      handleSubmit();
    }
  }, [
    currentNegatedPointId,
    needsReview,
    canReview,
    isReviewingCounterpoint,
    canSubmit,
    isSubmitting,
    reviewDialogOpen,
    reviewCounterpoint,
    handleSubmit,
  ]);

  useSubmitHotkey(handleSubmitOrReview, !!currentNegatedPointId);

  const [platformKey, setPlatformKey] = useState('Alt');

  useEffect(() => {
    setPlatformKey(navigator?.platform?.includes('Mac') ? '⌥' : 'Alt');
  }, []);

  const isOpen = negationSuggestion !== null || negatedPointId !== undefined;


  return (
    <Dialog
      {...props}
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) handleClose(); // Full close handler
      }}
    >
      <DialogContent className="@container sm:top-xl flex flex-col overflow-hidden sm:translate-y-0 h-full rounded-none sm:rounded-md sm:h-fit gap-0 bg-background p-4 sm:p-8 shadow-sm w-full max-w-xl max-h-[90vh]">
        {createdCounterpointId !== null ? (
          <CreatedNegationView
            originalPointId={currentNegatedPointId!}
            counterpointId={createdCounterpointId}
            onExitPreview={handleExitPreview}
          />
        ) : (
          <>
            <div className="w-full flex items-center justify-between mb-xl">
              <DialogTitle>
                {selectedCounterpointCandidate === undefined
                  ? `Negating Point ${currentNegatedPointId ? encodeId(currentNegatedPointId) : "..."}`
                  : `Endorsing ${selectedCounterpointCandidate.isCounterpoint ? "Counterpoint" : "Negation"} ${encodeId(selectedCounterpointCandidate.id)}`}
              </DialogTitle>
              <DialogDescription hidden>
                {selectedCounterpointCandidate?.isCounterpoint
                  ? "Add your cred behind this existing negation"
                  : "Add a new negation to the Point"}
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
                    "border-dashed border-primary/70"
                  )}
                />
              </div>
              <div className="@container/point flex-grow flex flex-col mb-md pt-1">
                {isLoadingNegatedPoint ? (
                  <div className="animate-pulse">
                    <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-muted rounded w-1/2"></div>
                  </div>
                ) : (
                  <p className="tracking-tight text-md @sm/point:text-lg mb-lg -mt-2">
                    {negatedPoint?.content}
                  </p>
                )}
              </div>
            </div>

            <div className="flex w-full gap-md mb-lg">
              <div className="flex flex-col items-center">
                <CircleXIcon
                  className={cn(
                    "shrink-0 size-6 stroke-1 text-muted-foreground",
                    !selectedCounterpointCandidate &&
                    "circle-dashed-2 text-primary"
                  )}
                />
                {cred > 0 && (
                  <span className="relative text-primary text-xs">
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
                    allowZero={!selectedCounterpointCandidate?.isCounterpoint}
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

            {selectedCounterpointCandidate ? (
              <div className="items-end mt-md flex flex-col w-full xs:flex-row justify-end gap-2">
                <Button
                  className="min-w-28 w-full xs:w-fit"
                  rightLoading={isSubmitting}
                  disabled={!canSubmit || isSubmitting}
                  onClick={handleSubmit}
                >
                  {isSubmitting
                    ? selectedCounterpointCandidate.isCounterpoint
                      ? "Endorsing..."
                      : "Negating..."
                    : selectedCounterpointCandidate.isCounterpoint
                      ? "Endorse"
                      : "Endorse Negation"}
                </Button>
              </div>
            ) : hasContentBeenReviewed ? (
              <div className="items-end mt-md flex flex-col w-full xs:flex-row justify-end gap-2">
                <Button
                  className="min-w-28 w-full xs:w-fit"
                  rightLoading={isSubmitting}
                  disabled={!canSubmit || isSubmitting}
                  onClick={handleSubmit}
                >
                  {isSubmitting ? "Submitting..." : "Submit"}
                </Button>
                <Button
                  variant="outline"
                  className="min-w-28 w-full xs:w-fit"
                  disabled={isReviewingCounterpoint || !canReview || isSubmitting}
                  rightLoading={postReviewAction === 'regenerate' && isReviewingCounterpoint}
                  onClick={() => {
                    if (postReviewAction === 'regenerate') {
                      reviewCounterpoint();
                    } else {
                      setReviewDialogOpen(true);
                    }
                  }}
                >
                  {postReviewAction === 'regenerate'
                    ? isReviewingCounterpoint
                      ? "Reviewing..."
                      : "Review Again"
                    : "Review suggestions"}
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 mt-md self-end">
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <Button
                      disabled={!canReview || isReviewingCounterpoint || isSubmitting}
                      className="min-w-28 w-full xs:w-fit"
                      rightLoading={isSubmitting || isReviewingCounterpoint}
                      onClick={(e) => {
                        if (e.altKey) {
                          setIsSubmitting(true);
                          handleSubmit();
                          return;
                        }
                        reviewCounterpoint();
                      }}
                    >
                      {isSubmitting
                        ? "Submitting..."
                        : isReviewingCounterpoint
                          ? "Reviewing..."
                          : "Review & Negate"}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    Hold {platformKey} and click to skip review
                  </TooltipContent>
                </Tooltip>
              </div>
            )}
          </>
        )}
      </DialogContent>

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
              onSelectSuggestion={handleSuggestionSelected}
              onSelectOwnText={handleSelectOwnText}
            />
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  );
};
