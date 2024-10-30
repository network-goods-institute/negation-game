import { addCounterpoint } from "@/actions/addCounterpoint";
import { PointEditor } from "@/components/PointEditor";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { POINT_MAX_LENGHT, POINT_MIN_LENGHT } from "@/constants/config";
import { DialogProps } from "@radix-ui/react-dialog";
import { useQueryClient } from "@tanstack/react-query";
import { atom, useAtom } from "jotai";
import { ArrowLeftIcon, CircleDotIcon, CircleXIcon } from "lucide-react";
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
  const charactersLeft = POINT_MAX_LENGHT - content.length;
  const canSubmit = charactersLeft >= 0 && content.length >= POINT_MIN_LENGHT;
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!open) {
      setContent("");
      setCred(0);
    }
  }, [open, setContent]);
  return (
    <Dialog {...props} open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:top-xl flex flex-col overflow-auto sm:translate-y-0 h-screen rounded-none sm:rounded-md sm:h-fit gap-0  bg-background  p-4 sm:p-8 shadow-sm w-full max-w-xl">
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
              addCounterpoint({
                content,
                cred,
                olderPointId: negatedPoint?.id,
              }).then(() => {
                queryClient.invalidateQueries({ queryKey: ["feed"] });
                onOpenChange?.(false);
                setContent("");
                setCred(0);
              })
            }
          >
            Negate
          </Button>
        </div>

        <div className="flex w-full gap-md">
          <div className="flex flex-col  items-center">
            <CircleDotIcon className="shrink-0 size-6 stroke-1 text-muted-foreground " />
            <div className="w-px my-[-2px]  flex-grow bg-muted-foreground" />
          </div>
          <div className="@container/point flex-grow flex flex-col mb-md pt-1">
            <p className="tracking-tight text-md  @sm/point:text-lg mb-lg -mt-2">
              {negatedPoint?.content}
            </p>
          </div>
        </div>
        <div className="flex w-full gap-md">
          <div className="flex flex-col  items-center">
            <CircleXIcon className="shrink-0 size-6 stroke-1 text-muted-foreground " />
            {/* <div className="w-px my-[-2px] flex-grow bg-muted-foreground" />
            <CircleXIcon className="shrink-0 size-6 no-scaling-stroke circle-dashed-3 text-muted-foreground stroke-2" /> */}
          </div>
          <PointEditor
            content={content}
            setContent={setContent}
            cred={cred}
            setCred={setCred}
            placeholder="Make your negation"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};
