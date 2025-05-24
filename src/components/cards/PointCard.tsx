import { hoveredPointIdAtom } from "@/atoms/hoveredPointIdAtom";
import { visitedPointsAtom } from "@/atoms/visitedPointsAtom";
import { PointStats } from "@/components/cards/pointcard/PointStats";
import {
  PointIcon,
  PinnedIcon,
  FeedCommandIcon,
} from "@/components/icons/AppIcons";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useCredInput } from "@/hooks/ui/useCredInput";
import { useVisitedPoints } from "@/hooks/points/useVisitedPoints";
import { cn } from "@/lib/utils/cn";
import { useEndorse } from "@/mutations/endorsements/useEndorse";
import { useUserEndorsement } from "@/queries/users/useUserEndorsements";
import { usePrivy } from "@privy-io/react-auth";
import { useToggle } from "@uidotdev/usehooks";
import { useAtom } from "jotai";
import { CheckIcon } from "lucide-react";
import { Portal } from "@radix-ui/react-portal";
import {
  HTMLAttributes,
  MouseEventHandler,
  useCallback,
  useEffect,
  useMemo,
  useState,
  useRef,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import { getSpaceFromPathname } from "@/lib/negation-game/getSpaceFromPathname";
import { useQueryClient } from "@tanstack/react-query";
import { getPointUrl } from "@/lib/negation-game/getPointUrl";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { selectedPointIdsAtom } from "@/atoms/viewpointAtoms";
import { useSellEndorsement } from '@/mutations/endorsements/useSellEndorsement';
import dynamic from "next/dynamic";
import type { FavorHistoryChartProps } from "./pointcard/FavorHistoryChart";
import { OPBadge } from "@/components/cards/pointcard/OPBadge";
import { VisitedMarker } from "@/components/cards/pointcard/VisitedMarker";
import { PointCardHeader } from "@/components/cards/pointcard/PointCardHeader";
import { PointCardActions } from "@/components/cards/pointcard/PointCardActions";
import { fetchFavorHistory } from '@/actions/feed/fetchFavorHistory';

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
  graphNodeLevel?: number;
  inRationale?: boolean;
  favorHistory?: Array<{ timestamp: Date; favor: number; }>;
  disablePopover?: boolean;
  isInPointPage?: boolean;
  isLoading?: boolean;
  disableVisitedMarker?: boolean;
  isSharing?: boolean;
}

