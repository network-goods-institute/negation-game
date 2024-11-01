import { addCounterpoint } from "@/actions/addCounterpoint";
import { endorse } from "@/actions/endorse";
import { fetchCounterpointCandidates } from "@/actions/fetchCounterpointCandidates";
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
  const [cred, setCred] = useState<number>(0);
  const [selectedCounterpointCandidate, selectCounterpointCandidate] = useState<
    Awaited<ReturnType<typeof fetchCounterpointCandidates>>[number] | undefined
  >(undefined);
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

  useEffect(() => {
    if (!open) {
      setContent("");
      setCred(0);
      selectCounterpointCandidate(undefined);
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
                <CredInput cred={cred} setCred={setCred} />
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
              onOpenChange?.(false);
              setContent("");
              setCred(0);
            })
          }
        >
          {selectedCounterpointCandidate?.isCounterpoint ? "Endorse" : "Negate"}
        </Button>
      </DialogContent>
    </Dialog>
  );
};
