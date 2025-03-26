import { hoveredPointIdAtom } from "@/atoms/hoveredPointIdAtom";
import { visitedPointsAtom } from "@/atoms/visitedPointsAtom";
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
import {
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
  Dot,
} from "recharts";
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
  Fragment,
  useRef,
} from "react";
import { AuthenticatedActionButton } from "./ui/AuthenticatedActionButton";
import { Button } from "./ui/button";
import { encodeId } from "@/lib/encodeId";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { ExternalLinkIcon } from "lucide-react";
import { getSpaceFromPathname } from "@/lib/negation-game/getSpaceFromPathname";
import { usePrefetchPoint } from "@/queries/usePointData";
import { useQueryClient } from "@tanstack/react-query";

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
  isPriority?: boolean;
  pinnedCommandPointId?: number;
  pinStatus?: string;
  onPinBadgeClickCapture?: React.MouseEventHandler;
  linkDisabled?: boolean;
  inGraphNode?: boolean;
  inRationale?: boolean;
  favorHistory?: Array<{ timestamp: Date; favor: number; }>;
  disablePopover?: boolean;
  isInPointPage?: boolean;
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
  isPriority,
  pinnedCommandPointId,
  pinStatus,
  onPinBadgeClickCapture,
  linkDisabled,
  inGraphNode,
  inRationale,
  favorHistory: initialFavorHistory,
  disablePopover = !inRationale,
  isInPointPage = false,
  ...props
}: PointCardProps) => {
  const { mutateAsync: endorse, isPending: isEndorsing } = useEndorse();
  const { data: originalPoster } = useUser(originalPosterId);
  const { data: opCred } = useUserEndorsement(originalPosterId, pointId);
  const [isOPTooltipOpen, toggleOPTooltip] = useToggle();
  const [_, setHoveredPointId] = useAtom(hoveredPointIdAtom);
  const { user: privyUser, login } = usePrivy();
  const [endorsePopoverOpen, toggleEndorsePopoverOpen] = useToggle(false);
  const { credInput, setCredInput, notEnoughCred } = useCredInput({
    resetWhen: !endorsePopoverOpen,
  });
  const prefetchRestakeData = usePrefetchRestakeData();
  const { isVisited, markPointAsRead } = useVisitedPoints();
  const [visitedPoints, setVisitedPoints] = useAtom(visitedPointsAtom);
  const router = useRouter();
  const pathname = usePathname();
  const currentSpace = getSpaceFromPathname(pathname);
  const queryClient = useQueryClient();

  const [isOpen, setIsOpen] = useState(false);
  const [isLoadingFavorHistory, setIsLoadingFavorHistory] = useState(false);
  const [popoverFavorHistory, setPopoverFavorHistory] = useState<Array<{ timestamp: Date; favor: number }> | null>(null);

  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const endorsedByViewer = viewerContext?.viewerCred !== undefined && viewerContext.viewerCred > 0;
  const endorsedByOp = opCred && opCred > 0;
  const visited = visitedPoints.has(pointId);

  useEffect(() => {
    if (!disablePopover && pointId && isOpen) {
      setIsLoadingFavorHistory(true);

      const cachedData = queryClient.getQueryData([pointId, "favor-history", "1W"]);
      if (cachedData) {
        setPopoverFavorHistory(cachedData as any);
        setIsLoadingFavorHistory(false);
        return;
      }

      import('@/actions/fetchFavorHistory').then(({ fetchFavorHistory }) => {
        fetchFavorHistory({ pointId, scale: "1W" })
          .then(data => {
            const normalizedData = Array.isArray(data) ? data.map(point => ({
              timestamp: point.timestamp instanceof Date ? point.timestamp : new Date(point.timestamp),
              favor: typeof point.favor === 'number' ? point.favor : 50
            })) : [];

            // Ensure we have at least 2 points to avoid single dots
            const finalData = normalizedData.length === 1
              ? [
                { timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), favor: normalizedData[0].favor },
                normalizedData[0]
              ]
              : normalizedData.length === 0
                ? [
                  { timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), favor },
                  { timestamp: new Date(), favor }
                ]
                : normalizedData;

            queryClient.setQueryData([pointId, "favor-history", "1W"], finalData);
            setPopoverFavorHistory(finalData);
            setIsLoadingFavorHistory(false);
          })
          .catch(err => {
            const fallbackData = [
              { timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), favor },
              { timestamp: new Date(), favor }
            ];
            setPopoverFavorHistory(fallbackData);
            setIsLoadingFavorHistory(false);
          });
      });
    }
  }, [pointId, isOpen, disablePopover, queryClient, favor]);

  // Memoized values
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
    return Math.min(100, Math.round(rawPercentage));
  }, [isNegation, totalRestakeAmount, doubt]);

  const showRestakeAmount = useMemo(() => {
    if (!restake) return false;
    if (restake.slashedAmount >= restake.originalAmount) return false;
    return restake.amount > 0;
  }, [restake]);

  const parsePinCommand = useMemo(() => {
    if (!space || space === 'global' || !isCommand) {
      return null;
    }
    if (!content || !content.startsWith('/pin ')) {
      return null;
    }
    const parts = content.split(' ').filter(Boolean);
    if (parts.length < 2) {
      return null;
    }
    return parts[1];
  }, [isCommand, content, space]);

  const handleHoverStart = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    if (!isOpen && !disablePopover) {
      setIsOpen(true);
    }
  }, [isOpen, disablePopover]);

  const handleHoverEnd = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    hoverTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 300);
  }, []);

  const handleRestakeHover = useCallback(() => {
    if (isNegation && parentPoint?.id && negationId) {
      prefetchRestakeData(parentPoint.id, negationId);
    }
  }, [isNegation, parentPoint?.id, negationId, prefetchRestakeData]);

  const handleTargetPointClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (parsePinCommand && space && space !== 'global') {
      router.push(`/s/${space}/${parsePinCommand}`);
    }
  }, [parsePinCommand, space, router]);

  const handlePinCommandClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (pinnedCommandPointId && router && space && space !== 'global') {
      const encodedCommandId = encodeId(pinnedCommandPointId);
      router.push(`/s/${space}/${encodedCommandId}`);
    }
  }, [pinnedCommandPointId, router, space]);

  const renderCardContent = () => (
    <div
      className={cn(
        "@container/point flex gap-3 pt-4 pb-3 px-4 relative rounded-none will-change-auto",
        isPinned && "border-l-4 border-primary",
        isPriority && !isPinned && "border-l-4 border-amber-400",
        inGraphNode && "pt-2.5",
        className
      )}
      onMouseEnter={() => {
        setHoveredPointId(pointId);
        if (!disablePopover) {
          handleHoverStart();
        }
      }}
      onMouseLeave={() => {
        setHoveredPointId(undefined);
        if (!disablePopover) {
          handleHoverEnd();
        }
      }}
      {...props}
    >
      <div className="flex flex-col flex-grow w-full min-w-0">
        <div className={cn("flex items-start gap-2", inGraphNode && "pt-4")}>
          {isCommand && space && space !== 'global' ? (
            <FeedCommandIcon />
          ) : isPinned && space && space !== 'global' ? (
            <PinnedIcon />
          ) : (
            <PointIcon />
          )}
          <div className="tracking-tight text-md @xs/point:text-md @sm/point:text-lg -mt-1 mb-sm select-text flex-1 break-words whitespace-normal overflow-hidden">
            {content}
            {/* Pin command badges */}
            {pinnedCommandPointId && space && space !== 'global' && (
              <Badge variant="outline" className="ml-2 text-xs">
                {space && !linkDisabled ? (
                  <Link
                    href={`/s/${space}/${encodeId(pinnedCommandPointId)}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onPinBadgeClickCapture) {
                        onPinBadgeClickCapture(e);
                      }
                    }}
                    className="inline-block w-full h-full"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button
                      type="button"
                      variant="link"
                      className="h-auto p-0 text-muted-foreground hover:text-foreground w-full"
                      onClick={handlePinCommandClick}
                    >
                      {pinStatus || "Pinned by command"}
                    </Button>
                  </Link>
                ) : (
                  <Button
                    type="button"
                    variant="link"
                    className="h-auto p-0 text-muted-foreground hover:text-foreground"
                    onClick={handlePinCommandClick}
                  >
                    {pinStatus || "Pinned by command"}
                  </Button>
                )}
              </Badge>
            )}
            {parsePinCommand && space && space !== 'global' && (
              <Badge variant="outline" className="ml-2 text-xs">
                {space && !linkDisabled ? (
                  <Link
                    href={`/s/${space}/${parsePinCommand}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onPinBadgeClickCapture) {
                        onPinBadgeClickCapture(e);
                      }
                    }}
                    className="inline-block w-full h-full"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button
                      type="button"
                      variant="link"
                      className="h-auto p-0 text-muted-foreground hover:text-foreground w-full"
                      onClick={handleTargetPointClick}
                    >
                      Proposal to pin
                    </Button>
                  </Link>
                ) : (
                  <Button
                    type="button"
                    variant="link"
                    className="h-auto p-0 text-muted-foreground hover:text-foreground"
                    onClick={handleTargetPointClick}
                  >
                    Proposal to pin
                  </Button>
                )}
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
                  {endorsedByViewer && viewerContext?.viewerCred && (
                    <span>{viewerContext.viewerCred} cred</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-[320px] p-3"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex flex-col gap-3 w-full">
                  <CredInput
                    credInput={credInput}
                    setCredInput={setCredInput}
                    notEnoughCred={notEnoughCred}
                  />
                  <Button
                    className="w-full"
                    disabled={credInput === 0 || notEnoughCred || isEndorsing}
                    onClick={() => {
                      endorse({ pointId, cred: credInput }).then(() => {
                        toggleEndorsePopoverOpen(false);
                      });
                    }}
                  >
                    {isEndorsing ? (
                      <div className="flex items-center justify-center gap-2">
                        <span className="size-4 border-2 border-background border-t-transparent rounded-full animate-spin" />
                        <span>Endorsing...</span>
                      </div>
                    ) : (
                      "Endorse"
                    )}
                  </Button>
                  {notEnoughCred && (
                    <span className="text-destructive text-sm">
                      Not enough cred
                    </span>
                  )}
                </div>
              </PopoverContent>
            </Popover>

            {inRationale && !inGraphNode && (
              <Link
                href={`/s/${currentSpace || 'global'}/${encodeId(pointId)}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
              >
                <Button
                  variant="ghost"
                  className="p-1 -mb-2 rounded-full size-fit hover:bg-muted"
                >
                  <ExternalLinkIcon className="size-5 translate-y-[2.5px]" />
                </Button>
              </Link>
            )}

            {/* Show restake/doubt icons if this is a negation with a parent point or if we're in a point page */}
            {(isInPointPage || (isNegation && parentPoint?.cred && parentPoint.cred > 0)) && (
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
                >
                  <RestakeIcon
                    className={cn(
                      "size-5 stroke-1",
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
                >
                  <div className="flex items-center translate-y-[5px]">
                    <DoubtIcon
                      className={cn(
                        "size-5 stroke-1",
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
      {!visited && privyUser && (
        <div className="absolute top-0.5 right-3 group flex items-center gap-2">
          <span className="text-sm text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
            Tap to mark seen
          </span>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              markPointAsRead(pointId);
              setVisitedPoints(prev => {
                const newSet = new Set(prev);
                newSet.add(pointId);
                return newSet;
              });
            }}
            className="relative size-3 rounded-full flex items-center justify-center"
          >
            <div className="absolute inset-0 bg-endorsed/20 rounded-full scale-0 group-hover:scale-150 transition-transform" />
            <CircleIcon className="size-full fill-endorsed text-endorsed relative" />
          </button>
        </div>
      )}
      {props.children}
    </div>
  );

  if (disablePopover) {
    return renderCardContent();
  }

  return (
    <Popover
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) setIsOpen(false);
      }}
    >
      <PopoverTrigger asChild>
        {renderCardContent()}
      </PopoverTrigger>
      <Portal>
        <PopoverContent
          className="w-80 sm:w-96 max-h-80 overflow-auto"
          side="right"
          align="start"
          sideOffset={5}
          onMouseEnter={handleHoverStart}
          onMouseLeave={handleHoverEnd}
        >
          <div className="flex flex-col gap-3">
            <div className="flex items-start gap-2">
              {isCommand && space && space !== 'global' ? (
                <FeedCommandIcon />
              ) : isPinned && space && space !== 'global' ? (
                <PinnedIcon />
              ) : (
                <PointIcon />
              )}
              <h3 className="text-lg font-semibold -mt-0.5 break-words">{content}</h3>
            </div>

            <PointStats
              className="mb-md"
              amountNegations={amountNegations}
              amountSupporters={amountSupporters}
              favor={favor}
              cred={cred}
            />

            {/* Favor History Section */}
            {(() => {
              // Choose which data source to use
              const historyToUse = popoverFavorHistory || initialFavorHistory;

              // If we have valid history data
              if (Array.isArray(historyToUse)) {
                // If we only have one point, duplicate it to show a meaningful graph
                const dataPoints = historyToUse.length === 1
                  ? [
                    { timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), favor: historyToUse[0].favor },
                    historyToUse[0]
                  ]
                  : historyToUse;

                // Check if we're using the limited fallback data (only 2 points with same favor)
                const isLimitedHistory = dataPoints.length === 2 &&
                  dataPoints[0].favor === dataPoints[1].favor;

                return (
                  <div className="mt-2">
                    <div className="flex flex-col mb-2">
                      <h4 className="text-sm font-semibold">Favor History</h4>
                      {isLimitedHistory && (
                        <span className="text-xs text-muted-foreground">Limited history available</span>
                      )}
                    </div>
                    <ResponsiveContainer width="100%" height={100}>
                      <LineChart
                        width={300}
                        height={100}
                        data={dataPoints}
                        className="[&>.recharts-surface]:overflow-visible"
                      >
                        <XAxis dataKey="timestamp" hide />
                        <YAxis domain={[0, 100]} hide />
                        <ReferenceLine
                          y={50}
                          className="[&>line]:stroke-muted"
                        ></ReferenceLine>
                        <Line
                          animationDuration={300}
                          dataKey="favor"
                          type="stepAfter"
                          className="overflow-visible text-endorsed"
                          dot={({ key, ...dot }) => {
                            if (dot.index === undefined) {
                              return <Fragment key={key} />;
                            }
                            return dot.index === dataPoints.length - 1 ? (
                              <Fragment key={key}>
                                <Dot
                                  {...dot}
                                  fill={dot.stroke}
                                  className="animate-ping"
                                  style={{
                                    transformOrigin: `${dot.cx}px ${dot.cy}px`,
                                  }}
                                />
                                <Dot {...dot} fill={dot.stroke} />
                              </Fragment>
                            ) : (
                              <Fragment key={key} />
                            );
                          }}
                          stroke={"currentColor"}
                          strokeWidth={2}
                        />
                        <RechartsTooltip
                          wrapperClassName="backdrop-blur-sm !bg-transparent !pb-0 rounded-sm"
                          labelClassName=" -top-3 text-muted-foreground text-xs"
                          formatter={(value: number) => value.toFixed(2)}
                          labelFormatter={(timestamp: Date) => timestamp.toLocaleString()}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                );
              }
              // If we're still loading
              else if (isLoadingFavorHistory) {
                return (
                  <div className="mt-2 h-[120px] animate-pulse flex flex-col items-center justify-center">
                    <div className="w-full h-4 bg-muted rounded mb-2"></div>
                    <div className="w-3/4 h-20 bg-muted/50 rounded"></div>
                  </div>
                );
              }
              // Default fallback - when no data at all, still show a graph with current favor
              else {
                const defaultData = [
                  { timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), favor },
                  { timestamp: new Date(), favor }
                ];
                return (
                  <div className="mt-2">
                    <div className="flex flex-col mb-2">
                      <h4 className="text-sm font-semibold">Favor History</h4>
                      <span className="text-xs text-muted-foreground">Limited history available</span>
                    </div>
                    <ResponsiveContainer width="100%" height={100}>
                      <LineChart
                        width={300}
                        height={100}
                        data={defaultData}
                        className="[&>.recharts-surface]:overflow-visible"
                      >
                        <XAxis dataKey="timestamp" hide />
                        <YAxis domain={[0, 100]} hide />
                        <ReferenceLine
                          y={50}
                          className="[&>line]:stroke-muted"
                        ></ReferenceLine>
                        <Line
                          animationDuration={300}
                          dataKey="favor"
                          type="stepAfter"
                          className="overflow-visible text-endorsed"
                          dot={({ key, ...dot }) => {
                            if (dot.index === undefined) {
                              return <Fragment key={key} />;
                            }
                            return dot.index === defaultData.length - 1 ? (
                              <Fragment key={key}>
                                <Dot
                                  {...dot}
                                  fill={dot.stroke}
                                  className="animate-ping"
                                  style={{
                                    transformOrigin: `${dot.cx}px ${dot.cy}px`,
                                  }}
                                />
                                <Dot {...dot} fill={dot.stroke} />
                              </Fragment>
                            ) : (
                              <Fragment key={key} />
                            );
                          }}
                          stroke={"currentColor"}
                          strokeWidth={2}
                        />
                        <RechartsTooltip
                          wrapperClassName="backdrop-blur-sm !bg-transparent !pb-0 rounded-sm"
                          labelClassName=" -top-3 text-muted-foreground text-xs"
                          formatter={(value: number) => value.toFixed(2)}
                          labelFormatter={(timestamp: Date) => timestamp.toLocaleString()}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                );
              }
            })()}
          </div>
        </PopoverContent>
      </Portal>
    </Popover>
  );
};
