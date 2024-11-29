import { cn } from "@/lib/cn";
import { HTMLAttributes, MouseEventHandler } from "react";
import { Button } from "./ui/button";

import { endorse } from "@/actions/endorse";
import { CredInput } from "@/components/CredInput";
import { EndorseIcon } from "@/components/icons/EndorseIcon";
import { NegateIcon } from "@/components/icons/NegateIcon";
import { PointStats } from "@/components/PointStats";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useCredInput } from "@/hooks/useCredInput";
import { usePrivy } from "@privy-io/react-auth";
import { useQueryClient } from "@tanstack/react-query";
import { useToggle } from "@uidotdev/usehooks";
import { useRouter } from "next/navigation";
import { Scale, DiamondIcon } from "lucide-react";
import { RestakeDialog } from "@/components/RestakeDialog";

export interface PointCardProps extends HTMLAttributes<HTMLDivElement> {
  pointId: number;
  content: string;
  createdAt: Date;
  totalCred: number;
  favor: number;
  amountSupporters: number;
  amountNegations: number;
  viewerContext?: {
    viewerCred?: number;
  };
  onNegate?: MouseEventHandler<HTMLButtonElement>;
  leftSlot?: React.ReactNode;
  bottomSlot?: React.ReactNode;
  isNegation?: boolean;
  parentPoint?: {
    id: number;
    content: string;
    createdAt: Date;
    cred: number;
  };
}

export const PointCard = ({
  pointId,
  content,
  createdAt,
  className,
  totalCred,
  favor,
  amountSupporters: amountSupporters,
  amountNegations,
  viewerContext,
  onNegate,
  isNegation,
  parentPoint,
  ...props
}: PointCardProps) => {
  const endorsedByViewer =
    viewerContext?.viewerCred !== undefined && viewerContext.viewerCred > 0;

  const { user: privyUser, login } = usePrivy();

  const queryClient = useQueryClient();
  const [endorsePopoverOpen, toggleEndorsePopoverOpen] = useToggle(false);
  const { cred, setCred, notEnoughCred } = useCredInput({
    resetWhen: !endorsePopoverOpen,
  });
  const { push } = useRouter();
  const [restakeDialogOpen, toggleRestakeDialog] = useToggle(false);

  return (
    <>
      <div
        className={cn(
          "@container/point flex gap-3 pt-4 pb-3 px-4 relative rounded-none",
          className
        )}
        {...props}
      >
        <div className="flex flex-col">
          <p className="tracking-tight text-md  @xs/point:text-md @sm/point:text-lg mb-xs -mt-1 select-text">
            {content}
          </p>

          <PointStats
            className="mb-md select-text"
            amountNegations={amountNegations}
            amountSupporters={amountSupporters}
            favor={favor}
            cred={totalCred}
          />

          <div className="flex gap-sm w-full text-muted-foreground">
            <div className="flex gap-sm">
              <Button
                variant="ghost"
                className="p-1 -mb-2 rounded-full size-fit hover:bg-negated/30"
                onClick={(e) => {
                  e.stopPropagation();
                  onNegate?.(e);
                }}
              >
                <NegateIcon />
              </Button>
              <Popover
                open={endorsePopoverOpen}
                onOpenChange={toggleEndorsePopoverOpen}
              >
                <PopoverTrigger asChild>
                  <Button
                    onClick={(e) => {
                      e.preventDefault();
                      if (privyUser === null) {
                        login();
                        return;
                      }
                      toggleEndorsePopoverOpen();
                    }}
                    className={cn(
                      "p-1 rounded-full -mb-2 size-fit gap-sm hover:bg-endorsed/30",
                      endorsedByViewer && "text-endorsed pr-3"
                    )}
                    variant={"ghost"}
                  >
                    <EndorseIcon
                      className={cn(endorsedByViewer && "fill-current")}
                    />{" "}
                    {endorsedByViewer && (
                      <span>{viewerContext.viewerCred} cred</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="flex flex-col items-start w-96"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="w-full flex justify-between">
                    <CredInput
                      cred={cred}
                      setCred={setCred}
                      notEnoughCred={notEnoughCred}
                    />
                    <Button
                      disabled={cred === 0 || notEnoughCred}
                      onClick={() => {
                        endorse({ pointId, cred }).then(() => {
                          queryClient.invalidateQueries({ queryKey: ["feed"] });
                          toggleEndorsePopoverOpen(false);
                        });
                      }}
                    >
                      Endorse
                    </Button>
                  </div>
                  {notEnoughCred && (
                    <span className="ml-md text-destructive text-sm h-fit">
                      not enough cred
                    </span>
                  )}
                </PopoverContent>
              </Popover>
              {isNegation && parentPoint?.cred && parentPoint.cred > 0 && (
                <>
                  <Button
                    variant="ghost"
                    className="p-1 -mb-2 rounded-full size-fit hover:bg-muted/30"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      toggleRestakeDialog(true);
                    }}
                  >
                    <DiamondIcon className="size-7 stroke-1" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {parentPoint && (
        <RestakeDialog
          open={restakeDialogOpen}
          onOpenChange={toggleRestakeDialog}
          originalPoint={{
            ...parentPoint!,
            stakedAmount: parentPoint?.cred || 0
          }}
          counterPoint={{
            id: pointId,
            content,
            createdAt,
          }}
        />
      )}
    </>
  );
};
