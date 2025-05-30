import { CredInput } from "../inputs/CredInput";
import { PointEditor } from "../editor/PointEditor";
import { PointStats } from "../cards/pointcard/PointStats";
import { Button } from "../ui/button";
import { MakePointCommandIcon } from "../icons/AppIcons";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { POINT_MAX_LENGTH, POINT_MIN_LENGTH } from "@/constants/config";
import { useCredInput } from "@/hooks/ui/useCredInput";
import { useSubmitHotkey } from "@/hooks/ui/useSubmitHotkey";
import { cn } from "@/lib/utils/cn";
import { useEndorse } from "@/mutations/endorsements/useEndorse";
import { useMakePoint } from "@/mutations/points/useMakePoint";
import { useImprovePoint } from "@/queries/points/useImprovePoint";
import { useSimilarPoints } from "@/queries/points/useSimilarPoints";
import { useUser } from "@/queries/users/useUser";
import { DialogProps } from "@radix-ui/react-dialog";
import { useDebounce } from "@uidotdev/usehooks";
import { ArrowLeftIcon, BlendIcon, DiscIcon, Undo2Icon, Loader2 } from "lucide-react";
import { FC, useCallback, useEffect, useState } from "react";
import { IterableElement } from "type-fest";
import { useAtom } from 'jotai';
import { makePointSuggestionAtom } from '@/atoms/makePointSuggestionAtom';
import { CreatedPointView } from '../chatbot/preview/CreatedPointView';

export interface MakePointDialogProps extends Omit<DialogProps, 'open' | 'onOpenChange'> { }

export const MakePointDialog: FC<MakePointDialogProps> = ({ ...props }) => {
  const [suggestion, setSuggestion] = useAtom(makePointSuggestionAtom);
  const isOpen = suggestion !== null;
  const context = suggestion?.context;
  const spaceId = suggestion?.spaceId;

  const [createdPointId, setCreatedPointId] = useState<number | null>(null);
  const { data: user } = useUser();

  const {
    credInput: cred,
    setCredInput: setCred,
    notEnoughCred,
    resetCredInput: resetCred,
  } = useCredInput({
    resetWhen: !isOpen,
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

  const debouncedContent = useDebounce(content, 500);
  const { data: similarPoints } = useSimilarPoints(debouncedContent);
  const { mutateAsync: endorse } = useEndorse();
  const { mutateAsync: makePoint } = useMakePoint();

  const {
    data: improvementSuggestionsStream,
    isLoading: isLoadingImprovements,
  } = useImprovePoint(debouncedContent, {
    enabled:
      isOpen &&
      !createdPointId &&
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

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (suggestion && !createdPointId) {
      setContent(suggestion.text);
      selectPoint(undefined);
      setSuggestionSelected(false);
      setEditingSuggestion(null);
      setEditedContents(new Map());
      setIsSubmitting(false);
    } else if (!suggestion) {
      setContent("");
    }
  }, [suggestion, createdPointId]);

  useEffect(() => {
    if (!isOpen) {
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const handleClose = useCallback(() => {
    setSuggestion(null);
    setCreatedPointId(null);
  }, [setSuggestion]);

  const handleSubmit = useCallback(() => {
    if (!user || (!selectedPoint && !(content.length >= POINT_MIN_LENGTH && content.length <= POINT_MAX_LENGTH))) return;
    if (isSubmitting) return;

    setIsSubmitting(true);
    (selectedPoint
      ? endorse({ pointId: selectedPoint.pointId, cred })
      : makePoint({
        content,
        cred: cred,
      })
    )
      .then((pointId) => {
        if (!selectedPoint && pointId) {
          if (context === 'chat') {
            setCreatedPointId(pointId);
            setIsSubmitting(false);
          } else {
            handleClose();
          }
        } else {
          handleClose();
        }
      })
      .catch(() => {
        setIsSubmitting(false);
      });
  }, [
    user,
    selectedPoint,
    content,
    cred,
    isSubmitting,
    context,
    handleClose,
    endorse,
    makePoint,
  ]);

  useSubmitHotkey(handleSubmit, isOpen && !createdPointId);

  const renderSuccessView = () => {
    if (!createdPointId) return null;

    const effectiveSpaceId = spaceId!;

    return (
      <>
        <div className="w-full flex items-center justify-between p-4 sm:p-6 border-b">
          <DialogTitle>Point Created</DialogTitle>
          <DialogClose asChild>
            <Button variant="ghost" size="icon" className="text-primary" onClick={handleClose}>
              <ArrowLeftIcon />
            </Button>
          </DialogClose>
        </div>
        <CreatedPointView
          pointId={createdPointId}
          spaceId={effectiveSpaceId}
          onClose={handleClose}
        />
      </>
    );
  };

  const renderFormView = () => (
    <>
      <div className="w-full flex items-center justify-between p-4 sm:p-6 border-b">
        <DialogTitle>Make a Point</DialogTitle>
        <DialogDescription hidden>
          Create a new Point and endorse it with some cred
        </DialogDescription>
        <DialogClose asChild>
          <Button variant="ghost" size="icon" className="text-primary" onClick={handleClose}>
            <ArrowLeftIcon />
          </Button>
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
          <div className="mt-lg">
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
          </div>
        )}

        {!selectedPoint &&
          content.length >= POINT_MIN_LENGTH &&
          isLoadingImprovements && (
            <div className="mt-lg flex items-center gap-2 text-sm text-muted-foreground animate-pulse">
              <span className="size-2 bg-muted-foreground rounded-full animate-bounce" />
              <span>Crafting other phrasings...</span>
            </div>
          )}

        {!selectedPoint && improvementSuggestions.length > 0 && (
          <div className="mt-lg">
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
          </div>
        )}
      </div>

      <div className="flex items-center justify-between p-4 sm:p-6 border-t bg-background">
        {suggestionSelected ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSuggestionSelected(false)}
            className="text-muted-foreground hover:text-primary"
          >
            <Undo2Icon className="size-4 mr-1.5" />
            Back to Original
          </Button>
        ) : (
          <div />
        )}

        <Button
          onClick={handleSubmit}
          disabled={!user || (!selectedPoint && !(content.length >= POINT_MIN_LENGTH && content.length <= POINT_MAX_LENGTH)) || isSubmitting}
        >
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isSubmitting
            ? selectedPoint
              ? "Endorsing..."
              : "Creating..."
            : selectedPoint
              ? "Endorse Point"
              : "Create Point"}
        </Button>
      </div>
    </>
  );

  return (
    <Dialog {...props} open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent className="sm:top-xl flex flex-col overflow-hidden sm:translate-y-0 h-full rounded-none sm:rounded-md sm:h-fit gap-0 bg-background p-0 shadow-sm w-full max-w-xl max-h-[85vh]">
        {createdPointId ? renderSuccessView() : renderFormView()}
      </DialogContent>
    </Dialog>
  );
};