// Lazy-load the favor history chart component (default export)
const FavorHistoryChart = dynamic<FavorHistoryChartProps>(
  () => import("@/components/cards/pointcard/FavorHistoryChart"),
  { ssr: false }
);

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
  graphNodeLevel,
  inRationale,
  favorHistory: initialFavorHistory,
  disablePopover = !inRationale,
  isInPointPage = false,
  isLoading = false,
  disableVisitedMarker = false,
  isSharing = false,
  ...props
}: PointCardProps) => {
  const { mutateAsync: endorse, isPending: isEndorsing } = useEndorse();
  const { mutateAsync: sellEndorsement, isPending: isSelling } = useSellEndorsement();
  const { data: opCred } = useUserEndorsement(originalPosterId, pointId);
  const [_, setHoveredPointId] = useAtom(hoveredPointIdAtom);
  const { user: privyUser, login } = usePrivy();
  const [endorsePopoverOpen, toggleEndorsePopoverOpen] = useToggle(false);
  const { credInput, setCredInput, notEnoughCred } = useCredInput({
    resetWhen: !endorsePopoverOpen,
  });
  const [isSellingMode, setIsSellingMode] = useState(false);
  const { isVisited, markPointAsRead } = useVisitedPoints();
  const [visitedPoints] = useAtom(visitedPointsAtom);
  const router = useRouter();
  const pathname = usePathname();
  const currentSpace = getSpaceFromPathname(pathname);
  const queryClient = useQueryClient();

  const [isOpen, setIsOpen] = useState(false);
  const [isLoadingFavorHistory, setIsLoadingFavorHistory] = useState(false);
  const [popoverFavorHistory, setPopoverFavorHistory] = useState<Array<{ timestamp: Date; favor: number }> | null>(null);

  const [selectedIds, setSelectedIds] = useAtom(selectedPointIdsAtom);
  const isSelected = useMemo(() => selectedIds.has(pointId), [selectedIds, pointId]);

  const handleSelect = useCallback(() => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(pointId)) {
        // eslint-disable-next-line drizzle/enforce-delete-with-where
        newSet.delete(pointId);
      } else {
        newSet.add(pointId);
      }
      return newSet;
    });
  }, [pointId, setSelectedIds]);

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

      // Fetch favor history
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
      router.push(getPointUrl(pinnedCommandPointId, space));
    }
  }, [pinnedCommandPointId, router, space]);

  const handleMarkAsRead = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    markPointAsRead(pointId);
  }, [markPointAsRead, pointId]);

  const handleEndorseOrSell = () => {
    if (isSellingMode) {
      sellEndorsement({ pointId, amountToSell: credInput }).then(() => {
        toggleEndorsePopoverOpen(false);
        window.dispatchEvent(new CustomEvent('endorse-event', { detail: { pointId } }));
      });
    } else {
      endorse({ pointId, cred: credInput }).then(() => {
        toggleEndorsePopoverOpen(false);
        window.dispatchEvent(new CustomEvent('endorse-event', { detail: { pointId } }));
      });
    }
  };

  const renderCardContent = () => (
    <div
      className={cn(
        "@container/point flex gap-3 pt-4 pb-3 px-4 relative rounded-none will-change-auto",
        isPinned && "border-l-4 border-primary",
        isPriority && !isPinned && "border-l-4 border-amber-400",
        inGraphNode && "pt-2.5",
        isSharing && !isSelected && "opacity-50 transition-opacity duration-200",
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
      {isLoading && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-10">
          <div className="size-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      {isSharing && (
        <CheckboxPrimitive.Root
          checked={isSelected}
          onCheckedChange={handleSelect}
          className="absolute top-4 right-4 z-10 h-5 w-5 rounded-sm border border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
          aria-label={`Select point ${pointId}`}
        >
          <CheckboxPrimitive.Indicator className={cn("flex items-center justify-center text-current")}>
            <CheckIcon className="h-4 w-4" />
          </CheckboxPrimitive.Indicator>
        </CheckboxPrimitive.Root>
      )}
      <div className="flex flex-col flex-grow w-full min-w-0 pr-8">
        <PointCardHeader
          inGraphNode={!!inGraphNode}
          graphNodeLevel={graphNodeLevel}
          isCommand={!!isCommand}
          isPinned={!!isPinned}
          space={space}
          linkDisabled={!!linkDisabled}
          pinnedCommandPointId={pinnedCommandPointId}
          pinStatus={pinStatus}
          parsePinCommand={parsePinCommand ?? undefined}
          onPinBadgeClickCapture={onPinBadgeClickCapture ?? undefined}
          handlePinCommandClick={handlePinCommandClick}
          handleTargetPointClick={handleTargetPointClick}
          content={content}
        />

        <PointStats
          className="mb-md select-text"
          amountNegations={amountNegations}
          amountSupporters={amountSupporters}
          favor={favor}
          cred={cred}
        />

        <PointCardActions
          onNegate={onNegate}
          endorsedByViewer={endorsedByViewer}
          viewerCred={viewerContext?.viewerCred || 0}
          privyUser={privyUser}
          login={login}
          popoverOpen={endorsePopoverOpen}
          togglePopover={toggleEndorsePopoverOpen}
          credInput={credInput}
          setCredInput={setCredInput}
          notEnoughCred={notEnoughCred}
          isSellingMode={isSellingMode}
          setIsSellingMode={setIsSellingMode}
          onSubmit={handleEndorseOrSell}
          isPending={isEndorsing || isSelling}
          inRationale={!!inRationale}
          inGraphNode={!!inGraphNode}
          pointId={pointId}
          currentSpace={currentSpace ?? undefined}
          isInPointPage={isInPointPage}
          isNegation={!!isNegation}
          parentCred={parentPoint?.cred}
          showRestakeAmount={showRestakeAmount}
          restakeIsOwner={restake?.isOwner}
          restakePercentage={restakePercentage}
          isOverHundred={isOverHundred}
          onRestake={onRestake!}
          doubtAmount={doubt?.amount}
          doubtIsUserDoubt={doubt?.isUserDoubt}
          doubtPercentage={doubtPercentage}
        />
      </div>
      {endorsedByOp && <OPBadge opCred={opCred} originalPosterId={originalPosterId} />}
      <VisitedMarker
        isSharing={isSharing}
        visited={visited}
        privyUser={privyUser}
        disableVisitedMarker={disableVisitedMarker}
        onMarkAsRead={handleMarkAsRead}
      />
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

            {/* Favor History Chart (lazy-loaded) */}
            <FavorHistoryChart
              popoverFavorHistory={popoverFavorHistory}
              initialFavorHistory={initialFavorHistory ?? []}
              favor={favor}
              isLoadingFavorHistory={isLoadingFavorHistory}
            />
          </div>
        </PopoverContent>
      </Portal>
    </Popover>
  );
};
