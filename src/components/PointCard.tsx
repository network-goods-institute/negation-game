import { hoveredPointIdAtom } from "@/atoms/hoveredPointIdAtom";
import { CredInput } from "@/components/CredInput";
import { DoubtIcon } from "@/components/icons/DoubtIcon";
import { EndorseIcon } from "@/components/icons/EndorseIcon";
import { NegateIcon } from "@/components/icons/NegateIcon";
import { RestakeIcon } from "@/components/icons/RestakeIcon";
import { PointStats } from "@/components/PointStats";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useCredInput } from "@/hooks/useCredInput";
import { usePrefetchRestakeData } from "@/hooks/usePrefetchRestakeData";
import { cn } from "@/lib/cn";
import { useEndorse } from "@/mutations/useEndorse";
import { usePrivy } from "@privy-io/react-auth";
import { useToggle } from "@uidotdev/usehooks";
import { useAtom } from "jotai";
import { HTMLAttributes, MouseEventHandler, useCallback, useMemo } from "react";
import { AuthenticatedActionButton, Button } from "./ui/button";

export interface PointCardProps extends HTMLAttributes<HTMLDivElement> {
  pointId: number;
  content: string;
  createdAt: Date;
  cred: number;
  favor: number;
  amountSupporters: number;
  amountNegations: number;
  viewerContext?: {
    viewerCred?: number;
  };
  onNegate?: MouseEventHandler<HTMLButtonElement>;
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
    stakedAmount: number;
  };
  onRestake?: (options: { openedFromSlashedIcon: boolean }) => void;
  negationId?: number;
  restake?: {
    id: number | null;
    amount: number;
    originalAmount: number;
    slashedAmount: number;
    doubtedAmount: number;
    isOwner: boolean;
    effectiveAmount?: number;
  } | null;
  totalRestakeAmount?: number;
  doubt?: {
    id: number;
    amount: number;
    userAmount: number;
    isUserDoubt: boolean;
  } | null;
}

