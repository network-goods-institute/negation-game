import { cn } from "@/lib/cn";
import { HTMLAttributes, MouseEventHandler, useMemo } from "react";
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
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useToggle } from "@uidotdev/usehooks";
import { useRouter } from "next/navigation";
import { RestakeIcon } from "@/components/icons/RestakeIcon";
import { DoubtIcon } from "@/components/icons/DoubtIcon";
import { fetchDoubtForRestake } from "@/actions/fetchDoubtForRestake";

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
    viewerCred?: number;
    amountSupporters: number;
    amountNegations: number;
    negationsCred: number;
  };
  onRestake?: (options: { openedFromSlashedIcon: boolean }) => void;
  negationId?: number;
  restake?: {
    id: number | null;
    amount: number;
    active: boolean;
    isOwner: boolean;
    totalRestakeAmount: number;
    originalAmount?: number | null;
    slashedAmount: number;
    doubtedAmount: number;
  } | null;
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
  onRestake,
  negationId,
  restake,
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

  const restakePercentage = useMemo(() => {
    if (!isNegation || !parentPoint || !restake?.amount) return 0;
    return Math.round((restake.amount / (parentPoint.viewerCred || 1)) * 100);
  }, [isNegation, parentPoint, restake]);

  const { data: existingDoubt } = useQuery({
    queryKey: ['doubt', parentPoint?.id, pointId],
    queryFn: () => parentPoint?.id ? fetchDoubtForRestake(parentPoint.id, pointId) : null,
    enabled: !!parentPoint?.id && !!pointId,
    staleTime: 1000 * 60 * 5 // 5 minutes
  });

  const doubtPercentage = useMemo(() => {
    if (!isNegation || !restake?.amount || !existingDoubt?.amount) return 0;
    
    const totalRestaked = restake.totalRestakeAmount;
    return Math.floor((existingDoubt.amount / totalRestaked) * 100);
  }, [isNegation, restake, existingDoubt]);

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
                    className={cn(
                      "p-1 -mb-2 rounded-full size-fit hover:bg-muted/30",
                      restake?.isOwner && restake?.amount && "text-endorsed"
                    )}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onRestake?.({openedFromSlashedIcon: false});
                    }}
                  >
                    <RestakeIcon 
                      className={cn(
                        "size-5 stroke-1",
                        restake?.isOwner && restake?.amount && "fill-current text-endorsed"
                      )}
                      showPercentage={restake?.isOwner && !!restake?.amount}
                      percentage={restakePercentage}
                    />
                  </Button>
                  <Button
                    variant="ghost"
                    className={cn(
                      "p-1 -mb-2 rounded-full size-fit hover:bg-muted/30",
                      existingDoubt?.isUserDoubt && "text-endorsed"
                    )}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onRestake?.({openedFromSlashedIcon: true});
                    }}
                  >
                    <div className="flex items-center translate-y-[5px]">
                      <DoubtIcon 
                        className={cn(
                          "size-5 stroke-1",
                          existingDoubt?.isUserDoubt && "fill-current"
                        )} 
                        isFilled={existingDoubt?.isUserDoubt}
                      />
                      {existingDoubt?.isUserDoubt && (
                        <span className="ml-1">{doubtPercentage}%</span>
                      )}
                    </div>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
