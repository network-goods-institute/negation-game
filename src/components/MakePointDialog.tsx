import { fetchSimilarPoints } from "@/actions/fetchSimilarPoints";
import { makePoint } from "@/actions/makePoint";
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
import { useUser } from "@/hooks/useUser";
import { encodeId } from "@/lib/encodeId";
import { DialogProps } from "@radix-ui/react-dialog";
import { PopoverAnchor } from "@radix-ui/react-popover";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useDebounce } from "@uidotdev/usehooks";
import { ArrowLeftIcon, CircleEqualIcon, DiscIcon } from "lucide-react";
import { FC, useEffect, useState } from "react";

export interface MakePointDialogProps extends DialogProps {}

export const MakePointDialog: FC<MakePointDialogProps> = ({
  onOpenChange,
  ...props
}) => {
  const [content, setContent] = useState("");
  const [cred, setCred] = useState<number>(0);
  const charactersLeft = POINT_MAX_LENGHT - content.length;
  const { data: user } = useUser();
  const canSubmit =
    user &&
    user.cred >= cred &&
    charactersLeft >= 0 &&
    content.length >= POINT_MIN_LENGHT;
  const queryClient = useQueryClient();
  const debouncedContent = useDebounce(content, 500);
  const { data: similarPoints, isLoading } = useQuery({
    queryKey: ["similarPoints", debouncedContent],
    queryFn: ({ queryKey: [, query] }) =>
      debouncedContent.length >= POINT_MIN_LENGHT
        ? fetchSimilarPoints({ query })
        : [],
  });

  const [popoverOpen, setPopoverOpen] = useState(false);
  useEffect(() => {
    if (similarPoints?.length && similarPoints.length > 0) {
      setPopoverOpen(true);
    }
  }, [similarPoints]);
  return (
    <Dialog {...props} onOpenChange={onOpenChange}>
      <DialogContent className="sm:top-xl flex flex-col overflow-auto sm:translate-y-0 h-screen rounded-none sm:rounded-md sm:h-fit gap-0  bg-background p-4 sm:p-8 shadow-sm w-full max-w-xl">
        <div className="w-full flex items-center justify-between mb-xl">
          <DialogTitle hidden>Make a Point</DialogTitle>
          <DialogDescription hidden>
            Create a new Point and endorse it with some cred
          </DialogDescription>
          <DialogClose className="text-primary">
            <ArrowLeftIcon />
          </DialogClose>

          <Button
            disabled={!canSubmit}
            onClick={() =>
              makePoint({
                content,
                cred: Number(cred),
              }).then(() => {
                queryClient.invalidateQueries({
                  queryKey: ["feed"],
                  exact: false,
                });
                onOpenChange?.(false);
                setContent("");
                setCred(0);
              })
            }
          >
            Make your point
          </Button>
        </div>

        <div className="flex w-full gap-md">
          <DiscIcon className="size-6 text-muted-foreground stroke-1" />

          <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverAnchor className="w-full">
              <PointEditor
                className="w-full -mt-1"
                content={content}
                setContent={setContent}
                cred={cred}
                setCred={setCred}
              />
            </PopoverAnchor>
            <PopoverContent
              onOpenAutoFocus={(e) => e.preventDefault()}
              className="flex flex-col items-center divide-y p-0 overflow-clip "
              style={{ width: "var(--radix-popover-trigger-width)" }}
            >
              {isLoading && <Loader className="my-3" />}
              {similarPoints?.length === 0 && (
                <div className="p-4 text-muted-foreground">
                  No similar points found
                </div>
              )}
              {similarPoints?.map((point) => (
                <a
                  key={point.id}
                  className="flex p-4 gap-2 hover:bg-accent w-full"
                  href={`/${encodeId(point.id)}`}
                >
                  <CircleEqualIcon className="size-6 shrink-0 text-muted-foreground stroke-1" />
                  <span className="flex-grow">{point.content}</span>
                </a>
              ))}
            </PopoverContent>
          </Popover>
        </div>
      </DialogContent>
    </Dialog>
  );
};
