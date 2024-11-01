import { addCounterpoint } from "@/actions/addCounterpoint";
import { endorse } from "@/actions/endorse";
import { fetchCounterpointCandidates } from "@/actions/fetchCounterpointCandidates";
import { negate } from "@/actions/negate";
import { CredInput } from "@/components/CredInput";
import { PointEditor } from "@/components/PointEditor";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import { Popover, PopoverContent } from "@/components/ui/popover";
import { POINT_MAX_LENGHT, POINT_MIN_LENGHT } from "@/constants/config";
import { cn } from "@/lib/cn";
import { DialogProps } from "@radix-ui/react-dialog";
import { PopoverAnchor } from "@radix-ui/react-popover";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useDebounce } from "@uidotdev/usehooks";
import { atom, useAtom } from "jotai";
import {
  ArrowLeftIcon,
  CircleDotIcon,
  CircleXIcon,
  DiscIcon,
  Undo2Icon,
} from "lucide-react";
import { FC, useEffect, useState } from "react";

export const negationContentAtom = atom<string>("");
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
  const [counterpointCandidate, setCounterpointCandidate] = useState<
    Awaited<ReturnType<typeof fetchCounterpointCandidates>>[number] | undefined
  >(undefined);
  const charactersLeft = POINT_MAX_LENGHT - content.length;
  const canSubmit = counterpointCandidate
    ? cred > 0
    : charactersLeft >= 0 && content.length >= POINT_MIN_LENGHT && cred > 0;
  const queryClient = useQueryClient();

  const debouncedContent = useDebounce(content, 500);
  const { data: counterpointCandidates, isLoading } = useQuery({
    queryKey: ["counterpointCandidates", negatedPoint?.id, debouncedContent],
    queryFn: ({ queryKey: [, negatedPointId, counterpointContent] }) =>
      debouncedContent.length >= POINT_MIN_LENGHT
        ? fetchCounterpointCandidates({
            negatedPointId: negatedPointId as number,
            counterpointContent: counterpointContent as string,
          })
        : [],
  });

  const [popoverOpen, setPopoverOpen] = useState(false);
  useEffect(() => {
    if (counterpointCandidates?.length && counterpointCandidates.length > 0) {
      setPopoverOpen(true);
    }
  }, [counterpointCandidates]);

  useEffect(() => {
    if (!open) {
      setContent("");
      setCred(0);
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

          <Button
            disabled={!canSubmit}
            onClick={() =>
              (counterpointCandidate === undefined
                ? addCounterpoint({
                    content,
                    cred,
                    olderPointId: negatedPoint?.id,
                  })
                : counterpointCandidate.isCounterpoint
                  ? endorse({ pointId: counterpointCandidate.id, cred })
                  : negate({
                      negatedPointId: negatedPoint!.id,
                      counterpointId: counterpointCandidate.id,
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
            {counterpointCandidate?.isCounterpoint ? "Endorse" : "Negate"}
          </Button>
        </div>

        <div className="flex w-full gap-md">
          <div className="flex flex-col  items-center">
            <CircleDotIcon className="shrink-0 size-6 stroke-1 text-muted-foreground " />
            <div
              className={cn(
                "w-px -my-px flex-grow border-l border-muted-foreground",
                (!counterpointCandidate ||
                  !counterpointCandidate.isCounterpoint) &&
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
        <div className="flex w-full gap-md">
          <div className="flex flex-col  items-center">
            <CircleXIcon
              className={cn(
                "shrink-0 size-6 stroke-1 text-muted-foreground",
                !counterpointCandidate && "circle-dashed-2 text-endorsed"
              )}
            />
            {cred > 0 && (
              <span className="relative text-endorsed text-xs">
                <span className="absolute -left-2">+</span>
                {cred}
              </span>
            )}
          </div>

          <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverAnchor className="w-full">
              {counterpointCandidate ? (
                <div className="@container/counterpoint flex-grow flex flex-col mb-md ">
                  <p className="tracking-tight text-md  @sm/counterpoint:text-lg mb-sm border rounded-md p-4 ">
                    {counterpointCandidate.content}
                  </p>
                  <div className="flex justify-between">
                    <CredInput cred={cred} setCred={setCred} />
                    <Button
                      variant={"link"}
                      size={"icon"}
                      onClick={() => setCounterpointCandidate(undefined)}
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
                  placeholder="Make your negation"
                />
              )}
            </PopoverAnchor>
            <PopoverContent
              onOpenAutoFocus={(e) => e.preventDefault()}
              className="flex flex-col items-center divide-y p-0 overflow-clip "
              style={{ width: "var(--radix-popover-trigger-width)" }}
            >
              {isLoading && <Loader className="my-3" />}
              {counterpointCandidates?.length === 0 && (
                <div className="p-4 text-muted-foreground">
                  No similar points found
                </div>
              )}
              {counterpointCandidates?.map((counterpointCandidate) => (
                <div
                  key={counterpointCandidate.id}
                  className="flex p-4 gap-2 hover:bg-accent w-full cursor-pointer"
                  onClick={() => {
                    setCounterpointCandidate(counterpointCandidate);
                    setPopoverOpen(false);
                  }}
                >
                  {counterpointCandidate.isCounterpoint ? (
                    <CircleXIcon className="size-6 shrink-0 text-muted-foreground stroke-1" />
                  ) : (
                    <DiscIcon className="size-6 shrink-0 text-muted-foreground stroke-1" />
                  )}
                  <span className="flex-grow">
                    {counterpointCandidate.content}
                  </span>
                </div>
              ))}
            </PopoverContent>
          </Popover>
        </div>
      </DialogContent>
    </Dialog>
  );
};
