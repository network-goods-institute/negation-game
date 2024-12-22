import { endorse } from "@/actions/endorse";
import { fetchSimilarPoints } from "@/actions/fetchSimilarPoints";
import { improvePoint } from "@/actions/improvePoint";
import { makePoint } from "@/actions/makePoint";
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
import { POINT_MAX_LENGHT, POINT_MIN_LENGHT } from "@/constants/config";
import { useCredInput } from "@/hooks/useCredInput";
import { useUser } from "@/hooks/useUser";
import { cn } from "@/lib/cn";
import { DialogProps } from "@radix-ui/react-dialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useDebounce } from "@uidotdev/usehooks";
import { ArrowLeftIcon, BlendIcon, DiscIcon, Undo2Icon } from "lucide-react";
import { FC, useEffect, useState } from "react";
import { IterableElement } from "type-fest";

export interface MakePointDialogProps extends DialogProps {}

export const MakePointDialog: FC<MakePointDialogProps> = ({
  open,
  onOpenChange,
  ...props
}) => {
  const { cred, setCred, notEnoughCred, resetCred } = useCredInput({
    resetWhen: !open,
  });
  const [content, setContent] = useState("");
  const [selectedPoint, selectPoint] = useState<
    IterableElement<typeof similarPoints> | undefined
  >(undefined);
  const [editingSuggestion, setEditingSuggestion] = useState<string | null>(null);
  const [editedContents, setEditedContents] = useState<Map<string, string>>(new Map());
  const [suggestionSelected, setSuggestionSelected] = useState(false);
  const charactersLeft = POINT_MAX_LENGHT - content.length;
  const { data: user } = useUser();
  const canSubmit =
    user &&
    user.cred >= cred &&
    cred > 0 &&
    (selectedPoint ||
      (charactersLeft >= 0 && content.length >= POINT_MIN_LENGHT));
  const queryClient = useQueryClient();
  const debouncedContent = useDebounce(content, 500);

  const { data: similarPoints } = useQuery({
    queryKey: ["similarPoints", debouncedContent],
    queryFn: ({ queryKey: [, query] }) =>
      debouncedContent.length >= POINT_MIN_LENGHT
        ? fetchSimilarPoints({ query })
        : [],
  });

  const { data: improvementSuggestionsStream, isLoading: isLoadingImprovements } = useQuery({
    queryKey: ["improvementSuggestions", debouncedContent],
    queryFn: ({ queryKey: [, query] }) =>
      debouncedContent.length >= POINT_MIN_LENGHT ? improvePoint(query) : null,
    enabled: !selectedPoint && !suggestionSelected && debouncedContent.length >= POINT_MIN_LENGHT,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    gcTime: 0
  });

  const [improvementSuggestions, setImprovementSuggestions] = useState<string[]>([]);

  useEffect(() => {
    if (!improvementSuggestionsStream) {
      setImprovementSuggestions([]);
      return;
    }
    const suggestions = improvementSuggestionsStream.split('\n').filter(Boolean);
    setImprovementSuggestions(suggestions);
  }, [improvementSuggestionsStream]);

  return (
    <Dialog {...props} open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:top-xl flex flex-col overflow-auto sm:translate-y-0 h-full rounded-none sm:rounded-md sm:h-fit gap-0  bg-background p-4 sm:p-8 shadow-sm w-full max-w-xl">
        <div className="w-full flex items-center justify-between mb-xl">
          <DialogTitle hidden>Make a Point</DialogTitle>
          <DialogDescription hidden>
            Create a new Point and endorse it with some cred
          </DialogDescription>
          <DialogClose className="text-primary">
            <ArrowLeftIcon />
          </DialogClose>
        </div>

        <div className="flex w-full gap-3 mb-lg">
          <div className="flex flex-col items-center">
            <DiscIcon
              className={cn(
                "size-6 text-muted-foreground stroke-1",
                !selectedPoint && "text-endorsed"
              )}
            />
            {cred > 0 && (
              <span className="relative text-endorsed text-xs">
                <span className="absolute -left-2">+</span>
                {cred}
              </span>
            )}
          </div>

          {selectedPoint ? (
            <div className="flex flex-col">
              <div className="flex flex-col p-4 gap-2 w-full border rounded-md mb-2">
                <span className="flex-grow text-sm">
                  {selectedPoint.content}
                </span>
                <PointStats
                  favor={selectedPoint.favor}
                  amountNegations={selectedPoint.amountNegations}
                  amountSupporters={selectedPoint.amountSupporters}
                  cred={selectedPoint.cred}
                />
              </div>
              <div className="flex justify-between">
                <CredInput
                  cred={cred}
                  setCred={setCred}
                  notEnoughCred={notEnoughCred}
                />
                <Button
                  variant={"link"}
                  size={"icon"}
                  onClick={() => selectPoint(undefined)}
                >
                  <Undo2Icon />
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
            />
          )}
        </div>

        {!selectedPoint && similarPoints && similarPoints.length > 0 && (
          <>
            <p className="text-xs text-muted-foreground mb-md">
              Make the most of your cred by endorsing an existing similar Point:
            </p>

            {similarPoints?.map((similarPoint) => (
              <div
                key={similarPoint.id}
                onClick={() => selectPoint(similarPoint)}
                className="flex p-4 gap-2 hover:bg-accent w-full cursor-pointer border rounded-md mb-2"
              >
                <BlendIcon className="size-5 shrink-0 text-muted-foreground stroke-1" />
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
          </>
        )}

        {!selectedPoint && content.length >= POINT_MIN_LENGHT && isLoadingImprovements && (
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

            {improvementSuggestions.map((suggestion, index) => (
              <div key={index} className="flex flex-col w-full mb-2">
                {editingSuggestion === suggestion ? (
                  <div className="flex flex-col gap-2 p-4 border rounded-md">
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
                          const newMap = new Map(editedContents);
                          newMap.delete(suggestion); // eslint-disable-line drizzle/enforce-delete-with-where
                          setEditedContents(newMap);
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          setContent(editedContents.get(suggestion) ?? suggestion);
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
                    className="flex p-4 gap-2 hover:bg-accent w-full cursor-pointer border rounded-md"
                  >
                    <BlendIcon className="size-5 shrink-0 text-muted-foreground stroke-1" />
                    <span className="flex-grow text-sm">{editedContents.get(suggestion) ?? suggestion}</span>
                  </div>
                )}
              </div>
            ))}
          </>
        )}

        <Button
          className="self-end mt-md"
          disabled={!canSubmit}
          onClick={() => {
            (selectedPoint
              ? endorse({ pointId: selectedPoint.id, cred })
              : makePoint({
                  content,
                  cred: cred,
                })
            ).then(() => {
              queryClient.invalidateQueries({
                queryKey: ["feed"],
                exact: false,
              });
              onOpenChange?.(false);
              setContent("");
              selectPoint(undefined);
              setSuggestionSelected(false);
              resetCred();
            });
          }}
        >
          {selectedPoint ? "Endorse Point" : "Make Point"}
        </Button>
      </DialogContent>
    </Dialog>
  );
};