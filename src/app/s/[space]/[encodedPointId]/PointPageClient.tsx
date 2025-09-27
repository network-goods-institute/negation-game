"use client";

import { useMemo, useState, useEffect } from "react";
import React from "react";
import { decodeId } from "@/lib/negation-game/decodeId";
import { usePointData } from "@/queries/points/usePointData";
;
import { negatedPointIdAtom } from "@/atoms/negatedPointIdAtom";
import { negationContentAtom } from "@/atoms/negationContentAtom";
import { CredInput } from "@/components/inputs/CredInput";
import { PointCard } from "@/components/cards/PointCard";
import { PointStats } from "@/components/cards/pointcard/PointStats";
import { RestakeDialog } from "@/components/dialogs/RestakeDialog";
import { SelectNegationDialog } from "@/components/dialogs/SelectNegationDialog";
import { PointEditDialog } from "@/components/dialogs/PointEditDialog";
import { fetchPointHistory } from "@/actions/points/fetchPointHistory";
import dynamic from "next/dynamic";
import { NegateButton } from "@/components/buttons/NegateButton";
import { PointIcon } from "@/components/icons/AppIcons";
import { TrashIcon } from "@/components/icons/TrashIcon";
import { NegateIcon } from "@/components/icons/NegateIcon";
import { EditIcon, HistoryIcon, LinkIcon, Target, SparklesIcon, CircleXIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/ui/loader";
import { useBasePath } from "@/hooks/utils/useBasePath";
import { useCredInput } from "@/hooks/ui/useCredInput";
import useIsMobile from "@/hooks/ui/useIsMobile";
import { useVisitedPoints } from "@/hooks/points/useVisitedPoints";
import { encodeId } from "@/lib/negation-game/encodeId";
import { usePointNegations } from "@/queries/points/usePointNegations";
import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { useSetAtom, useAtom } from "jotai";
import { DeletePointDialog } from "@/components/dialogs/DeletePointDialog";
import { isWithinDeletionTimelock } from "@/lib/negation-game/deleteTimelock";

import { getBackButtonHandler } from "@/lib/negation-game/backButtonUtils";
import { initialSpaceTabAtom } from "@/atoms/navigationAtom";
import { useSellEndorsement } from "@/mutations/endorsements/useSellEndorsement";
import { useEndorse } from "@/mutations/endorsements/useEndorse";
import { toast } from "sonner";
import { ObjectionHeader } from '@/components/cards/pointcard/ObjectionHeader';
import { DeltaComparisonWidget } from '@/components/delta/DeltaComparisonWidget';
import { useFavorHistory } from "@/queries/epistemic/useFavorHistory";
import { useCounterpointSuggestions } from "@/queries/ai/useCounterpointSuggestions";
import { TimelineScale, timelineScales } from "@/lib/negation-game/timelineScale";
import { DEFAULT_TIMESCALE } from "@/constants/config";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Separator } from "@/components/ui/separator";
import { formatDistanceToNow } from "date-fns";
import { Fragment } from "react";
import { SpaceLayout } from '@/components/layouts/SpaceLayout';
import { SpaceChildHeader } from '@/components/layouts/headers/SpaceChildHeader';
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const FavorHistoryChart = dynamic(
    () => import("@/components/cards/pointcard/FavorHistoryChart"),
    { ssr: false }
);

const GraphSection = dynamic(
    () => import("@/app/s/[space]/[encodedPointId]/GraphSection"),
    {
        ssr: false,
        loading: () => (
            <div className="absolute inset-0 flex items-center justify-center"><Loader className="w-8 h-8" /></div>
        ),
    }
);

interface PointPageClientProps {
    params: {
        space: string;
        encodedPointId: string;
    };
    searchParams: {
        [key: string]: string | string[] | undefined;
    };
}

interface PointHistoryDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    pointId: number;
    isEdited: boolean;
    editCount: number;
}

