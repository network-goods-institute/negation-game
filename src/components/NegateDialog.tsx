import { findCounterpointCandidatesAction as fetchCounterpointCandidatesAction } from "@/actions/findCounterpointCandidatesAction";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
import { PopoverAnchor } from "@radix-ui/react-popover";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToggle } from "@uidotdev/usehooks";
import { produce } from "immer";
import { useAtom } from "jotai";
import {
  AlertTriangleIcon,
  ArrowLeftIcon,
  CircleCheckBigIcon,
  CircleXIcon,
  DiscIcon,
  SparklesIcon,
  SquarePenIcon,
  TrashIcon,
} from "lucide-react";
import { FC, ReactNode, useCallback, useEffect, useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface NegateDialogProps
  extends Omit<DialogProps, "open" | "onOpenChange"> { }

export const NegateDialog: FC<NegateDialogProps> = ({ ...props }) => {
  const [negatedPointId, setNegatedPointId] = useAtom(negatedPointIdAtom);
  const { data: negatedPoint } = usePointData(negatedPointId);
  const [counterpointContent, setCounterpointContent] = useAtom(
    negationContentAtom(negatedPoint?.pointId)
  );
  const [reviewPopoverOpen, toggleReviewPopoverOpen] = useToggle(false);
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

  const isSubmitting = isNegating || isEndorsing || isAddingCounterpoint;

  const [selectedCounterpointCandidate, selectCounterpointCandidate] = useState<
    | Awaited<ReturnType<typeof fetchCounterpointCandidatesAction>>[number]
    | undefined
  >(undefined);
  const charactersLeft = POINT_MAX_LENGTH - counterpointContent.length;

  const queryClient = useQueryClient();

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
      negatedPoint,
      counterpointContent,
    ] as const,
    queryFn: async ({ queryKey: [, negatedPoint, counterpointContent] }) => {
      const reviewResults = await reviewProposedCounterpointAction({
        negatedPointId: negatedPoint!.pointId,
        negatedPointContent: negatedPoint!.content,
        counterpointContent,
      });

      setGuidanceNotes(undefined);

      //set the review results cache for rephrasings so that the user is not forced to review again if he picks one
      reviewResults.suggestions.forEach((selectedSuggestion) =>
        queryClient.setQueryData<typeof reviewResults>(
          ["counterpoint-review", negatedPoint, selectedSuggestion] as const,
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
        toggleReviewPopoverOpen(true);

      return reviewResults;
    },
  });

  const canReview =
    charactersLeft >= 0 && counterpointContent.length >= POINT_MIN_LENGTH;

  const canSubmit = selectedCounterpointCandidate?.isCounterpoint
    ? cred > 0
    : charactersLeft >= 0 && counterpointContent.length >= POINT_MIN_LENGTH;

  const resetForm = useCallback(() => {
    selectCounterpointCandidate(undefined);
    setGuidanceNotes(undefined);
    resetCred();
    setCounterpointContent("");
  }, [resetCred, setCounterpointContent]);

  useEffect(() => {
    if (!negatedPointId) resetForm();
  }, [negatedPointId, resetForm]);

  const handleSubmit = useCallback(() => {
    if (!canSubmit || isSubmitting) return;

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
    ).then(() => {
      queryClient.invalidateQueries({ queryKey: ["feed"] });
      resetForm();
      setNegatedPointId(undefined);
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
      counterpointWasReviewed &&
      !reviewIsStale &&
      canSubmit &&
      !isSubmitting &&
      !reviewPopoverOpen
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
    reviewPopoverOpen,
    reviewCounterpoint,
    handleSubmit,
  ]);

  useSubmitHotkey(handleSubmitOrReview, !!negatedPointId);

  return (
    <Dialog
      {...props}
      open={!!negatedPointId}
      onOpenChange={(isOpen) => !isOpen && setNegatedPointId(undefined)}
    >
      <DialogContent className="@container sm:top-xl flex flex-col overflow-auto sm:translate-y-0 h-full rounded-none sm:rounded-md sm:h-fit gap-0  bg-background  p-4 sm:p-8 shadow-sm w-full max-w-xl">
        <div className="w-full flex items-center justify-between mb-xl">
          <DialogTitle>Negate</DialogTitle>
          <DialogDescription hidden>
            Add a negation to the Point
          </DialogDescription>
          <DialogClose className="text-primary">
            <ArrowLeftIcon />
          </DialogClose>
        </div>
        <Popover
          modal
          open={reviewPopoverOpen}
          onOpenChange={toggleReviewPopoverOpen}
        >
          <PopoverAnchor>
            <div className="flex w-full gap-md">
              <div className="flex flex-col  items-center">
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
                <p className="tracking-tight text-md  @sm/point:text-lg mb-lg -mt-2">
                  {negatedPoint?.content}
                </p>
              </div>
            </div>
          </PopoverAnchor>

          <div className="flex w-full gap-md mb-lg">
            <div className="flex flex-col  items-center">
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
                    className="absolute -right-2 -bottom-4 text-muted-foreground border rounded-full  p-2 size-fit "
                    variant={"outline"}
                    size={"icon"}
                    onClick={() => selectCounterpointCandidate(undefined)}
                  >
                    <TrashIcon className=" size-5" />
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

              <PopoverTrigger asChild>
                <Button className="min-w-28 w-full xs:w-fit">
                  Review suggestions{" "}
                  <Badge className="bg-white text-primary ml-2 px-1.5">
                    {reviewResults.existingSimilarCounterpoints.length +
                      reviewResults.suggestions.length}
                  </Badge>
                </Button>
              </PopoverTrigger>

              <PopoverContent
                autoFocus
                className="flex flex-col w-[calc(100vw-1rem)] xs:w-[var(--radix-popper-anchor-width)] max-h-[var(--radix-popper-available-height)]  pt-4 p-2 overflow-clip -mt-lg"
              >
                <p className="text-sm font-semibold text-muted-foreground mb-sm text-center">
                  Review counterpoint suggestions
                </p>
                <div className="flex flex-col overflow-y-auto  gap-sm shadow-inner border rounded-md p-2 bg-muted">
                  {reviewResults.existingSimilarCounterpoints.length > 0 && (
                    <>
                      <p className="text-xs text-muted-foreground my-sm text-center">
                        Make the most of your cred by using an existing Point
                      </p>

                      {reviewResults.existingSimilarCounterpoints?.map(
                        (counterpointCandidate) => (
                          <div
                            key={counterpointCandidate.id}
                            className="flex flex-col gap-2 p-4  hover:border-muted-foreground  w-full bg-background cursor-pointer border rounded-md"
                            onClick={() => {
                              selectCounterpointCandidate(
                                counterpointCandidate
                              );
                              toggleReviewPopoverOpen(false);
                            }}
                          >
                            <span className="flex-grow text-sm">
                              {counterpointCandidate.content}
                            </span>
                            <PointStats
                              favor={counterpointCandidate.favor}
                              amountNegations={
                                counterpointCandidate.amountNegations
                              }
                              amountSupporters={
                                counterpointCandidate.amountSupporters
                              }
                              cred={counterpointCandidate.cred}
                            />
                          </div>
                        )
                      )}

                      <div className="flex items-center gap-2">
                        <div className="h-px border-b flex-grow" />{" "}
                        <span className="text-xs text-muted-foreground">
                          or
                        </span>
                        <div className="h-px border-b flex-grow" />
                      </div>
                    </>
                  )}

                  <span className="text-xs text-muted-foreground text-center">
                    Pick one of these AI suggestions{" "}
                    <SparklesIcon className="size-3 inline-block" />
                  </span>
                  {reviewResults.suggestions.map((suggestion, i) => (
                    <div
                      key={`rephrasing-${i}`}
                      onClick={() => {
                        setGuidanceNotes(
                          <>
                            <SquarePenIcon className="size-3 align-[-1.5px] inline-block" />{" "}
                            {counterpointContent}{" "}
                            <Button
                              variant={"link"}
                              className="text-xs size-fit inline-block p-0 font-normal underline underline-offset-1 ml-1"
                              onClick={() => {
                                setCounterpointContent(counterpointContent);
                                setGuidanceNotes(undefined);
                              }}
                            >
                              restore
                            </Button>
                          </>
                        );
                        setCounterpointContent(suggestion);
                        toggleReviewPopoverOpen(false);
                      }}
                      className="relative flex flex-col gap-2 p-4 w-full  bg-background   hover:border-muted-foreground cursor-pointer border border-dashed  rounded-md"
                    >
                      <span className="flex-grow text-sm">{suggestion}</span>
                    </div>
                  ))}
                  <span className="text-xs text-muted-foreground text-center">
                    {`(You can edit them and we'll keep your words as reference)`}
                  </span>
                </div>
                <p className="text-sm font-semibold text-muted-foreground mt-sm text-center">
                  Or stick with your counterpoint
                </p>
                <div className="flex flex-col p-sm ">
                  <div
                    key={"player-counterpoint"}
                    onClick={() => {
                      setGuidanceNotes(
                        reviewResults.rating < GOOD_ENOUGH_POINT_RATING ? (
                          <>
                            <AlertTriangleIcon className="size-3 align-[-1.5px] inline-block" />{" "}
                            {reviewResults.feedback}
                            <Button
                              variant={"link"}
                              className="text-xs size-fit inline-block p-0 font-normal underline underline-offset-1 ml-1"
                              onClick={() => {
                                setGuidanceNotes(undefined);
                              }}
                            >
                              dismiss
                            </Button>
                          </>
                        ) : undefined
                      );
                      selectCounterpointCandidate(undefined);
                      toggleReviewPopoverOpen(false);
                    }}
                    className="relative flex flex-col gap-2 p-4 w-full shadow-sm  mb-sm  bg-background   hover:border-muted-foreground  cursor-pointer border border-dashed rounded-md"
                  >
                    <span className="flex-grow text-sm">
                      {counterpointContent}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground mx-md">
                    {reviewResults.rating < GOOD_ENOUGH_POINT_RATING ? (
                      <>
                        <AlertTriangleIcon className="size-3 align-[-1.5px] inline-block" />
                        {` But it needs work. You'll have some feedback.`}
                      </>
                    ) : (
                      <>
                        <CircleCheckBigIcon className="size-3 align-[-1.5px] inline-block" />
                        {` That's a good Point`}
                      </>
                    )}
                  </span>
                </div>
              </PopoverContent>
            </div>
          ) : (
            <div className="flex items-center gap-2 mt-md self-end">
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Button
                    disabled={!canReview || isReviewingCounterpoint}
                    className="min-w-28 w-full xs:w-fit"
                    rightLoading={isReviewingCounterpoint}
                    onClick={(e) => {
                      if (e.altKey) {
                        handleSubmit();
                        return;
                      }
                      reviewCounterpoint();
                    }}
                  >
                    Review & Negate
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  Hold {navigator.platform.includes('Mac') ? '⌥' : 'Alt'} and click to skip review
                </TooltipContent>
              </Tooltip>
            </div>
          )}
        </Popover>
      </DialogContent>
    </Dialog>
  );
};
