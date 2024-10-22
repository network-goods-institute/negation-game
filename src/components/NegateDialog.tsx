import { addCounterpoint } from "@/actions/addCounterpoint";
import { AutosizeTextarea } from "@/components/ui/autosize-textarea";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { POINT_MAX_LENGHT, POINT_MIN_LENGHT } from "@/constants/config";
import { cn } from "@/lib/cn";
import { DialogProps } from "@radix-ui/react-dialog";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeftIcon, CircleDotIcon, CircleXIcon } from "lucide-react";
import { FC, useState } from "react";

export interface NegateDialogProps extends DialogProps {
  negatedPoint?: { id: number; content: string; createdAt: Date };
}

export const NegateDialog: FC<NegateDialogProps> = ({
  negatedPoint,
  onOpenChange,
  ...props
}) => {
  const [content, setContent] = useState("");
  const [cred, setCred] = useState<"0" | "1" | "5" | "10">("0");
  const charactersLeft = POINT_MAX_LENGHT - content.length;
  const canSubmit = charactersLeft >= 0 && content.length >= POINT_MIN_LENGHT;
  const { invalidateQueries } = useQueryClient();
  return (
    <Dialog {...props} onOpenChange={onOpenChange}>
      <DialogContent className="sm:top-xl flex flex-col overflow-auto sm:translate-y-0 h-screen rounded-none sm:rounded-md sm:h-fit gap-0  bg-background  p-4 sm:p-8 shadow-sm w-full max-w-xl">
        <div className="w-full flex items-center justify-between mb-xl">
          <DialogClose className="text-primary">
            <ArrowLeftIcon />
          </DialogClose>

          <Button
            disabled={!canSubmit}
            onClick={() =>
              addCounterpoint({
                content,
                cred: Number(cred),
                olderPointId: negatedPoint?.id,
              }).then(() => {
                invalidateQueries({ queryKey: ["feed"] });
                onOpenChange?.(false);
              })
            }
          >
            Negate
          </Button>
        </div>

        <div className="flex w-full gap-md">
          <div className="flex flex-col  items-center">
            <CircleDotIcon className="shrink-0 size-8 no-scaling-stroke text-muted-foreground stroke-1" />
            <div className="w-px my-[-2px]  flex-grow bg-muted-foreground" />
          </div>
          <div className="@container/point flex-grow flex flex-col mb-md pt-1">
            <p className="tracking-tight text-md  @sm/point:text-lg mb-lg">
              {negatedPoint?.content}
            </p>
          </div>
        </div>
        <div className="flex w-full gap-md">
          <div className="flex flex-col  items-center">
            <CircleXIcon className="shrink-0 size-8 no-scaling-stroke text-muted-foreground stroke-1" />
            {/* <div className="w-px my-[-2px] flex-grow bg-muted-foreground" />
            <CircleXIcon className="shrink-0 size-6 no-scaling-stroke circle-dashed-3 text-muted-foreground stroke-2" /> */}
          </div>
          <div className="flex-grow flex flex-col gap-2 pt-1">
            <AutosizeTextarea
              value={content}
              style={{ height: "46px" }}
              onChange={(e) => setContent(e.target.value.replace(/\n/g, ""))}
              autoFocus
              className="w-full rounded-none !ring-0 tracking-tight text-md border-none @sm/point:text-lg p-2 -ml-2 -mt-2 "
              placeholder="Make your Negation"
            />
            <Separator className="w-full" />
            <div className="flex w-full justify-between items-end">
              <div className="flex items-center  gap-sm">
                <ToggleGroup
                  type="single"
                  value={cred}
                  onValueChange={(value: "1" | "5" | "10") =>
                    value === cred ? setCred("0") : setCred(value)
                  }
                >
                  {[1, 5, 10].map((value) => (
                    <ToggleGroupItem
                      key={`${value}-cred`}
                      value={value.toString()}
                      className={cn(
                        "group gap-xs font-normal text-muted-foreground rounded-full text-center size-8",
                        "data-[state=on]:w-fit  data-[state=on]:text-endorsed data-[state=on]:bg-background data-[state=on]:border"
                      )}
                    >
                      {value}
                      <span className="hidden group-data-[state=on]:inline">
                        cred
                      </span>
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </div>
              <div className="flex gap-sm items-center">
                <span
                  className={cn(
                    charactersLeft >= 0
                      ? "text-muted-foreground"
                      : "text-destructive"
                  )}
                >
                  {charactersLeft}
                </span>
                <svg className="size-8" viewBox="0 0 120 120">
                  <circle
                    cx="60"
                    cy="60"
                    r="54"
                    stroke="hsl(var(--muted))"
                    strokeWidth="12"
                    fill="none"
                  />

                  <circle
                    cx="60"
                    cy="60"
                    r="54"
                    stroke="hsl(var(--primary) / .5)"
                    strokeWidth="12"
                    strokeLinecap="round"
                    fill="none"
                    strokeDasharray="339.292"
                    strokeDashoffset={
                      2 *
                      Math.PI *
                      54 *
                      (1 - POINT_MIN_LENGHT / POINT_MAX_LENGHT)
                    }
                    transform="rotate(-90 60 60)"
                  />

                  <circle
                    cx="60"
                    cy="60"
                    r="54"
                    stroke="hsl(var(--primary))"
                    strokeWidth="12"
                    strokeLinecap="round"
                    fill="none"
                    strokeDasharray="339.292"
                    strokeDashoffset={
                      2 *
                      Math.PI *
                      54 *
                      (Math.max(0, charactersLeft) / POINT_MAX_LENGHT)
                    }
                    transform="rotate(-90 60 60)"
                  />
                  <circle
                    cx="60"
                    cy="60"
                    r="54"
                    stroke="hsl(var(--destructive))"
                    strokeWidth="12"
                    strokeLinecap="round"
                    fill="none"
                    strokeDasharray="339.292"
                    strokeDashoffset={
                      2 *
                      Math.PI *
                      54 *
                      Math.max(
                        0,
                        1 + Math.min(0, charactersLeft) / POINT_MAX_LENGHT
                      )
                    }
                    transform="rotate(-90 60 60)"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