const PointHistoryDialog = ({
    open,
    onOpenChange,
    pointId,
    isEdited,
    editCount
}: PointHistoryDialogProps) => {
    const { data: history, isLoading } = useQuery({
        queryKey: ['point-history', pointId],
        queryFn: () => fetchPointHistory(pointId, 10),
        enabled: open && isEdited,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });

    if (!isEdited || editCount === 0) {
        return null;
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <HistoryIcon className="w-5 h-5" />
                        Point Edit History
                    </DialogTitle>
                    <DialogDescription>
                        View the edit history for this point ({editCount} edit{editCount !== 1 ? 's' : ''})
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-12 space-y-4">
                            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                            <p className="text-sm text-muted-foreground">Loading version history...</p>
                        </div>
                    ) : history && history.length > 0 ? (
                        <div className="space-y-4 pr-2">
                            {history.map((entry: any, index: number) => (
                                <div key={entry.id} className="relative">
                                    {index < history.length - 1 && (
                                        <div className="absolute left-6 top-12 bottom-0 w-px bg-border" />
                                    )}

                                    <div className="flex gap-4">
                                        <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center mt-1">
                                            <span className="text-xs font-medium text-primary">
                                                {entry.action === 'created' ? 'C' : 'E'}
                                            </span>
                                        </div>

                                        <div className="flex-1 min-w-0 pb-6">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium capitalize">
                                                        {entry.action}
                                                    </span>
                                                    {entry.user?.username && (
                                                        <span className="text-sm text-muted-foreground">
                                                            by {entry.user.username}
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="text-xs text-muted-foreground whitespace-nowrap">
                                                    {formatDistanceToNow(entry.createdAt, { addSuffix: true })}
                                                </span>
                                            </div>

                                            {entry.action === 'edited' && entry.previousContent && (
                                                <div className="space-y-3 mb-4">
                                                    <div>
                                                        <div className="text-sm font-medium text-destructive mb-2">Previous content:</div>
                                                        <div className="bg-destructive/5 border border-destructive/20 p-3 rounded-md text-sm max-h-40 overflow-y-auto whitespace-pre-wrap break-words">
                                                            {entry.previousContent}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            <div>
                                                <div className="text-sm font-medium text-green-600 dark:text-green-400 mb-2">
                                                    {entry.action === 'created' ? 'Initial content:' : 'Updated content:'}
                                                </div>
                                                <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800/30 p-3 rounded-md text-sm max-h-40 overflow-y-auto whitespace-pre-wrap break-words">
                                                    {entry.newContent}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                                <HistoryIcon className="w-8 h-8 text-muted-foreground" />
                            </div>
                            <h3 className="font-medium mb-2">No edit history</h3>
                            <p className="text-sm text-muted-foreground">
                                This point hasn&apos;t been edited yet.
                            </p>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default function PointPageClient({ params, searchParams }: PointPageClientProps) {
    const { space, encodedPointId } = params;
    const router = useRouter();
    const { user: privyUser, ready, login } = usePrivy();
    const basePath = useBasePath();
    const isMobile = useIsMobile();

    const pointId = useMemo(() => {
        return decodeId(encodedPointId);
    }, [encodedPointId]);

    const { data: point, isLoading: isPointLoading, refetch: refetchPoint } = usePointData(pointId || undefined);
    const [negatedPointId, setNegatedPointId] = useAtom(negatedPointIdAtom);
    const [negationContent, setNegationContent] = useAtom(negationContentAtom(point?.pointId));
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedNegationOpen, setSelectedNegationOpen] = useState(false);
    const [restakeDialogPointId, setRestakeDialogPointId] = useState<number | null>(null);
    const [restakeDialogNegationId, setRestakeDialogNegationId] = useState<number | null>(null);
    const [restakeDialogOpenedFromSlashedIcon, setRestakeDialogOpenedFromSlashedIcon] = useState<boolean>(false);
    const setInitialTab = useSetAtom(initialSpaceTabAtom);
    const [loadingNegationId, setLoadingNegationId] = useState<number | null>(null);

    const [timelineScale, setTimelineScale] = useState<TimelineScale>(DEFAULT_TIMESCALE);

    useEffect(() => {
        return () => {
            setLoadingNegationId(null);
        };
    }, [encodedPointId]);

    // Data fetching
    const { data: negations, isLoading: isNegationsLoading, refetch: refetchNegations } = usePointNegations(point?.pointId);
    const negationSkeletonCount = point ? Math.max(point.amountNegations || 0, 0) : 0;

    // Query favor history for timeline chart
    const { data: favorHistory, isFetching: isFetchingFavorHistory } = useFavorHistory({
        pointId: point?.pointId || 0,
        timelineScale: timelineScale as TimelineScale,
    });

    // Query AI counterpoint suggestions
    const counterpointSuggestions = useCounterpointSuggestions(point?.pointId);

    // Mutations
    const { mutate: sellEndorsement, isPending: isSelling } = useSellEndorsement();
    const { mutate: endorseMutate, isPending: isEndorsing } = useEndorse();

    // Point ownership and permissions
    const isPointOwner = privyUser?.id === point?.createdBy;
    const canDeletePoint = isPointOwner && point?.createdAt && isWithinDeletionTimelock(point.createdAt);
    const hasHistoryAction = !!(point?.isEdited);
    const hasMoreActions = true;

    // Visited points tracking
    const { markPointAsRead } = useVisitedPoints();

    useEffect(() => {
        if (point?.pointId) {
            markPointAsRead(point.pointId);
        }
    }, [point?.pointId, markPointAsRead]);

    const {
        credInput: credAmount,
        setCredInput: setCredAmount,
        hasEnoughCred,
        notEnoughCred
    } = useCredInput();

    const handleBackClick = getBackButtonHandler(router, setInitialTab);

    const handleNegateClick = () => {
        if (!privyUser) {
            login();
            return;
        }
        if (point?.pointId) {
            setNegatedPointId(point.pointId);
        }
    };

    const handleCopyMarkdownLink = async () => {
        if (!point) return;

        // Ensure we have a valid origin and base path
        const origin = window.location.origin;
        const safePath = basePath || "";
        const encodedId = encodeId(point.pointId);

        // Construct URL carefully and ensure it's a string
        const url = `${origin}${safePath}/${encodedId}`;
        const markdownLink = `[${point.content}](${url})`;

        try {
            // Ensure we're passing a string to writeText
            await navigator.clipboard.writeText(String(markdownLink));
            toast.success("Markdown link copied to clipboard");
        } catch (error) {
            toast.error("Failed to copy link");
        }
    };

    const handleSelectNegateToRestake = () => {
        if (!privyUser) {
            login();
            return;
        }
        setSelectedNegationOpen(true);
    };

    const [isChangeOpen, setIsChangeOpen] = useState(false);
    const [isMoreActionsOpen, setIsMoreActionsOpen] = useState(false);
    const [changeAmount, setChangeAmount] = useState(0);
    const [isSellingMode, setIsSellingMode] = useState(false);

    const handleChangeEndorsement = () => {
        if (!point?.pointId) return;
        if (isSellingMode) {
            sellEndorsement(
                { pointId: point.pointId, amountToSell: changeAmount },
                {
                    onSuccess: () => {
                        setIsChangeOpen(false);
                    },
                }
            );
        } else {
            endorseMutate(
                { pointId: point.pointId, cred: changeAmount },
                {
                    onSuccess: () => {
                        setIsChangeOpen(false);
                    },
                }
            );
        }
    };

    const headerContent = (
        <SpaceChildHeader
            title={point?.content ? `Point ${encodeId(point.pointId)}` : "Loading..."}
            subtitle={point?.content}
            onBack={handleBackClick}
        />
    );

    const sidebarContent = (
        <div className="space-y-4">
            {/* Point Actions */}
            <div className="border rounded-lg p-4">
                <h3 className="font-medium mb-3">Point Actions</h3>
                <div className="space-y-2">
                    {/* Negate Button */}
                    <NegateButton
                        onClick={handleNegateClick}
                        className="w-full"
                        variant="outline"
                    />

                    {/* Change Endorsement */}
                    <Button
                        variant="default"
                        className="w-full"
                        onClick={() => {
                            if (!privyUser) { login(); return; }
                            setIsSellingMode(!!(point?.viewerCred && point.viewerCred > 0));
                            setChangeAmount(0);
                            setIsChangeOpen(true);
                        }}
                    >
                        Change Endorsement
                    </Button>

                    {/* More Actions (Modal) */}
                    {hasMoreActions && (
                        <Button variant="outline" className="w-full justify-start" onClick={() => setIsMoreActionsOpen(true)}>
                            <PointIcon className="mr-2 size-4" />
                            More Actions
                        </Button>
                    )}
                </div>
            </div>

            {/* Delta Comparison */}
            {point?.pointId && (
                <DeltaComparisonWidget
                    comparison={{ type: "point", pointId: point.pointId }}
                    title="Point Alignment Discovery"
                    description="Find users who agree or disagree with this point most"
                    currentUserId={privyUser?.id}
                    spaceId={space}
                />
            )}

            {/* Point Stats */}
            {point && (
                <PointStats
                    cred={point.cred}
                    favor={point.favor}
                    amountSupporters={point.amountSupporters}
                    amountNegations={point.amountNegations}
                    className="border rounded-lg p-4"
                />
            )}
        </div>
    );

    // Main content
    const mainContent = (
        <div className="space-y-6">
            {/* Point Card */}
            {isPointLoading ? (
                <div className="border rounded-lg overflow-hidden flex items-center justify-center min-h-[140px]"><Loader className="w-6 h-6" /></div>
            ) : point ? (
                <div className="border rounded-lg overflow-hidden">
                    {point.isObjection && (
                        <ObjectionHeader
                            id={point.pointId}
                            parentId={point.objectionTargetId}
                            space={space}
                        />
                    )}
                    <PointCard
                        pointId={point.pointId}
                        content={point.content}
                        createdAt={point.createdAt}
                        cred={point.cred}
                        favor={point.favor}
                        amountSupporters={point.amountSupporters}
                        amountNegations={point.amountNegations}
                        viewerContext={{
                            viewerCred: point.viewerCred,
                            viewerNegationsCred: point.viewerNegationsCred
                        }}
                        space={space}
                        className="border-0 rounded-none"
                        isEdited={point.isEdited}
                        editedAt={point.editedAt || undefined}
                        editedBy={point.editedBy || undefined}
                        editCount={point.editCount}
                        onNegate={() => setNegatedPointId(point.pointId)}
                        onRestake={() => setSelectedNegationOpen(true)}
                    />
                </div>
            ) : null}

            {/* Favor History Chart and Timeline Controls */}
            {point && (
                <div className="border rounded-lg overflow-hidden">
                    <div className="p-4">
                        {/* Check if we're using limited fallback data */}
                        {favorHistory &&
                            favorHistory.length === 2 &&
                            favorHistory[0].favor === favorHistory[1].favor && (
                                <div className="text-sm text-muted-foreground mb-1">
                                    Limited history available
                                </div>
                            )}
                        <FavorHistoryChart
                            popoverFavorHistory={favorHistory as any}
                            initialFavorHistory={favorHistory && Array.isArray(favorHistory) && favorHistory.length > 0
                                ? favorHistory
                                : [{ timestamp: new Date(), favor: point?.favor || 50 }] as any}
                            favor={point.favor}
                            isLoadingFavorHistory={isFetchingFavorHistory}
                        />
                        <ToggleGroup
                            type="single"
                            value={timelineScale}
                            onValueChange={(v) =>
                                v && setTimelineScale(v as TimelineScale)
                            }
                            className="flex gap-px w-fit"
                        >
                            {timelineScales.map((scale) => (
                                <ToggleGroupItem
                                    value={scale}
                                    className="w-10 h-6 text-sm text-muted-foreground"
                                    key={scale}
                                >
                                    {scale}
                                </ToggleGroupItem>
                            ))}
                            <Loader
                                className="text-muted-foreground size-4 ml-2"
                                style={{
                                    display: isFetchingFavorHistory ? "block" : "none",
                                }}
                            />
                        </ToggleGroup>

                        <Separator className="my-4" />
                        <PointStats
                            className="justify-evenly text-xs"
                            favor={point.favor}
                            amountNegations={point.amountNegations}
                            amountSupporters={point.amountSupporters}
                            cred={point.cred}
                        />
                    </div>
                </div>
            )}

            {/* Mobile More Actions Button */}
            {isMobile && hasMoreActions && point && (
                <div className="px-4">
                    <Button
                        variant="outline"
                        className="w-full justify-center gap-2"
                        onClick={() => setIsMoreActionsOpen(true)}
                    >
                        <PointIcon className="size-4" />
                        More Actions
                    </Button>
                </div>
            )}

            {/* Negations List as PointCards */}
            {point && (
                <div className="border rounded-lg overflow-hidden">
                    <div className="p-4 border-b bg-muted/20">
                        <h3 className="font-medium">Negations</h3>
                    </div>
                    {isNegationsLoading ? (
                        <div className="space-y-4">
                            {Array.from({ length: negationSkeletonCount }).map((_, i) => (
                                <div
                                    key={`skeleton-${i}`}
                                    className="animate-pulse border border-border rounded-lg p-4"
                                    // Add staggered animation delay for each skeleton to create a wave effect
                                    style={{ animationDelay: `${i * 100}ms` }}
                                >
                                    <div className="flex items-center space-x-2 mb-4">
                                        <div className="rounded-full bg-secondary h-8 w-8"></div>
                                        <div
                                            className="h-4 bg-secondary rounded"
                                            // Vary widths of username and other elements
                                            style={{ width: `${55 + (i % 3) * 10}%`, opacity: 1 - (i * 0.15) }}
                                        ></div>
                                    </div>
                                    <div
                                        className="h-3 bg-secondary rounded mb-2"
                                        style={{ width: `${85 - (i % 4) * 10}%`, opacity: 1 - (i * 0.1) }}
                                    ></div>
                                    <div
                                        className="h-3 bg-secondary rounded mb-2"
                                        style={{ width: `${65 + (i % 3) * 15}%`, opacity: 1 - (i * 0.1) }}
                                    ></div>
                                    <div
                                        className="h-3 bg-secondary rounded"
                                        style={{ width: `${45 - (i % 2) * 15}%`, opacity: 1 - (i * 0.1) }}
                                    ></div>
                                    <div className="flex justify-between mt-3">
                                        <div className="h-4 bg-secondary rounded w-16" style={{ opacity: 0.7 - (i * 0.1) }}></div>
                                        <div className="h-4 bg-secondary rounded w-12" style={{ opacity: 0.7 - (i * 0.1) }}></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : Array.isArray(negations) && negations.length > 0 ? (
                        <div>
                            {negations.map((n) => (
                                <PointCard
                                    key={`neg-${n.pointId}`}
                                    pointId={n.pointId}
                                    content={n.content}
                                    createdAt={n.createdAt}
                                    cred={n.cred}
                                    favor={n.favor}
                                    amountSupporters={n.amountSupporters}
                                    amountNegations={n.amountNegations}
                                    viewerContext={{ viewerCred: n.viewerCred, viewerNegationsCred: n.negationsCred }}
                                    space={space}
                                    className="border-0 rounded-none cursor-pointer"
                                    isNegation
                                    parentPoint={{
                                        id: point.pointId,
                                        content: point.content,
                                        createdAt: point.createdAt,
                                        cred: point.cred,
                                        viewerCred: point.viewerCred || 0,
                                        amountSupporters: point.amountSupporters,
                                        amountNegations: point.amountNegations,
                                        negationsCred: n.negationsCred,
                                        stakedAmount: 0,
                                    }}
                                    restake={n.restake ? {
                                        id: n.restake.id ?? null,
                                        amount: n.restake.amount ?? 0,
                                        originalAmount: n.restake.originalAmount ?? 0,
                                        slashedAmount: n.restake.slashedAmount ?? 0,
                                        doubtedAmount: n.restake.doubtedAmount ?? 0,
                                        effectiveAmount: (n.restake as any).effectiveAmount ?? undefined,
                                        isOwner: n.restake.isOwner ?? false,
                                    } : null}
                                    doubt={n.doubt}
                                    totalRestakeAmount={n.totalRestakeAmount}
                                    isInPointPage
                                    disablePopover
                                    onClick={(e) => {
                                        // Check if the click was on an action button
                                        const target = e.target as HTMLElement;
                                        if (target.closest('[data-action-button="true"]') || target.closest('button')) {
                                            return;
                                        }
                                        // Set loading state and navigate to the negation point page
                                        setLoadingNegationId(n.pointId);
                                        router.push(`${basePath}/${encodeId(n.pointId)}`);
                                    }}
                                    isLoading={loadingNegationId === n.pointId}
                                    onNegate={() => setNegatedPointId(n.pointId)}
                                    onRestake={({ openedFromSlashedIcon }) => {
                                        setRestakeDialogPointId(point.pointId);
                                        setRestakeDialogNegationId(n.pointId);
                                        setRestakeDialogOpenedFromSlashedIcon(!!openedFromSlashedIcon);
                                    }}
                                />
                            ))}

                            {/* AI Counterpoint Suggestions */}
                            {counterpointSuggestions.length > 0 && point && (
                                <div className="space-y-4 border-t border-dashed pt-4 mt-2">
                                    <p className="w-full text-center text-muted-foreground text-xs p-4 animate-fade-in">
                                        Want to add a negation? Try starting with one of these
                                        AI-generated ones{" "}
                                        <SparklesIcon className="size-3 inline-block align-baseline" />
                                    </p>
                                    {counterpointSuggestions.map((suggestion, i) => (
                                        <div
                                            key={`suggestion-${i}`}
                                            className="flex gap-3 mt-3 mx-2 px-3 py-4 rounded-md border border-dashed hover:bg-muted cursor-pointer animate-fade-in active:scale-95 transition-transform"
                                            onClick={() => {
                                                if (!privyUser) {
                                                    login();
                                                    return;
                                                }
                                                setNegationContent(suggestion);
                                                setNegatedPointId(point.pointId);
                                            }}
                                        >
                                            <div className="relative grid text-muted-foreground">
                                                <CircleXIcon className="shrink-0 size-6 stroke-1 text-muted-foreground col-start-1 row-start-1" />
                                            </div>
                                            <p className="tracking-tighter text-sm -mt-0.5">
                                                {suggestion}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div>
                            <div className="flex flex-col items-center justify-center py-12 px-4 text-center animate-fade-in">
                                <div className="mb-4 text-muted-foreground">
                                    <div className="size-8 mx-auto mb-2 text-muted-foreground">
                                        <NegateIcon className="w-full h-full" />
                                    </div>
                                    <h3 className="text-lg font-medium mb-1">No negations yet</h3>
                                    <p className="text-sm text-muted-foreground max-w-[300px]">
                                        Challenge this point by creating a negation. It&apos;s a great way to engage in constructive debate.
                                    </p>
                                </div>
                                <Button
                                    variant="outline"
                                    className="gap-2 items-center"
                                    onClick={() => {
                                        if (!privyUser) {
                                            login();
                                            return;
                                        }
                                        if (point?.pointId) {
                                            setNegatedPointId(point.pointId);
                                        }
                                    }}
                                >
                                    <NegateIcon className="size-4 flex-shrink-0" />
                                    Create Negation
                                </Button>
                            </div>

                            {/* AI Counterpoint Suggestions */}
                            {counterpointSuggestions.length > 0 && point && (
                                <div className="space-y-4 border-t border-dashed pt-4 mt-4">
                                    <p className="w-full text-center text-muted-foreground text-xs p-4 animate-fade-in">
                                        Want to add a negation? Try starting with one of these
                                        AI-generated ones{" "}
                                        <SparklesIcon className="size-3 inline-block align-baseline" />
                                    </p>
                                    {counterpointSuggestions.map((suggestion, i) => (
                                        <div
                                            key={`suggestion-${i}`}
                                            className="flex gap-3 mt-3 mx-2 px-3 py-4 rounded-md border border-dashed hover:bg-muted cursor-pointer animate-fade-in active:scale-95 transition-transform"
                                            onClick={() => {
                                                if (!privyUser) {
                                                    login();
                                                    return;
                                                }
                                                setNegationContent(suggestion);
                                                setNegatedPointId(point.pointId);
                                            }}
                                        >
                                            <div className="relative grid text-muted-foreground">
                                                <CircleXIcon className="shrink-0 size-6 stroke-1 text-muted-foreground col-start-1 row-start-1" />
                                            </div>
                                            <p className="tracking-tighter text-sm -mt-0.5">
                                                {suggestion}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}


            {/* Graph View */}
            <div className="border rounded-lg overflow-hidden">
                <div className="p-4 border-b bg-muted/20">
                    <h3 className="font-medium">Point Graph</h3>
                </div>
                <div className="relative min-h-[600px] md:min-h-[720px] h-[65vh]">
                    {isPointLoading || isNegationsLoading ? (
                        <div className="absolute inset-0 flex items-center justify-center"><Loader className="w-8 h-8" /></div>
                    ) : point ? (
                        <GraphSection pointId={point.pointId} />
                    ) : null}
                </div>
            </div>
        </div>
    );

    return (
        <SpaceLayout
            space={space}
            header={headerContent}
            rightSidebarContent={sidebarContent}
            showUserProfilePreview={true}
        >
            <div className="mx-auto w-full max-w-5xl px-3">
                <div className="bg-background border rounded-lg shadow-sm p-6">
                    {mainContent}
                </div>
            </div>

            {point && (
                <DeletePointDialog
                    open={deleteDialogOpen}
                    onOpenChange={setDeleteDialogOpen}
                    pointId={point.pointId}
                    createdAt={point.createdAt}
                />
            )}

            {point && (
                <PointEditDialog
                    open={editDialogOpen}
                    onOpenChange={setEditDialogOpen}
                    pointId={point.pointId}
                    currentContent={point.content}
                    canEdit={isPointOwner}
                    isOption={point.isOption}
                />
            )}

            {/* Enhanced history dialog from incoming */}
            {point && (
                <PointHistoryDialog
                    open={historyDialogOpen}
                    onOpenChange={setHistoryDialogOpen}
                    pointId={point.pointId}
                    isEdited={point.isEdited || false}
                    editCount={point.editCount || 0}
                />
            )}

            {/* Select Negation for main point negate */}
            {point && (
                <SelectNegationDialog
                    open={selectedNegationOpen}
                    onOpenChange={setSelectedNegationOpen}
                    originalPoint={{
                        id: point.pointId,
                        content: point.content,
                        createdAt: point.createdAt,
                        stakedAmount: point.viewerCred || 0,
                        viewerCred: point.viewerCred || 0,
                        cred: point.cred,
                        amountSupporters: point.amountSupporters,
                        amountNegations: point.amountNegations,
                        negationsCred: point.viewerNegationsCred || 0,
                        favor: point.favor,
                    }}
                    negationId={0}
                />
            )}

            {/* Restake dialog for specific negation entries */}
            {restakeDialogPointId && restakeDialogNegationId && (
                <RestakeDialog
                    open={true}
                    onOpenChange={(open) => {
                        if (!open) {
                            setRestakeDialogPointId(null);
                            setRestakeDialogNegationId(null);
                            setRestakeDialogOpenedFromSlashedIcon(false);
                        }
                    }}
                    openedFromSlashedIcon={restakeDialogOpenedFromSlashedIcon}
                    originalPoint={{
                        id: restakeDialogPointId,
                        content: point?.content || "",
                        createdAt: point?.createdAt || new Date(),
                        stakedAmount: point?.viewerCred || 0,
                        viewerCred: point?.viewerCred || 0,
                        cred: point?.cred || 0,
                        amountSupporters: point?.amountSupporters || 0,
                        amountNegations: point?.amountNegations || 0,
                        negationsCred: point?.viewerNegationsCred || 0,
                        favor: point?.favor || 50,
                    }}
                    counterPoint={{
                        id: restakeDialogNegationId,
                        content: (negations?.find(n => n.pointId === restakeDialogNegationId)?.content as string) || "",
                        createdAt: (negations?.find(n => n.pointId === restakeDialogNegationId)?.createdAt as Date) || new Date(),
                    }}
                />
            )}

            {/* Change Endorsement Modal */}
            <Dialog open={isChangeOpen} onOpenChange={setIsChangeOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Change Endorsement</DialogTitle>
                        <DialogDescription>
                            Increase or reduce your endorsement on this point.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                        <CredInput
                            credInput={changeAmount}
                            setCredInput={setChangeAmount}
                            notEnoughCred={!hasEnoughCred}
                            endorsementAmount={point?.viewerCred || 0}
                            isSelling={isSellingMode}
                            setIsSelling={setIsSellingMode}
                        />
                        <Button
                            className="w-full"
                            disabled={changeAmount === 0 || (!isSellingMode && !hasEnoughCred) || isEndorsing || isSelling}
                            onClick={handleChangeEndorsement}
                        >
                            {isEndorsing || isSelling ? <Loader className="mr-2 size-4" /> : null}
                            {isSellingMode ? "Reduce Endorsement" : "Increase Endorsement"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* More Actions Modal */}
            {hasMoreActions && (
                <Dialog open={isMoreActionsOpen} onOpenChange={setIsMoreActionsOpen}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>More Actions</DialogTitle>
                        </DialogHeader>
                        <div className="flex flex-col gap-2">
                            {/* Universal actions */}
                            <Button variant="outline" className="justify-start" onClick={() => { setIsMoreActionsOpen(false); handleCopyMarkdownLink(); }}>
                                <LinkIcon className="mr-2 size-4" /> Copy markdown link
                            </Button>
                            <Button variant="outline" className="justify-start" onClick={() => { setIsMoreActionsOpen(false); handleSelectNegateToRestake(); }}>
                                <Target className="mr-2 size-4" /> Select negate to restake
                            </Button>

                            {/* History action */}
                            {point?.isEdited && (
                                <Button variant="outline" className="justify-start" onClick={() => { setIsMoreActionsOpen(false); setHistoryDialogOpen(true); }}>
                                    <HistoryIcon className="mr-2 size-4" /> View history ({point?.editCount || 0})
                                </Button>
                            )}

                            {/* Owner actions */}
                            {isPointOwner && (
                                <Button variant="outline" className="justify-start" onClick={() => { setIsMoreActionsOpen(false); setEditDialogOpen(true); }}>
                                    <EditIcon className="mr-2 size-4" /> Edit point
                                </Button>
                            )}
                            {isPointOwner && (
                                <Button variant="destructive" className="justify-start" disabled={!canDeletePoint} onClick={() => { setIsMoreActionsOpen(false); setDeleteDialogOpen(true); }}>
                                    <TrashIcon className="mr-2 size-4" /> Delete point
                                </Button>
                            )}
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </SpaceLayout>
    );
}
