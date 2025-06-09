"use client";

import { reviewProposedCounterpointAction } from "@/actions/ai/reviewProposedCounterpointAction";
import { reviewProposedObjectionAction } from "@/actions/ai/reviewProposedObjectionAction";
import { negatedPointIdAtom } from "@/atoms/negatedPointIdAtom";
import { negationContentAtom } from "@/atoms/negationContentAtom";
import { recentlyCreatedNegationIdAtom } from "@/atoms/recentlyCreatedNegationIdAtom";
import { makeNegationSuggestionAtom } from "@/atoms/makeNegationSuggestionAtom";
import { makeObjectionSuggestionAtom } from "@/atoms/makeObjectionSuggestionAtom";
import { CredInput } from "@/components/inputs/CredInput";
import { PointEditor } from "@/components/editor/PointEditor";
import { PointStats } from "@/components/cards/pointcard/PointStats";
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
import { useCredInput } from "@/hooks/ui/useCredInput";
import { cn } from "@/lib/utils/cn";
import { useAddCounterpoint } from "@/mutations/points/useAddCounterpoint";
import { useEndorse } from "@/mutations/endorsements/useEndorse";
import { useNegate } from "@/mutations/points/useNegate";
import { validateObjectionTarget } from "@/actions/points/addObjection";
import { useAddObjection } from "@/mutations/points/useAddObjection";
import { usePointDataById } from "@/queries/points/usePointDataById";
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
import { ObjectionIcon } from "@/components/icons/ObjectionIcon";
import { FC, ReactNode, useCallback, useEffect, useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import CounterpointReview, { CounterpointCandidate, ReviewResults as CounterpointReviewResults } from "../ai/CounterpointReview";
import { toast } from "sonner";
import { encodeId } from '@/lib/negation-game/encodeId';
import { CreatedNegationView } from '../chatbot/preview/CreatedNegationView';
import { selectPointForNegationOpenAtom } from "@/atoms/selectPointForNegationOpenAtom";
import { useSetAtom } from 'jotai';
import { ReviewResults as ObjectionReviewResults } from "@/actions/ai/rateAndRefineObjectionAction";

export interface NegateDialogProps
  extends Omit<DialogProps, "open" | "onOpenChange"> { }

export const NegateDialog: FC<NegateDialogProps> = ({ ...props }) => {
  const [negationSuggestion, setNegationSuggestion] = useAtom(makeNegationSuggestionAtom);
  const [objectionSuggestion, setObjectionSuggestion] = useAtom(makeObjectionSuggestionAtom);
  const setSelectPointDialogOpen = useSetAtom(selectPointForNegationOpenAtom);

  const initialNegatedPointId = negationSuggestion?.targetId || objectionSuggestion?.targetId;
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
  const { mutateAsync: addObjection, isPending: isAddingObjection } = useAddObjection();

  const [guidanceNotes, setGuidanceNotes] = useState<ReactNode | undefined>(
    undefined
  );

  const [isSubmitting, setIsSubmitting] = useState(false);

  const isAnyOperationPending = isSubmitting || isAddingCounterpoint || isNegating || isEndorsing || isAddingObjection;

  const [selectedCounterpointCandidate, selectCounterpointCandidate] = useState<
    CounterpointCandidate | undefined
  >(undefined);
  const charactersLeft = POINT_MAX_LENGTH - counterpointContent.length;

  const queryClient = useQueryClient();

  const [recentlyCreatedNegation, setRecentlyCreatedNegation] = useAtom(recentlyCreatedNegationIdAtom);

  const [createdCounterpointId, setCreatedCounterpointId] = useState<number | null>(null);
  const [isObjection, setIsObjection] = useState(false);
  const [availableContexts, setAvailableContexts] = useState<Array<{
    contextPointId: number;
    contextContent: string;
    negationId: number;
  }>>([]);
  const [selectedContextIndex, setSelectedContextIndex] = useState(0);
  const [loadedContextsForPointId, setLoadedContextsForPointId] = useState<number | null>(null);

  const {
    data: reviewResults,
    isLoading: isReviewingCounterpoint,
    isSuccess: counterpointWasReviewed,
    refetch: reviewCounterpoint,
    error: reviewError,
  } = useQuery({
    enabled: false,
    queryKey: [
      "counterpoint-review",
      currentNegatedPointId,
      counterpointContent,
      negatedPoint?.content,
      isObjection,
      availableContexts[selectedContextIndex]?.contextPointId,
      availableContexts[selectedContextIndex]?.contextContent
    ] as const,
    queryFn: async ({ queryKey: [, pointId, content, negatedContent, isObj, contextId, contextContent] }) => {
      if (!pointId) throw new Error("No point ID");

      let reviewResults;
      if (isObj) {
        if (!contextId || !contextContent) throw new Error("No context ID or content for objection");
        reviewResults = await reviewProposedObjectionAction({
          targetPointId: pointId,
          negatedPointContent: negatedContent!,
          objectionContent: content,
          contextPointId: contextId,
          contextPointContent: contextContent,
        });
      } else {
        reviewResults = await reviewProposedCounterpointAction({
          negatedPointId: pointId,
          negatedPointContent: negatedContent!,
          counterpointContent: content,
        });
      }

      setGuidanceNotes(undefined);
      setLastReviewedContent(content);
      setHasContentBeenReviewed(true);

      // Type assertion for reviewResults based on isObj
      const currentReviewResults = reviewResults as (typeof isObj extends true ? ObjectionReviewResults : CounterpointReviewResults);

      // Filter existing similar counterpoints based on the current mode (isObjection)
      currentReviewResults.existingSimilarCounterpoints = currentReviewResults.existingSimilarCounterpoints.filter(
        (candidate) => candidate.isObjection === isObj
      );

      currentReviewResults.suggestions.forEach((selectedSuggestion) =>
        queryClient.setQueryData<
          typeof currentReviewResults
        >(
          ["counterpoint-review", pointId, selectedSuggestion] as const,
          produce(currentReviewResults, (draft) => {
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

  useEffect(() => {
    if (reviewError) {
      toast.error("Failed to review counterpoint. Please contact support if this persists.");
      console.error("Error reviewing counterpoint:", reviewError);
    }
  }, [reviewError]);

  const canReview =
    charactersLeft >= 0 && counterpointContent.length >= POINT_MIN_LENGTH;

  const canSubmit = selectedCounterpointCandidate?.isCounterpoint
    ? true
    : (charactersLeft >= 0 && counterpointContent.length >= POINT_MIN_LENGTH &&
      (!isObjection || (isObjection && availableContexts.length > 0)));
  const handleClose = useCallback(() => {
    selectCounterpointCandidate(undefined);
    setGuidanceNotes(undefined);
    resetCred();
    setCounterpointContent("");
    setLastReviewedContent("");
    setCreatedCounterpointId(null);
    setHasContentBeenReviewed(false);
    setPostReviewAction(null);
    setIsObjection(false);
    setAvailableContexts([]);
    setSelectedContextIndex(0);
    setLoadedContextsForPointId(null);
    setNegationSuggestion(null);
    setObjectionSuggestion(null);
    setNegatedPointId(undefined);
  }, [resetCred, setCounterpointContent, setNegationSuggestion, setObjectionSuggestion, setNegatedPointId]);

  const handleExitPreview = useCallback(() => {
    handleClose();
  }, [handleClose]);

  useEffect(() => {
    if (negationSuggestion) {
      setCounterpointContent(negationSuggestion.text);
      selectCounterpointCandidate(undefined);
      setGuidanceNotes(undefined);
      setLastReviewedContent("");
      setIsObjection(false);
    }
  }, [negationSuggestion, setCounterpointContent]);

  useEffect(() => {
    if (objectionSuggestion) {
      setCounterpointContent(objectionSuggestion.text);
      selectCounterpointCandidate(undefined);
      setGuidanceNotes(undefined);
      setLastReviewedContent("");
      setIsObjection(true);
      // Set the context ID if available
      if (objectionSuggestion.contextId && availableContexts.length > 0) {
        const contextIndex = availableContexts.findIndex(ctx => ctx.contextPointId === objectionSuggestion.contextId);
        if (contextIndex >= 0) {
          setSelectedContextIndex(contextIndex);
        }
      }
    }
  }, [objectionSuggestion, setCounterpointContent, availableContexts]);

  // Close dialog when there's no negated point ID
  // Note: We don't call handleClose here to avoid infinite loops
  // The dialog's onOpenChange will handle cleanup when it actually closes

  useEffect(() => {
    const dialogIsOpen = negationSuggestion !== null || objectionSuggestion !== null || negatedPointId !== undefined;

    if (currentNegatedPointId && dialogIsOpen && loadedContextsForPointId !== currentNegatedPointId) {
      validateObjectionTarget(currentNegatedPointId).then((result) => {
        setAvailableContexts(result.availableContexts);
        setSelectedContextIndex(0);
        setLoadedContextsForPointId(currentNegatedPointId);
      }).catch((error) => {
        console.error("Error loading objection contexts:", error);
        setAvailableContexts([]);
        setSelectedContextIndex(0);
        setLoadedContextsForPointId(null);
      });
    } else if (!dialogIsOpen) {
      // Clear contexts when dialog closes
      setAvailableContexts([]);
      setSelectedContextIndex(0);
      setLoadedContextsForPointId(null);
    }
  }, [currentNegatedPointId, negationSuggestion, objectionSuggestion, negatedPointId, loadedContextsForPointId]);

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
    setLastReviewedContent(counterpointContent); // Sync lastReviewedContent so needsReview is false
    setPostReviewAction('reopen'); // <-- Set action type for keeping own text
    setReviewDialogOpen(false); // Close review dialog
  }, [reviewResults, setGuidanceNotes, counterpointContent, setLastReviewedContent]);

  const handleSubmit = useCallback(() => {
    if (!canSubmit || isSubmitting || !negatedPoint) return;

    setIsSubmitting(true);
    let mutationPromise: Promise<number | void>;
    let isCreatingNew = selectedCounterpointCandidate === undefined;
    let finalCounterpointId: number | undefined;

    if (isCreatingNew) {
      if (isObjection) {
        const selectedContext = availableContexts[selectedContextIndex];
        if (!selectedContext) {
          toast.error("Cannot create objection: No context selected");
          setIsSubmitting(false);
          return;
        }

        mutationPromise = addObjection({
          content: counterpointContent,
          targetPointId: negatedPoint.pointId,
          contextPointId: selectedContext.contextPointId,
          cred,
        }).then(newPointId => {
          finalCounterpointId = newPointId;
          return newPointId;
        });
      } else {
        mutationPromise = addCounterpoint({
          content: counterpointContent,
          cred,
          negatedPointId: negatedPoint.pointId,
        }).then(newPointId => {
          finalCounterpointId = newPointId;
          return newPointId;
        });
      }
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
          if (isObjection) {
            toast.success("Objection created successfully.");
          } else {
            toast.success("Negation created successfully.");
          }
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
    negationSuggestion?.context,
    isObjection,
    addObjection,
    availableContexts,
    selectedContextIndex
  ]);

  const handleSubmitOrReview = useCallback(() => {
    console.log('NegateDialog: handleSubmitOrReview called', {
      currentNegatedPointId,
      needsReview,
      canReview,
      isReviewingCounterpoint,
      canSubmit,
      isSubmitting,
      reviewDialogOpen
    });
    if (!currentNegatedPointId) {
      console.log('NegateDialog: No currentNegatedPointId, returning');
      return;
    }

    // If content hasn't been reviewed yet and we can review, trigger review
    if (needsReview && canReview && !isReviewingCounterpoint) {
      console.log('NegateDialog: review conditions met, calling reviewCounterpoint');
      reviewCounterpoint();
      return;
    }

    // Only submit if content has been reviewed and dialog is closed
    if (!needsReview && canSubmit && !isSubmitting && !reviewDialogOpen) {
      console.log('NegateDialog: submit conditions met, calling handleSubmit');
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

  const [platformKey, setPlatformKey] = useState('Alt');

  useEffect(() => {
    setPlatformKey(navigator?.platform?.includes('Mac') ? '⌥' : 'Alt');
  }, []);

  const isOpen = negationSuggestion !== null || objectionSuggestion !== null || negatedPointId !== undefined;

  // Suppress Ctrl/Cmd+Enter submission when the dialog is open
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    };
    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isOpen]);

  const [isProcessing, setIsProcessing] = useState(false);

  return (
    <Dialog
      {...props}
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) handleClose();
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
                  ? `${isObjection ? "Objecting to" : "Negating"} Point ${currentNegatedPointId ? encodeId(currentNegatedPointId) : "..."}`
                  : `Endorsing ${selectedCounterpointCandidate.isCounterpoint ? "Counterpoint" : "Negation"} ${encodeId(selectedCounterpointCandidate.id)}`}
              </DialogTitle>
              <DialogDescription hidden>
                {selectedCounterpointCandidate?.isCounterpoint
                  ? "Add your cred behind this existing negation"
                  : "Add a new negation to the Point"}
              </DialogDescription>
              <DialogClose asChild>
                <button
                  className="text-primary"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClose();
                    setSelectPointDialogOpen(true);
                  }}
                >
                  <ArrowLeftIcon />
                </button>
              </DialogClose>
            </div>

            {/* Show original point context when in objection mode */}
            {isObjection && availableContexts.length > 0 && (
              <div className="flex w-full gap-md mb-xl">
                <div className="flex flex-col items-center">
                  <DiscIcon className="shrink-0 size-6 stroke-1 text-muted-foreground" />
                </div>
                <div className="@container/point flex-grow flex flex-col">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Original point being defended:</span>
                    {availableContexts.length > 1 && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setSelectedContextIndex((prev) =>
                            prev > 0 ? prev - 1 : availableContexts.length - 1
                          )}
                          className="p-1 hover:bg-accent rounded"
                          disabled={isAnyOperationPending}
                        >
                          ←
                        </button>
                        <span className="text-xs text-muted-foreground">
                          {selectedContextIndex + 1} of {availableContexts.length}
                        </span>
                        <button
                          onClick={() => setSelectedContextIndex((prev) =>
                            prev < availableContexts.length - 1 ? prev + 1 : 0
                          )}
                          className="p-1 hover:bg-accent rounded"
                          disabled={isAnyOperationPending}
                        >
                          →
                        </button>
                      </div>
                    )}
                  </div>
                  {availableContexts.length > 1 && (
                    <div className="text-xs text-muted-foreground mb-2 px-2 py-1 bg-muted/30 rounded">
                      💡 This counterpoint challenges multiple original points. Choose which relationship you want to object to.
                    </div>
                  )}
                  <p className="tracking-tight text-md @sm/point:text-lg">
                    {availableContexts[selectedContextIndex]?.contextContent}
                  </p>
                </div>
              </div>
            )}

            <div className="flex w-full gap-md mb-xl">
              <div className="flex flex-col items-center">
                <DiscIcon className="shrink-0 size-6 stroke-1 text-muted-foreground" />
              </div>
              <div className="@container/point flex-grow flex flex-col">
                {isLoadingNegatedPoint ? (
                  <div className="animate-pulse">
                    <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-muted rounded w-1/2"></div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">
                        {isObjection ? "Counterpoint being objected to:" : "Point being negated:"}
                      </span>
                    </div>
                    <p className="tracking-tight text-md @sm/point:text-lg -mt-2">
                      {negatedPoint?.content}
                    </p>
                  </>
                )}
              </div>
            </div>

            <div className="flex w-full gap-md mb-xl">
              <div className="flex flex-col items-center">
                {isObjection ? (
                  <ObjectionIcon
                    className={cn(
                      "shrink-0 size-6 stroke-1 text-muted-foreground",
                      !selectedCounterpointCandidate &&
                      "text-red-600"
                    )}
                  />
                ) : (
                  <CircleXIcon
                    className={cn(
                      "shrink-0 size-6 stroke-1 text-muted-foreground",
                      !selectedCounterpointCandidate &&
                      "circle-dashed-2 text-primary"
                    )}
                  />
                )}
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
                    allowZero={false}
                  />
                </div>
              ) : (
                <PointEditor
                  className="w-full -mt-1"
                  content={counterpointContent}
                  setContent={setCounterpointContent}
                  cred={cred}
                  setCred={setCred}
                  placeholder={isObjection ? "Make your objection" : "Make your counterpoint"}
                  guidanceNotes={guidanceNotes}
                  textareaClassName="-ml-2 -mt-2"
                />
              )}
            </div>

            {selectedCounterpointCandidate ? (
              <div className="items-end mt-md flex flex-col w-full xs:flex-row justify-end gap-2">
                <div className="items-center mt-md flex flex-col w-full xs:flex-row justify-between gap-2">
                  <div className="flex items-center gap-2" role="group" aria-label="Mode selection">
                    <span className="text-sm text-muted-foreground">Counterpoint</span>
                    <Tooltip delayDuration={0}>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => setIsObjection(!isObjection)}
                          className={cn(
                            "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background",
                            isObjection
                              ? "bg-red-600 focus:ring-red-500"
                              : "bg-gray-200 dark:bg-gray-700 focus:ring-gray-500"
                          )}
                          role="switch"
                          aria-checked={isObjection}
                          disabled={availableContexts.length === 0}
                        >
                          <span
                            className={cn(
                              "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                              isObjection ? "translate-x-6" : "translate-x-1"
                            )}
                          />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        {availableContexts.length === 0
                          ? "No original points available to defend (objections not possible)"
                          : isObjection
                            ? "Make an objection (argue the point is irrelevant)"
                            : "Make a counterpoint (argue the point is false)"
                        }
                      </TooltipContent>
                    </Tooltip>
                    <span className={cn(
                      "text-sm transition-colors",
                      isObjection ? "text-red-600 font-medium" : "text-muted-foreground"
                    )}>
                      Objection
                    </span>
                  </div>
                  <div className="flex gap-2 ml-auto">
                    <Button
                      className="px-8 min-w-28 w-full xs:w-fit"
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
                </div>
              </div>
            ) : hasContentBeenReviewed ? (
              <div className="items-end mt-md flex flex-col w-full xs:flex-row justify-end gap-2">
                <div className="items-center mt-md flex flex-col w-full xs:flex-row justify-between gap-2">
                  <div className="flex items-center gap-2" role="group" aria-label="Mode selection">
                    <span className="text-sm text-muted-foreground">Counterpoint</span>
                    <Tooltip delayDuration={0}>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => setIsObjection(!isObjection)}
                          className={cn(
                            "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background",
                            isObjection
                              ? "bg-red-600 focus:ring-red-500"
                              : "bg-gray-200 dark:bg-gray-700 focus:ring-gray-500"
                          )}
                          role="switch"
                          aria-checked={isObjection}
                          disabled={availableContexts.length === 0}
                        >
                          <span
                            className={cn(
                              "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                              isObjection ? "translate-x-6" : "translate-x-1"
                            )}
                          />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        {availableContexts.length === 0
                          ? "No original points available to defend (objections not possible)"
                          : isObjection
                            ? "Make an objection (argue the point is irrelevant)"
                            : "Make a counterpoint (argue the point is false)"
                        }
                      </TooltipContent>
                    </Tooltip>
                    <span className={cn(
                      "text-sm transition-colors",
                      isObjection ? "text-red-600 font-medium" : "text-muted-foreground"
                    )}>
                      Objection
                    </span>
                  </div>
                  <div className="flex gap-2 ml-auto">
                    <Button
                      className="px-8 min-w-28 w-full xs:w-fit"
                      rightLoading={isSubmitting}
                      disabled={!canSubmit || isSubmitting}
                      onClick={handleSubmit}
                    >
                      {isSubmitting ? "Submitting..." : "Submit"}
                    </Button>
                    <Button
                      variant="outline"
                      className="px-8 min-w-28 w-full xs:w-fit"
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
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 mt-md self-end">
                <div className="flex items-center gap-2 mt-md justify-between self-end w-full xs:flex-row">
                  <div className="flex items-center gap-2" role="group" aria-label="Mode selection">
                    <span className="text-sm text-muted-foreground">Counterpoint</span>
                    <Tooltip delayDuration={0}>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => setIsObjection(!isObjection)}
                          className={cn(
                            "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background",
                            isObjection
                              ? "bg-red-600 focus:ring-red-500"
                              : "bg-gray-200 dark:bg-gray-700 focus:ring-gray-500"
                          )}
                          role="switch"
                          aria-checked={isObjection}
                          disabled={availableContexts.length === 0}
                        >
                          <span
                            className={cn(
                              "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                              isObjection ? "translate-x-6" : "translate-x-1"
                            )}
                          />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        {availableContexts.length === 0
                          ? "No original points available to defend (objections not possible)"
                          : isObjection
                            ? "Make an objection (argue the point is irrelevant)"
                            : "Make a counterpoint (argue the point is false)"
                        }
                      </TooltipContent>
                    </Tooltip>
                    <span className={cn(
                      "text-sm transition-colors",
                      isObjection ? "text-red-600 font-medium" : "text-muted-foreground"
                    )}>
                      Objection
                    </span>
                  </div>
                  <div className="flex gap-2 ml-auto">
                    <Tooltip delayDuration={0}>
                      <TooltipTrigger asChild>
                        <Button
                          disabled={!canReview || isReviewingCounterpoint || isSubmitting || isProcessing}
                          className="px-8 min-w-28 w-full xs:w-fit"
                          rightLoading={isSubmitting || isReviewingCounterpoint}
                          onClick={(e) => {
                            if (isProcessing || isReviewingCounterpoint || isSubmitting) {
                              console.log('NegateDialog: click ignored—already processing');
                              return;
                            }
                            console.log('NegateDialog: Review & Negate button clicked', {
                              altKey: e.altKey,
                              canReview,
                              isReviewingCounterpoint,
                              isSubmitting,
                              isProcessing
                            });
                            if (e.altKey) {
                              console.log('NegateDialog: Alt key pressed, skipping review, calling handleSubmit');
                              setIsSubmitting(true);
                              handleSubmit();
                              return;
                            }
                            console.log('NegateDialog: Calling reviewCounterpoint via button click');
                            setIsProcessing(true);
                            reviewCounterpoint().finally(() => setIsProcessing(false));
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
                </div>
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
              isObjection={isObjection}
              contextPointContent={availableContexts[selectedContextIndex]?.contextContent}
            />
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  );
};
