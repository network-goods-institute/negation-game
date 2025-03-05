import { hoveredPointIdAtom } from "@/atoms/hoveredPointIdAtom";
import { CredInput } from "@/components/CredInput";
import { PointStats } from "@/components/PointStats";
import { DoubtIcon } from "@/components/icons/DoubtIcon";
import { EndorseIcon } from "@/components/icons/EndorseIcon";
import { NegateIcon } from "@/components/icons/NegateIcon";
import { RestakeIcon } from "@/components/icons/RestakeIcon";
import { PointIcon, PinnedIcon, FeedCommandIcon } from "@/components/icons/AppIcons";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useCredInput } from "@/hooks/useCredInput";
import { usePrefetchRestakeData } from "@/hooks/usePrefetchRestakeData";
import { useVisitedPoints } from "@/hooks/useVisitedPoints";
import { cn } from "@/lib/cn";
import { useEndorse } from "@/mutations/useEndorse";
import { useUser } from "@/queries/useUser";
import { useUserEndorsement } from "@/queries/useUserEndorsements";
import { usePrivy } from "@privy-io/react-auth";
import { useToggle } from "@uidotdev/usehooks";
import { useAtom } from "jotai";
import { CircleIcon } from "lucide-react";
import { Portal } from "@radix-ui/react-portal";
import {
  HTMLAttributes,
  MouseEventHandler,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { AuthenticatedActionButton, Button } from "./ui/button";
import { encodeId } from "@/lib/encodeId";
import { useRouter } from "next/navigation";

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
  space?: string;
  originalPosterId?: string;
  isCommand?: boolean;
  isPinned?: boolean;
  pinnedCommandPointId?: number;
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
  space,
  originalPosterId,
  isCommand,
  isPinned,
  pinnedCommandPointId,
  ...props
}: PointCardProps) => {
  const { mutateAsync: endorse, isPending: isEndorsing } = useEndorse();

  const { data: originalPoster } = useUser(originalPosterId);
  const { data: opCred } = useUserEndorsement(originalPosterId, pointId);

  const endorsedByOp = opCred && opCred > 0;
  const [isOPTooltipOpen, toggleOPTooltip] = useToggle();

  const [_, setHoveredPointId] = useAtom(hoveredPointIdAtom);
  const endorsedByViewer =
    viewerContext?.viewerCred !== undefined && viewerContext.viewerCred > 0;
  const { user: privyUser, login } = usePrivy();
  const [endorsePopoverOpen, toggleEndorsePopoverOpen] = useToggle(false);
  const { credInput, setCredInput, notEnoughCred } = useCredInput({
    resetWhen: !endorsePopoverOpen,
  });
  const prefetchRestakeData = usePrefetchRestakeData();
  const { isVisited, markPointAsRead } = useVisitedPoints();
  const [visited, setVisited] = useState(true);
  const router = useRouter();

  const [restakePercentage, isOverHundred] = useMemo(() => {
    if (!isNegation || !parentPoint || !restake?.amount || !restake.isOwner)
      return [0, false];
    const rawPercentage =
      (restake.amount / (parentPoint.viewerCred || 1)) * 100;
    return [Math.min(100, Math.round(rawPercentage)), rawPercentage > 100];
  }, [isNegation, parentPoint, restake]);

  const doubtPercentage = useMemo(() => {
    if (
      !isNegation ||
      !totalRestakeAmount ||
      !doubt?.amount ||
      !doubt.isUserDoubt
    ) {
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

  // Only check visited state once on mount
  useEffect(() => {
    let mounted = true;
    isVisited(pointId).then((result) => {
      if (mounted && !result) {  // Only update state if not visited and component still mounted
        setVisited(false);
      }
    });
    return () => { mounted = false; };
  }, [pointId, isVisited]);

  const parsePinCommand = useMemo(() => {
    // Prevent showing pin commands when space is undefined or global
    if (!space || space === 'global' || !isCommand) {
      return null;
    }

    // Check if content exists and is a pin command
    if (!content || !content.startsWith('/pin ')) {
      return null;
    }

    const parts = content.split(' ').filter(Boolean);
    if (parts.length < 2) {
      return null;
    }

    return parts[1];
  }, [isCommand, content, space]);

  const handleTargetPointClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (parsePinCommand && space && space !== 'global') {
      router.push(`/s/${space}/${parsePinCommand}`);
    }
  };

  const handleCommandClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (pinnedCommandPointId && space && space !== 'global') {
      router.push(`/s/${space}/${encodeId(pinnedCommandPointId)}`);
    }
  };

  return (
    <div
      className={cn(
        "@container/point flex gap-3 pt-4 pb-3 px-4 relative rounded-none",
        isPinned && "border-l-4 border-primary",
        className
      )}
      onMouseOver={() => {
        setHoveredPointId(pointId);
        handleRestakeHover();
      }}
      onMouseLeave={() => setHoveredPointId(undefined)}
      {...props}
    >
      <div className="flex flex-col flex-grow w-full min-w-0">
        <div className="flex items-start gap-2">
          {isCommand && space && space !== 'global' ? (
            <FeedCommandIcon />
          ) : isPinned && space && space !== 'global' ? (
            <PinnedIcon />
          ) : (
            <PointIcon />
          )}
          <div className="tracking-tight text-md @xs/point:text-md @sm/point:text-lg -mt-1 mb-sm select-text flex-1 break-words whitespace-normal overflow-hidden">
            {content}
            {/* Never show command badges when space is undefined */}
            {pinnedCommandPointId && space && space !== 'global' && (
              <Badge variant="outline" className="ml-2 text-xs">
                <Button
                  type="button"
                  variant="link"
                  className="h-auto p-0 text-muted-foreground hover:text-foreground"
                  onClick={handleCommandClick}
                >
                  Pinned by command
                </Button>
              </Badge>
            )}
            {parsePinCommand && space && space !== 'global' && (
              <Badge variant="outline" className="ml-2 text-xs">
                <Button
                  type="button"
                  variant="link"
                  className="h-auto p-0 text-muted-foreground hover:text-foreground"
                  onClick={handleTargetPointClick}
                >
                  Proposal to pin
                </Button>
              </Badge>
            )}
          </div>
        </div>

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
                    "p-1 pb-3 -mb-2 rounded-full size-fit hover:bg-purple-500/30",
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
                    "p-1 pb-3 -mb-2 rounded-full size-fit hover:bg-amber-500/30",
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
      {endorsedByOp && (
        <Tooltip
          open={isOPTooltipOpen}
          onOpenChange={toggleOPTooltip}
          delayDuration={0}
        >
          <TooltipTrigger asChild>
            <Badge
              className="absolute hover:bg-yellow-600 bottom-1.5 right-1.5 text-yellow-500 text-xs font-medium bg-yellow-500/80 text-background dark:font-bold leading-none px-1 py-0.5 rounded-[6px] align-middle"
              onClick={() => toggleOPTooltip()}
            >
              {opCred} cred
            </Badge>
          </TooltipTrigger>
          <Portal>
            <TooltipContent
              side="top"
              align="center"
              sideOffset={5}
              className="z-[100]"
            >
              <p>
                Endorsed by{" "}
                <strong className="text-yellow-500">
                  {originalPoster ? originalPoster.username : "poster"}{" "}
                </strong>{" "}
                with {opCred} cred
              </p>
            </TooltipContent>
          </Portal>
        </Tooltip>
      )}
      {visited === false && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                markPointAsRead(pointId);
                setVisited(true);
              }}
              className="absolute top-3 right-3 p-2 -m-2 rounded-full hover:bg-accent"
            >
              <CircleIcon className="size-4 fill-endorsed text-endorsed animate-pulse" />
            </button>
          </TooltipTrigger>
          <Portal>
            <TooltipContent
              side="top"
              align="center"
              sideOffset={5}
              className="z-[100]"
            >
              <p>You haven&apos;t viewed this point, yet. Tap to mark seen</p>
            </TooltipContent>
          </Portal>
        </Tooltip>
      )}
      {props.children}
    </div>
  );
};