export const PointCard = ({
  pointId,
  content,
  createdAt,
  className,
  cred,
  favor,
  amountSupporters,
  amountNegations,
  viewerContext,
  onNegate,
  isNegation,
  parentPoint,
  onRestake,
  negationId,
  restake,
  totalRestakeAmount,
  doubt,
  ...props
}: PointCardProps) => {
  const { mutateAsync: endorse, isPending: isEndorsing } = useEndorse();

  const [_, setHoveredPointId] = useAtom(hoveredPointIdAtom);
  const endorsedByViewer =
    viewerContext?.viewerCred !== undefined && viewerContext.viewerCred > 0;
  const { user: privyUser, login } = usePrivy();
  const [endorsePopoverOpen, toggleEndorsePopoverOpen] = useToggle(false);
  const { credInput, setCredInput, notEnoughCred } = useCredInput({
    resetWhen: !endorsePopoverOpen,
  });
  const prefetchRestakeData = usePrefetchRestakeData();

  const [restakePercentage, isOverHundred] = useMemo(() => {
    if (!isNegation || !parentPoint || !restake?.amount || !restake.isOwner)
      return [0, false];
    const rawPercentage =
      (restake.amount / (parentPoint.viewerCred || 1)) * 100;
    return [Math.min(100, Math.round(rawPercentage)), rawPercentage > 100];
  }, [isNegation, parentPoint, restake]);

  const doubtPercentage = useMemo(() => {

    if (!isNegation || !totalRestakeAmount || !doubt?.amount || !doubt.isUserDoubt) {
      return 0;
    }

    const rawPercentage = (doubt.userAmount / totalRestakeAmount) * 100;

    const result = Math.min(100, Math.round(rawPercentage));

    return result;
  }, [isNegation, totalRestakeAmount, doubt]);

  const handleRestakeHover = useCallback(() => {
    if (isNegation && parentPoint?.id && negationId) {
      prefetchRestakeData(parentPoint.id, negationId);
    }
  }, [isNegation, parentPoint?.id, negationId, prefetchRestakeData]);

  const showRestakeAmount = useMemo(() => {
    if (!restake) return false;

    if (restake.slashedAmount >= restake.originalAmount) return false;

    return restake.amount > 0;
  }, [restake]);

  return (
    <div
      className={cn(
        "@container/point flex gap-3 pt-4 pb-3 px-4 relative rounded-none",
        className
      )}
      onMouseOver={() => {
        setHoveredPointId(pointId);
        handleRestakeHover();
      }}
      onMouseLeave={() => setHoveredPointId(undefined)}
      {...props}
    >
      <div className="flex flex-col">
        <p className="tracking-tight text-md @xs/point:text-md @sm/point:text-lg mb-xs -mt-1 select-text">
          {content}
        </p>

        <PointStats
          className="mb-md select-text"
          amountNegations={amountNegations}
          amountSupporters={amountSupporters}
          favor={favor}
          cred={cred}
        />

        <div className="flex gap-sm w-full text-muted-foreground">
          <div className="flex gap-sm">
            <AuthenticatedActionButton
              variant="ghost"
              className="p-1 -ml-3 -mb-2 rounded-full size-fit hover:bg-negated/30"
              onClick={(e) => {
                e.stopPropagation();
                onNegate?.(e);
              }}
            >
              <NegateIcon />
            </AuthenticatedActionButton>

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
                    credInput={credInput}
                    setCredInput={setCredInput}
                    notEnoughCred={notEnoughCred}
                  />
                  <Button
                    disabled={credInput === 0 || notEnoughCred || isEndorsing}
                    onClick={() => {
                      endorse({ pointId, cred: credInput }).then(() => {
                        toggleEndorsePopoverOpen(false);
                      });
                    }}
                  >
                    {isEndorsing ? (
                      <div className="flex items-center gap-2">
                        <span className="size-4 border-2 border-background border-t-transparent rounded-full animate-spin" />
                        <span>Endorsing...</span>
                      </div>
                    ) : (
                      "Endorse"
                    )}
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
                    showRestakeAmount && "text-endorsed"
                  )}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onRestake?.({ openedFromSlashedIcon: false });
                  }}
                  onMouseEnter={handleRestakeHover}
                >
                  <RestakeIcon
                    className={cn(
                      "size-5 stroke-1",
                      "text-muted-foreground hover:text-foreground transition-colors",
                      showRestakeAmount &&
                      restake?.isOwner &&
                      "text-endorsed fill-current"
                    )}
                    showPercentage={showRestakeAmount && restake?.isOwner}
                    percentage={restakePercentage}
                  />
                  {showRestakeAmount && isOverHundred && (
                    <span className="ml-1 translate-y-[5px]">+</span>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  className={cn(
                    "p-1 -mb-2 rounded-full size-fit hover:bg-muted/30",
                    doubt?.amount !== undefined &&
                    doubt.amount > 0 &&
                    doubt.isUserDoubt &&
                    "text-endorsed"
                  )}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onRestake?.({ openedFromSlashedIcon: true });
                  }}
                  onMouseEnter={handleRestakeHover}
                >
                  <div className="flex items-center translate-y-[5px]">
                    <DoubtIcon
                      className={cn(
                        "size-5 stroke-1",
                        "text-muted-foreground hover:text-foreground transition-colors",
                        doubt?.amount !== undefined &&
                        doubt.amount > 0 &&
                        doubt.isUserDoubt &&
                        "text-endorsed fill-current"
                      )}
                      isFilled={
                        doubt?.amount !== undefined &&
                        doubt.amount > 0 &&
                        doubt.isUserDoubt
                      }
                    />
                    {doubt?.amount !== undefined &&
                      doubt.amount > 0 &&
                      doubt.isUserDoubt && (
                        <span className="ml-1">
                          {doubtPercentage}
                          {doubtPercentage > 100 && "+"}%
                        </span>
                      )}
                  </div>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
