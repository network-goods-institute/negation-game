import { addCounterpoint } from "@/actions/addCounterpoint";
import { endorse } from "@/actions/endorse";
import { fetchCounterpointCandidates } from "@/actions/fetchCounterpointCandidates";
import { improveNegation } from "@/actions/improvePoint";
import { negate } from "@/actions/negate";
import { negationContentAtom } from "@/atoms/negationContentAtom";
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
import { cn } from "@/lib/cn";
import { favor } from "@/lib/negation-game/favor";
import { DialogProps } from "@radix-ui/react-dialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useDebounce } from "@uidotdev/usehooks";
import { useAtom } from "jotai";
import {
  ArrowLeftIcon,
  BlendIcon,
  CircleXIcon,
  DiscIcon,
  Undo2Icon,
} from "lucide-react";
import { FC, useEffect, useState } from "react";

export interface NegateDialogProps extends DialogProps {
  negatedPoint?: { id: number; content: string; createdAt: Date };
}

export const NegateDialog: FC<NegateDialogProps> = ({
  negatedPoint,
  open,
  onOpenChange,
  ...props
}) => {
  const [content, setContent] = useAtom(negationContentAtom);
  const { cred, setCred, notEnoughCred, resetCred } = useCredInput({
    resetWhen: !open,
  });
  const [selectedCounterpointCandidate, selectCounterpointCandidate] = useState<
    Awaited<ReturnType<typeof fetchCounterpointCandidates>>[number] | undefined
  >(undefined);
  const [editingSuggestion, setEditingSuggestion] = useState<string | null>(null);
  const [editedContents, setEditedContents] = useState<Map<string, string>>(new Map());
  const [suggestionSelected, setSuggestionSelected] = useState(false);
  const charactersLeft = POINT_MAX_LENGHT - content.length;
  const canSubmit = selectedCounterpointCandidate
    ? cred > 0
    : charactersLeft >= 0 && content.length >= POINT_MIN_LENGHT && cred > 0;
  const queryClient = useQueryClient();

  const debouncedContent = useDebounce(content, 500);
  const { data: counterpointCandidates, isLoading } = useQuery({
    queryKey: [
      "counterpointCandidates",
      negatedPoint?.id,
      debouncedContent,
    ] as const,
    queryFn: ({ queryKey: [, negatedPointId, counterpointContent] }) =>
      negatedPointId && counterpointContent.length >= POINT_MIN_LENGHT
        ? fetchCounterpointCandidates({
            negatedPointId,
            counterpointContent,
          })
        : [],
  });

  const { data: improvementSuggestionsStream, isLoading: isLoadingImprovements } = useQuery({
    queryKey: ["improvementSuggestions", debouncedContent, negatedPoint?.content],
    queryFn: ({ queryKey: [, query, parentPoint] }: { queryKey: [string, string, string | undefined] }) =>
      debouncedContent.length >= POINT_MIN_LENGHT && parentPoint ? improveNegation(query, parentPoint) : null,
    enabled: !selectedCounterpointCandidate && !suggestionSelected && debouncedContent.length >= POINT_MIN_LENGHT && !!negatedPoint?.content,
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

  useEffect(() => {
    if (!open) {
      setContent("");
      selectCounterpointCandidate(undefined);
      setEditingSuggestion(null);
      setEditedContents(new Map());
      setSuggestionSelected(false);
    }
  }, [open, setContent]);

  return (
    <Dialog {...props} open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:top-xl flex flex-col overflow-auto sm:translate-y-0 h-full rounded-none sm:rounded-md sm:h-fit gap-0  bg-background  p-4 sm:p-8 shadow-sm w-full max-w-xl">
        <div className="w-full flex items-center justify-between mb-xl">
          <DialogTitle hidden>Add a negation</DialogTitle>
          <DialogDescription hidden>
            Add a negation to the Point, or endorse an existing one
          </DialogDescription>
          <DialogClose className="text-primary">
            <ArrowLeftIcon />
          </DialogClose>
        </div>

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
            <div className="flex flex-col">
              <div className="flex flex-col p-4 gap-2 w-full border rounded-md mb-2">
                <span className="flex-grow text-sm">
                  {selectedCounterpointCandidate.content}
                </span>
                <PointStats
                  favor={favor({
                    ...selectedCounterpointCandidate,
                  })}
                  amountNegations={
                    selectedCounterpointCandidate.amountNegations
                  }
                  amountSupporters={
                    selectedCounterpointCandidate.amountSupporters
                  }
                  cred={selectedCounterpointCandidate.cred}
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
                  onClick={() => selectCounterpointCandidate(undefined)}
                >
                  <Undo2Icon />
                </Button>
              </div>
            </div>
          ) : (
            // <div className="@container/counterpoint flex-grow flex flex-col mb-md ">
            //   <p className="tracking-tight text-md  @sm/counterpoint:text-lg mb-sm border rounded-md p-4 ">
            //     {selectedCounterpointCandidate.content}
            //   </p>
            //   <div className="flex justify-between">
            //     <CredInput cred={cred} setCred={setCred} />
            //     <Button
            //       variant={"link"}
            //       size={"icon"}
            //       onClick={() => selectCounterpointCandidate(undefined)}
            //     >
            //       <Undo2Icon />
            //     </Button>
            //   </div>
            // </div>
            <PointEditor
              className="w-full -mt-1"
              content={content}
              setContent={setContent}
              cred={cred}
              setCred={setCred}
              placeholder="Make your negation"
            />
          )}
        </div>
        {!selectedCounterpointCandidate &&
          counterpointCandidates &&
          counterpointCandidates.length > 0 && (
            <>
              <p className="text-xs text-muted-foreground mb-md">
                Make the most of your cred by using an existing similar Point:
              </p>

              {counterpointCandidates?.map((counterpointCandidate) => (
                <div
                  key={counterpointCandidate.id}
                  className="flex p-4 gap-2 hover:bg-accent w-full cursor-pointer border rounded-md mb-2"
                  onClick={() => {
                    selectCounterpointCandidate(counterpointCandidate);
                  }}
                >
                  <BlendIcon className="size-5 shrink-0 text-muted-foreground stroke-1" />
                  <div className="flex flex-col gap-2">
                    <span className="flex-grow text-sm">
                      {counterpointCandidate.content}
                    </span>
                    <PointStats
                      favor={favor({
                        ...counterpointCandidate,
                      })}
                      amountNegations={counterpointCandidate.amountNegations}
                      amountSupporters={counterpointCandidate.amountSupporters}
                      cred={counterpointCandidate.cred}
                    />
                  </div>
                </div>
              ))}
            </>
          )}
        {!selectedCounterpointCandidate && content.length >= POINT_MIN_LENGHT && isLoadingImprovements && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground animate-pulse">
            <span className="size-2 bg-muted-foreground rounded-full animate-bounce" />
            <span>Crafting other phrasings...</span>
          </div>
        )}
        {!selectedCounterpointCandidate && improvementSuggestions.length > 0 && (
          <>
            <p className="text-xs text-muted-foreground mb-md">
              Consider these improved phrasings of your counterpoint:
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
          className="mt-md self-end w-28"
          disabled={!canSubmit}
          onClick={() =>
            (selectedCounterpointCandidate === undefined
              ? addCounterpoint({
                  content,
                  cred,
                  olderPointId: negatedPoint?.id,
                })
              : selectedCounterpointCandidate.isCounterpoint
                ? endorse({ pointId: selectedCounterpointCandidate.id, cred })
                : negate({
                    negatedPointId: negatedPoint!.id,
                    counterpointId: selectedCounterpointCandidate.id,
                    cred,
                  })
            ).then(() => {
              queryClient.invalidateQueries({ queryKey: ["feed"] });
              queryClient.invalidateQueries({
                queryKey: ["point-negations", negatedPoint?.id],
              });
              queryClient.invalidateQueries({
                queryKey: ["favor-history", negatedPoint?.id],
              });

              onOpenChange?.(false);
              setContent("");
              resetCred();
            })
          }
        >
          {selectedCounterpointCandidate?.isCounterpoint ? "Endorse" : "Negate"}
        </Button>
      </DialogContent>
    </Dialog>
  );
};
