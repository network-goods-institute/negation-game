import { CredInput } from "@/components/CredInput";
import { PointEditor } from "@/components/PointEditor";
import { PointStats } from "@/components/PointStats";
import { Button } from "@/components/ui/button";
import { MakePointCommandIcon } from "@/components/icons/AppIcons";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { POINT_MAX_LENGTH, POINT_MIN_LENGTH } from "@/constants/config";
import { useCredInput } from "@/hooks/useCredInput";
import { useSubmitHotkey } from "@/hooks/useSubmitHotkey";
import { cn } from "@/lib/cn";
import { useEndorse } from "@/mutations/useEndorse";
import { useMakePoint } from "@/mutations/useMakePoint";
import { useImprovePoint } from "@/queries/useImprovePoint";
import { useSimilarPoints } from "@/queries/useSimilarPoints";
import { useUser } from "@/queries/useUser";
import { DialogProps } from "@radix-ui/react-dialog";
import { useDebounce } from "@uidotdev/usehooks";
import { ArrowLeftIcon, BlendIcon, DiscIcon, Undo2Icon } from "lucide-react";
import { FC, useCallback, useEffect, useState } from "react";
import { IterableElement } from "type-fest";

export interface MakePointDialogProps extends DialogProps { }

export const MakePointDialog: FC<MakePointDialogProps> = ({
  open,
  onOpenChange,
  ...props
}) => {
  const {
    credInput: cred,
    setCredInput: setCred,
    notEnoughCred,
    resetCredInput: resetCred,
  } = useCredInput({
    resetWhen: !open,
  });
  const [content, setContent] = useState("");
  const [selectedPoint, selectPoint] = useState<
    IterableElement<typeof similarPoints> | undefined
  >(undefined);

  const [editingSuggestion, setEditingSuggestion] = useState<string | null>(
    null
  );
  const [editedContents, setEditedContents] = useState<Map<string, string>>(
    new Map()
  );
  const [suggestionSelected, setSuggestionSelected] = useState(false);

  const charactersLeft = POINT_MAX_LENGTH - content.length;
  const { data: user } = useUser();
  const debouncedContent = useDebounce(content, 500);
  const { data: similarPoints } = useSimilarPoints(debouncedContent);
  const { mutateAsync: endorse } = useEndorse();
  const { mutateAsync: makePoint } = useMakePoint();

  const {
    data: improvementSuggestionsStream,
    isLoading: isLoadingImprovements,
  } = useImprovePoint(debouncedContent, {
    enabled:
      !selectedPoint &&
      !suggestionSelected &&
      debouncedContent.length >= POINT_MIN_LENGTH,
  });

  const [improvementSuggestions, setImprovementSuggestions] = useState<
    string[]
  >([]);

  useEffect(() => {
    if (!improvementSuggestionsStream) {
      setImprovementSuggestions([]);
      return;
    }
    const suggestions = improvementSuggestionsStream
      .split("\n")
      .filter(Boolean);
    setImprovementSuggestions(suggestions);
  }, [improvementSuggestionsStream]);

  const canSubmit =
    user &&
    (selectedPoint
      ? true
      : (charactersLeft >= 0 && content.length >= POINT_MIN_LENGTH));

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setIsSubmitting(false);
    }
  }, [open]);

  const handleClose = useCallback(() => {
    setContent("");
    selectPoint(undefined);
    setSuggestionSelected(false);
    resetCred();
    setIsSubmitting(false);
    onOpenChange?.(false);
  }, [onOpenChange, resetCred]);

  const handleSubmit = useCallback(() => {
    if (!canSubmit || isSubmitting) return;

    setIsSubmitting(true);
    (selectedPoint
      ? endorse({ pointId: selectedPoint.pointId, cred })
      : makePoint({
        content,
        cred: cred,
      })
    )
      .then(() => {
        handleClose();
      })
      .catch(() => {
        setIsSubmitting(false);
      });
  }, [
    canSubmit,
    isSubmitting,
    selectedPoint,
    content,
    cred,
    handleClose,
    endorse,
    makePoint,
  ]);

  useSubmitHotkey(handleSubmit, open);

  return (
    <Dialog {...props} open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:top-xl flex flex-col overflow-hidden sm:translate-y-0 h-full rounded-none sm:rounded-md sm:h-fit gap-0 bg-background p-0 shadow-sm w-full max-w-xl max-h-[85vh]">
        <div className="w-full flex items-center justify-between p-4 sm:p-6 border-b">
          <DialogTitle>Make a Point</DialogTitle>
          <DialogDescription hidden>
            Create a new Point and endorse it with some cred
          </DialogDescription>
          <DialogClose className="text-primary">
            <ArrowLeftIcon />
          </DialogClose>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="flex w-full gap-3 mb-lg">
            <div className="flex flex-col items-center">
              {content.startsWith('/') ? (
                <MakePointCommandIcon className={cn(
                  "w-6 h-6 text-muted-foreground",
                  !selectedPoint && "text-primary"
                )} />
              ) : (
                <DiscIcon
                  className={cn(
                    "size-6 text-muted-foreground stroke-1",
                    !selectedPoint && "text-primary"
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

            {selectedPoint ? (
              <div className="flex flex-col w-full">
                <div className="flex flex-col p-4 gap-2 w-full border rounded-md mb-4 bg-muted/20">
                  <span className="flex-grow text-sm font-medium">
                    {selectedPoint.content}
                  </span>
                  <PointStats
                    favor={selectedPoint.favor}
                    amountNegations={selectedPoint.amountNegations}
                    amountSupporters={selectedPoint.amountSupporters}
                    cred={selectedPoint.cred}
                  />
                </div>
                <div className="flex justify-between items-center">
                  <CredInput
                    credInput={cred}
                    setCredInput={setCred}
                    notEnoughCred={notEnoughCred}
                    allowZero={true}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => selectPoint(undefined)}
                    className="ml-2 text-muted-foreground hover:text-primary"
                  >
                    <Undo2Icon className="size-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <PointEditor
                className="w-full -mt-1"
                content={content}
                setContent={setContent}
                cred={cred}
                setCred={setCred}
                placeholder="Make your Point"
                textareaClassName="-ml-2 -mt-2"
              />
            )}
          </div>

          {!selectedPoint && similarPoints && similarPoints.length > 0 && (
            <>
              <p className="text-xs text-muted-foreground mb-md">
                Make the most of your cred by endorsing an existing similar Point:
              </p>

              <div className="space-y-2">
                {similarPoints?.map((similarPoint) => (
                  <div
                    key={similarPoint.pointId}
                    onClick={() => selectPoint(similarPoint)}
                    className="flex p-4 gap-2 hover:bg-accent w-full cursor-pointer border rounded-md transition-colors"
                  >
                    <BlendIcon className="size-5 shrink-0 text-muted-foreground stroke-1 mt-0.5" />
                    <div className="flex flex-col gap-2">
                      <span className="flex-grow text-sm">
                        {similarPoint.content}
                      </span>
                      <PointStats
                        favor={similarPoint.favor}
                        amountNegations={similarPoint.amountNegations}
                        amountSupporters={similarPoint.amountSupporters}
                        cred={similarPoint.cred}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {!selectedPoint &&
            content.length >= POINT_MIN_LENGTH &&
            isLoadingImprovements && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground animate-pulse">
                <span className="size-2 bg-muted-foreground rounded-full animate-bounce" />
                <span>Crafting other phrasings...</span>
              </div>
            )}

          {!selectedPoint && improvementSuggestions.length > 0 && (
            <>
              <p className="text-xs text-muted-foreground mb-md">
                Consider these improved phrasings of your point:
              </p>

              <div className="space-y-2">
                {improvementSuggestions.map((suggestion) => (
                  <div key={suggestion} className="flex flex-col w-full">
                    {editingSuggestion === suggestion ? (
                      <div className="flex flex-col gap-2 p-4 border rounded-md bg-muted/10">
                        <textarea
                          className="w-full min-h-[60px] bg-transparent resize-none outline-none"
                          value={editedContents.get(suggestion) ?? suggestion}
                          onChange={(e) => {
                            const newMap = new Map(editedContents);
                            newMap.set(suggestion, e.target.value);
                            setEditedContents(newMap);
                          }}
                          autoFocus
                        />
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingSuggestion(null);
                              setEditedContents((map) => {
                                const newMap = new Map(
                                  Array.from(map).filter(
                                    ([key]) => key !== suggestion
                                  )
                                );
                                return newMap;
                              });
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => {
                              setContent(
                                editedContents.get(suggestion) ?? suggestion
                              );
                              setSuggestionSelected(true);
                              setEditingSuggestion(null);
                              setEditedContents(new Map());
                            }}
                          >
                            Use
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div
                        onClick={() => {
                          if (!editedContents.has(suggestion)) {
                            const newMap = new Map(editedContents);
                            newMap.set(suggestion, suggestion);
                            setEditedContents(newMap);
                          }
                          setEditingSuggestion(suggestion);
                        }}
                        className="flex p-4 gap-2 hover:bg-accent w-full cursor-pointer border rounded-md transition-colors"
                      >
                        <BlendIcon className="size-5 shrink-0 text-muted-foreground stroke-1 mt-0.5" />
                        <span className="flex-grow text-sm">
                          {editedContents.get(suggestion) ?? suggestion}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="p-4 sm:p-6 border-t">
          <Button
            className="ml-auto block"
            disabled={!canSubmit || isSubmitting}
            onClick={handleSubmit}
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <span className="size-4 border-2 border-background border-t-transparent rounded-full animate-spin" />
                {selectedPoint ? "Endorsing..." : "Creating..."}
              </div>
            ) : selectedPoint ? (
              "Endorse Point"
            ) : (
              "Make Point"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
