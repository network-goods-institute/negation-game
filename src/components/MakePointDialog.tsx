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
import { Popover, PopoverContent } from "@/components/ui/popover";
import { POINT_MAX_LENGHT, POINT_MIN_LENGHT } from "@/constants/config";
import { useUser } from "@/hooks/useUser";
import { DialogProps } from "@radix-ui/react-dialog";
import { PopoverAnchor } from "@radix-ui/react-popover";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useDebounce } from "@uidotdev/usehooks";
import {
  ArrowLeftIcon,
  CircleDotIcon,
  CircleEqualIcon,
  Loader,
} from "lucide-react";
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
    if (similarPoints?.length) {
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
              })
            }
          >
            Make your point
          </Button>
        </div>

        <div className="flex w-full gap-md">
          <CircleDotIcon className="size-8 text-muted-foreground" />

          <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverAnchor asChild>
              <PointEditor
                className="w-full"
                content={content}
                setContent={setContent}
                cred={cred}
                setCred={setCred}
              />
            </PopoverAnchor>
            <PopoverContent className="flex flex-col">
              {isLoading && <Loader />}
              {similarPoints?.length === 0 && (
                <div className="p-4 text-muted-foreground">
                  No similar points found
                </div>
              )}
              {similarPoints?.map((point) => (
                <div key={point.id} className="flex p-4 gap-4">
                  <CircleEqualIcon className="size-6  text-muted-foreground " />
                  <span>{point.content}</span>
                </div>
              ))}
            </PopoverContent>
          </Popover>
        </div>
      </DialogContent>
    </Dialog>
  );
};
