"use client";

import { format } from "date-fns";
import { useMemo, useState, useEffect } from "react";
import Link from "next/link";

import { canvasEnabledAtom } from "@/atoms/canvasEnabledAtom";
import { hoveredPointIdAtom } from "@/atoms/hoveredPointIdAtom";
import { negatedPointIdAtom } from "@/atoms/negatedPointIdAtom";
import { negationContentAtom } from "@/atoms/negationContentAtom";
import { CredInput } from "@/components/CredInput";
import { NegateDialog } from "@/components/NegateDialog";
import { PointCard } from "@/components/PointCard";
import { PointStats } from "@/components/PointStats";
import { RestakeDialog } from "@/components/RestakeDialog";
import { SelectNegationDialog } from "@/components/SelectNegationDialog";
import { GraphView } from "@/components/graph/EncodedGraphView";
import { EndorseIcon } from "@/components/icons/EndorseIcon";
import { NegateIcon } from "@/components/icons/NegateIcon";
import { PointIcon } from "@/components/icons/AppIcons";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/ui/loader";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { DEFAULT_SPACE, DEFAULT_TIMESCALE } from "@/constants/config";
import { useBasePath } from "@/hooks/useBasePath";
import { useCredInput } from "@/hooks/useCredInput";
import { useVisitedPoints } from "@/hooks/useVisitedPoints";
import { cn } from "@/lib/cn";
import { decodeId } from "@/lib/decodeId";
import { encodeId } from "@/lib/encodeId";
import { preventDefaultIfContainsSelection } from "@/lib/preventDefaultIfContainsSelection";
import { TimelineScale, timelineScales } from "@/lib/timelineScale";
import { useEndorse } from "@/mutations/useEndorse";
import { useCounterpointSuggestions } from "@/queries/useCounterpointSuggestions";
import { useFavorHistory } from "@/queries/useFavorHistory";
import { usePrefetchPoint } from "@/queries/usePointData";
import { usePointNegations } from "@/queries/usePointNegations";
import { useSpace } from "@/queries/useSpace";
import { useUser } from "@/queries/useUser";
import { usePrivy } from "@privy-io/react-auth";
import { AvatarImage } from "@radix-ui/react-avatar";
import { useToggle } from "@uidotdev/usehooks";
import { ReactFlowProvider } from "@xyflow/react";
import { useAtom, useSetAtom } from "jotai";
import { useAtomCallback } from "jotai/utils";
import {
    ArrowLeftIcon,
    CircleXIcon,
    DiscIcon,
    NetworkIcon,
    Repeat2Icon,
    SparklesIcon,
} from "lucide-react";
import { nanoid } from "nanoid";
import { notFound, useRouter, useSearchParams, usePathname } from "next/navigation";
import { Fragment, useCallback } from "react";
import {
    Dot,
    Line,
    LineChart,
    ReferenceLine,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import { usePointData, pointQueryKey } from "@/queries/usePointData";
import { Badge } from "@/components/ui/badge";
import { useQueryClient } from "@tanstack/react-query";
import { usePrefetchRestakeData } from "@/hooks/usePrefetchRestakeData";
import { visitedPointsAtom } from "@/atoms/visitedPointsAtom";

type Point = {
    id: number;
    pointId: number;
    content: string;
    createdAt: Date;
    cred: number;
    stakedAmount: number;
    viewerCred?: number;
    amountSupporters: number;
    amountNegations: number;
    negationsCred: number;
    isCommand?: boolean;
    isPinned?: boolean;
    pinnedByCommandId?: number | null;
};

type PageProps = {
    params: { encodedPointId: string; space: string };
    searchParams: { [key: string]: string | string[] | undefined };
};

export function PointPageClient({
    params,
    searchParams: initialSearchParams,
}: PageProps) {
    // All hooks first
    const { user: privyUser, login, ready } = usePrivy();
    const { encodedPointId, space } = params;
    const pointId = decodeId(encodedPointId);
    const setNegatedPointId = useSetAtom(negatedPointIdAtom);
    const queryClient = useQueryClient();
    const setNegationContent = useAtomCallback(
        (_get, set, negatedPointId: number, content: string) => {
            set(negationContentAtom(negatedPointId), content);
        }
    );
    const basePath = useBasePath();
    const spaceData = useSpace(space);
    const [canvasEnabled, setCanvasEnabled] = useAtom(canvasEnabledAtom);
    const {
        data: point,
        refetch: refetchPoint,
        isLoading: isLoadingPoint,
    } = usePointData(pointId);
    const [timelineScale, setTimelineScale] = useState<TimelineScale>(DEFAULT_TIMESCALE);
    const {
        data: favorHistory,
        refetch: refetchFavorHistory,
        isFetching: isFetchingFavorHistory,
    } = useFavorHistory({ pointId, timelineScale });
    const { data: negations, isLoading: isLoadingNegations } = usePointNegations(pointId);
    const [hoveredPointId, setHoveredPointId] = useAtom(hoveredPointIdAtom);
    const { data: user } = useUser();
    const [endorsePopoverOpen, toggleEndorsePopoverOpen] = useToggle(false);
    const {
        credInput: cred,
        setCredInput: setCred,
        notEnoughCred,
    } = useCredInput({
        resetWhen: !endorsePopoverOpen,
    });
    const { back, push } = useRouter();
    const searchParams = useSearchParams();
    const viewParam = searchParams?.get("view");
    const counterpointSuggestions = useCounterpointSuggestions(point?.pointId);
    const [selectNegationDialogOpen, toggleSelectNegationDialog] = useToggle(false);
    const [restakePoint, setRestakePoint] = useState<{
        point: Point;
        counterPoint: Point;
        openedFromSlashedIcon?: boolean;
    } | null>(null);
    const prefetchPoint = usePrefetchPoint();
    const prefetchRestakeData = usePrefetchRestakeData();
    const { markPointAsRead } = useVisitedPoints();
    const pathname = usePathname();
    const { mutate: endorse } = useEndorse();
    const [_, setVisitedPoints] = useAtom(visitedPointsAtom);

    // Memoized values
    const initialNodes = useMemo(
        () => [
            {
                id: nanoid(),
                position: { x: 100, y: 100 },
                type: "point" as const,
                data: { pointId, expandOnInit: true },
            },
        ],
        [pointId]
    );

    // Effects next
    useEffect(() => {
        if (point === null) notFound();
    }, [point]);

    useEffect(() => {
        if (pointId) {
            markPointAsRead(pointId);
            setVisitedPoints(prev => {
                const newSet = new Set(prev);
                newSet.add(pointId);
                return newSet;
            });
        }
    }, [pointId, markPointAsRead, setVisitedPoints]);

    useEffect(() => {
        setCanvasEnabled(searchParams?.get("view") === "graph");
    }, [searchParams, setCanvasEnabled]);

    // Add this effect to mark point data as fresh when navigating back to this page
    useEffect(() => {
        // Mark the point data as fresh when this component mounts
        // This prevents unnecessary refetches when navigating back from feed
        if (privyUser?.id) {
            queryClient.setQueryData(
                pointQueryKey({ pointId, userId: privyUser?.id }),
                (oldData: any) => oldData
            );
        }
    }, [queryClient, privyUser?.id, pointId]);

    useEffect(() => {
        if (!negations || negations.length === 0) return;

        const batchSize = 5;
        const batches = Math.ceil(negations.length / batchSize);

        for (let i = 0; i < batches; i++) {
            setTimeout(() => {
                const start = i * batchSize;
                const end = Math.min(start + batchSize, negations.length);
                const batch = negations.slice(start, end);

                batch.forEach(negation => {
                    if (negation.pointId !== pointId) {
                        prefetchRestakeData(pointId, negation.pointId);
                    }
                });
            }, i * 10); // 10ms delay between batches
        }
    }, [negations, pointId, prefetchRestakeData]);

    // Derived state and callbacks
    const isInSpecificSpace = pathname?.includes('/s/') && !pathname.match(/^\/s\/global\//);
    const isGlobalSpace = spaceData.data?.id === 'global' || spaceData.data?.id === 'global/';
    const endorsedByViewer = point?.viewerCred !== undefined && point.viewerCred > 0;

    const loginOrMakePoint = useCallback(() => {
        if (user !== null && point?.pointId) {
            endorse({ pointId: point.pointId, cred });
            toggleEndorsePopoverOpen(false);
        } else {
            login();
        }
    }, [user, login, toggleEndorsePopoverOpen, point?.pointId, endorse, cred]);

    const handleEndorse = useCallback(() => {
        if (privyUser === null) {
            login();
            return;
        }
        toggleEndorsePopoverOpen();
    }, [privyUser, login, toggleEndorsePopoverOpen]);

    const handleNegate = useCallback((pointId: number) => {
        if (privyUser === null) {
            login();
            return;
        }
        setNegatedPointId(pointId);
    }, [privyUser, login, setNegatedPointId]);

    // Memoized values
    const parsePinCommand = useMemo(() => {
        // Multiple checks to ensure we don't show commands in global space
        if (isGlobalSpace || !isInSpecificSpace || spaceData.data?.id === 'global') {
            return null;
        }

        // Not a command or not a pin command or no content
        if (!point?.isCommand || !point.content || !point.content.startsWith('/pin ')) {
            return null;
        }

        const parts = point.content.split(' ').filter(Boolean);
        if (parts.length < 2) {
            return null;
        }

        return parts[1]; // The encoded ID
    }, [isInSpecificSpace, point?.isCommand, point?.content, spaceData.data?.id, isGlobalSpace]);

    const isPinned = useMemo(() => {
        // Don't show pinned indicators unless in a specific space
        if (!isInSpecificSpace) return false;
        return spaceData.data?.pinnedPointId === point?.pointId;
    }, [spaceData.data?.pinnedPointId, point?.pointId, isInSpecificSpace]);

    // Event handlers
    const handleTargetPointClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (parsePinCommand && spaceData.data?.id && isInSpecificSpace) {
            push(`/s/${spaceData.data.id}/${parsePinCommand}`);
        }
    };

    const handleCommandPointClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        // Navigate to the command point only if this is actually pinned
        if (point?.pinnedByCommandId && spaceData.data?.id && isInSpecificSpace && isPinned) {
            const encodedCommandId = encodeId(point.pinnedByCommandId);
            push(`/s/${spaceData.data.id}/${encodedCommandId}`);
        }
    };

    const handleNegationHover = useCallback((negationId: number) => {
        prefetchPoint(negationId);
        prefetchRestakeData(pointId, negationId);
    }, [prefetchPoint, prefetchRestakeData, pointId]);

    // Early return for loading state
    if (!ready) {
        return (
            <main className="flex items-center justify-center flex-grow">
                <Loader className="size-6" />
            </main>
        );
    }

    return (
        <main
            data-canvas-enabled={canvasEnabled}
            className="relative flex-grow sm:grid sm:grid-cols-[1fr_minmax(200px,600px)_1fr] data-[canvas-enabled=true]:md:grid-cols-[0_minmax(200px,400px)_1fr] bg-background"
        >
            <div className="w-full sm:col-[2] flex flex-col border-x pb-10 overflow-auto">
                {isLoadingPoint && (
                    <Loader className="absolute self-center my-auto top-0 bottom-0" />
                )}

                {point && (
                    <div className="@container/point relative flex-grow bg-background">
                        <div className="sticky top-0 z-10 w-full flex items-center justify-between gap-3 px-4 py-3 bg-background/70 backdrop-blur">
                            <div className="flex items-center gap-2">
                                <Button
                                    variant={"link"}
                                    size={"icon"}
                                    className="text-foreground -ml-3"
                                    onClick={() => {
                                        if (window.history.state?.idx > 0) {
                                            back();
                                            return;
                                        }

                                        push(`${basePath}/`);
                                    }}
                                >
                                    <ArrowLeftIcon />
                                </Button>
                                {spaceData.data && spaceData.data.id !== DEFAULT_SPACE ? (
                                    <>
                                        <Avatar className="border-4 border-background h-12 w-12">
                                            {spaceData.data.icon && (
                                                <AvatarImage
                                                    src={spaceData.data.icon}
                                                    alt={`s/${spaceData.data.id} icon`}
                                                />
                                            )}
                                            <AvatarFallback className="text-xl font-bold text-muted-foreground">
                                                {spaceData.data.id.charAt(0).toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                        <h1 className="text-lg  font-semibold">
                                            s/{spaceData.data.id}
                                        </h1>
                                    </>
                                ) : (
                                    <>
                                        <PointIcon />
                                        <h1 className="text-xl font-medium">Point</h1>
                                    </>
                                )}
                            </div>
                            <div className="flex gap-sm items-center text-muted-foreground">
                                <Button
                                    variant="ghost"
                                    className="p-2 rounded-full size-fit hover:bg-muted/30"
                                    onClick={() => toggleSelectNegationDialog(true)}
                                >
                                    <Repeat2Icon className="size-6 stroke-1" />
                                </Button>
                                <Button
                                    size={"icon"}
                                    variant={canvasEnabled ? "default" : "outline"}
                                    className="rounded-full p-2 size-9"
                                    onClick={() => {
                                        const newParams = new URLSearchParams(searchParams?.toString() || "");
                                        if (!canvasEnabled) {
                                            newParams.set("view", "graph");
                                        } else {
                                            newParams.delete("view"); // eslint-disable-line drizzle/enforce-delete-with-where
                                        }
                                        push(`?${newParams.toString()}`);
                                        setCanvasEnabled(!canvasEnabled);
                                    }}
                                >
                                    <NetworkIcon className="" />
                                </Button>
                                <Popover
                                    open={endorsePopoverOpen}
                                    onOpenChange={toggleEndorsePopoverOpen}
                                >
                                    {endorsedByViewer && (
                                        <span className="align-middle text-sm text-endorsed">
                                            {point.viewerCred} cred
                                        </span>
                                    )}
                                    <PopoverTrigger asChild>
                                        <Button
                                            className={cn(
                                                "p-2 rounded-full size-fit gap-sm hover:bg-endorsed/30",
                                                endorsedByViewer && "text-endorsed",
                                                "@md/point:border @md/point:px-4"
                                            )}
                                            variant={"ghost"}
                                            onClick={handleEndorse}
                                        >
                                            <EndorseIcon
                                                className={cn(
                                                    "@md/point:hidden",
                                                    endorsedByViewer && "fill-current"
                                                )}
                                            />
                                            <span className="hidden @md/point:inline">
                                                {point.viewerCred ? "Endorsed" : "Endorse"}
                                            </span>
                                        </Button>
                                    </PopoverTrigger>

                                    <PopoverContent className="flex flex-col items-start w-96">
                                        <div className="w-full flex justify-between">
                                            <CredInput
                                                credInput={cred}
                                                setCredInput={setCred}
                                                notEnoughCred={notEnoughCred}
                                            />
                                            <Button
                                                disabled={cred === 0 || notEnoughCred}
                                                onClick={() => {
                                                    loginOrMakePoint();
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
                                <Button
                                    variant="ghost"
                                    className={cn(
                                        "p-2  rounded-full size-fit hover:bg-primary/30",
                                        "@md/point:border @md/point:px-4"
                                    )}
                                    onClick={() => {
                                        if (point?.pointId) {
                                            handleNegate(point.pointId);
                                        }
                                    }}
                                >
                                    <NegateIcon className="@md/point:hidden" />
                                    <span className="hidden @md/point:inline">Negate</span>
                                </Button>
                            </div>
                        </div>

                        <div
                            data-show-hover={canvasEnabled && hoveredPointId === pointId}
                            onMouseEnter={() => setHoveredPointId(pointId)}
                            onMouseLeave={() => setHoveredPointId(undefined)}
                            className=" px-4 py-3 border-b data-[show-hover=true]:shadow-[inset_0_0_0_2px_hsl(var(--primary))]">
                            <div className="flex items-start gap-2">
                                <p className="tracking-tight text-md @xs/point:text-md @sm/point:text-lg mb-sm break-words whitespace-normal min-w-0">
                                    {point?.content}
                                </p>

                                {/* Show different badges based on pin status */}
                                {isPinned && isInSpecificSpace && spaceData.data?.id !== 'global' && point?.pinnedByCommandId && (
                                    <Badge variant="outline" className="text-xs shrink-0">
                                        {spaceData.data?.id ? (
                                            <Link
                                                href={`/s/${spaceData.data.id}/${encodeId(point.pinnedByCommandId)}`}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    e.preventDefault();
                                                }}
                                                className="inline-block w-full h-full"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                            >
                                                <Button
                                                    type="button"
                                                    variant="link"
                                                    className="h-auto p-0 text-muted-foreground hover:text-foreground w-full"
                                                    onClick={handleCommandPointClick}
                                                >
                                                    Pinned by command
                                                </Button>
                                            </Link>
                                        ) : (
                                            <Button
                                                type="button"
                                                variant="link"
                                                className="h-auto p-0 text-muted-foreground hover:text-foreground"
                                                onClick={handleCommandPointClick}
                                            >
                                                Pinned by command
                                            </Button>
                                        )}
                                    </Badge>
                                )}
                                {parsePinCommand && !isPinned && isInSpecificSpace && spaceData.data?.id !== 'global' && (
                                    <Badge variant="outline" className="text-xs shrink-0">
                                        {spaceData.data?.id ? (
                                            <Link
                                                href={`/s/${spaceData.data.id}/${parsePinCommand}`}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    e.preventDefault();
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
                            <span className="text-muted-foreground text-sm">
                                {point?.createdAt && format(point.createdAt, "h':'mm a '·' MMM d',' yyyy")}
                            </span>

                            <>
                                <ResponsiveContainer
                                    width="100%"
                                    height={100}
                                    className={"mt-md"}
                                >
                                    <LineChart
                                        width={300}
                                        height={100}
                                        data={favorHistory}
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
                                            dot={({ key, ...dot }) =>
                                                favorHistory &&
                                                    dot.index === favorHistory.length - 1 ? (
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
                                                )
                                            }
                                            stroke={"currentColor"}
                                            strokeWidth={2}
                                        />

                                        <Tooltip
                                            wrapperClassName="backdrop-blur-sm !bg-transparent !pb-0 rounded-sm"
                                            labelClassName=" -top-3 text-muted-foreground text-xs"
                                            formatter={(value: number) => value.toFixed(2)}
                                            labelFormatter={(timestamp: Date) =>
                                                timestamp.toLocaleString()
                                            }
                                        // position={{ y: 0 }}
                                        // offset={0}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
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
                            </>

                            <Separator className="my-md" />
                            <PointStats
                                className="justify-evenly ~@/lg:~text-xs/sm mb-sm"
                                favor={point.favor}
                                amountNegations={point.amountNegations}
                                amountSupporters={point.amountSupporters}
                                cred={point.cred}
                            />
                        </div>
                        <div className="relative flex flex-col">
                            {isLoadingNegations && (
                                <Loader className="absolute left-0 right-0 mx-auto top-[20px] bottom-auto" />
                            )}
                            {negations && negations.length > 0 && (
                                <>
                                    <span className="text-muted-foreground text-xs uppercase font-semibold tracking-widest w-full p-2 border-b text-center">
                                        negations
                                    </span>
                                    {negations
                                        .filter((negation) => negation.pointId !== pointId)
                                        .map((negation) => (
                                            <Link
                                                data-show-hover={
                                                    canvasEnabled && hoveredPointId === negation.pointId
                                                }
                                                draggable={false}
                                                onClick={preventDefaultIfContainsSelection}
                                                href={`${basePath}/${encodeId(negation.pointId)}${viewParam ? `?view=${viewParam}` : ""}`}
                                                key={negation.pointId}
                                                className={cn(
                                                    "flex cursor-pointer px-4 pt-5 pb-2 border-b hover:bg-accent data-[show-hover=true]:shadow-[inset_0_0_0_2px_hsl(var(--primary))]"
                                                )}
                                                onMouseEnter={() => handleNegationHover(negation.pointId)}
                                            >
                                                <PointCard
                                                    onNegate={(e) => {
                                                        e.preventDefault();
                                                        if (privyUser === null) {
                                                            login();
                                                            return;
                                                        }
                                                        handleNegate(negation.pointId);
                                                    }}
                                                    className="flex-grow -mt-3.5 pb-3"
                                                    favor={negation.favor}
                                                    content={negation.content}
                                                    createdAt={negation.createdAt}
                                                    amountSupporters={negation.amountSupporters}
                                                    amountNegations={negation.amountNegations}
                                                    pointId={negation.pointId}
                                                    cred={negation.cred}
                                                    viewerContext={{ viewerCred: negation.viewerCred }}
                                                    isNegation={true}
                                                    parentPoint={{
                                                        ...point,
                                                        id: point.pointId,
                                                        stakedAmount: point.cred,
                                                    }}
                                                    negationId={point.pointId}
                                                    onRestake={({ openedFromSlashedIcon }) => {
                                                        if (privyUser === null) {
                                                            login();
                                                            return;
                                                        }
                                                        setRestakePoint({
                                                            point: {
                                                                ...point,
                                                                stakedAmount: point.cred,
                                                                pointId: point.pointId,
                                                                id: point.pointId,
                                                            },
                                                            counterPoint: {
                                                                ...negation,
                                                                stakedAmount: negation.cred,
                                                                pointId: negation.pointId,
                                                                id: negation.pointId,
                                                            },
                                                            openedFromSlashedIcon,
                                                        });
                                                    }}
                                                    restake={negation.restake}
                                                    doubt={negation.doubt}
                                                    totalRestakeAmount={negation.totalRestakeAmount}
                                                />
                                            </Link>
                                        ))}
                                </>
                            )}

                            {!isLoadingNegations && negations?.length === 0 && (
                                <>
                                    <p className="w-full uppercase tracking-widest font-semibold text-xs text-center py-md border-b text-muted-foreground">
                                        No negations yet
                                    </p>
                                </>
                            )}

                            {counterpointSuggestions.length > 0 && (
                                <>
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
                                                if (privyUser === null) {
                                                    login();
                                                    return;
                                                }
                                                setNegationContent(pointId, suggestion);
                                                setNegatedPointId(point.pointId);
                                            }}
                                        >
                                            <div className="relative grid text-muted-foreground">
                                                <CircleXIcon className="shrink-0 size-6 stroke-1 text-muted-foreground col-start-1 row-start-1" />
                                            </div>
                                            <p className="tracking-tighter text-sm @sm/point:text-base -mt-0.5">
                                                {suggestion}
                                            </p>
                                        </div>
                                    ))}
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>
            {canvasEnabled && (
                <ReactFlowProvider>
                    <GraphView
                        onInit={(reactFlow) => {
                            reactFlow.addNodes(initialNodes);
                        }}
                        closeButtonClassName="md:hidden"
                        className="!fixed md:!sticky inset-0 top-[var(--header-height)] md:inset-[reset]  !h-[calc(100vh-var(--header-height))] md:top-[var(--header-height)] md: !z-10 md:z-auto"
                        rootPointId={pointId}
                        onClose={() => {
                            const newParams = new URLSearchParams(searchParams?.toString() || "");
                            newParams.delete("view"); // eslint-disable-line drizzle/enforce-delete-with-where
                            push(`?${newParams.toString()}`);
                            setCanvasEnabled(false);
                        }}
                    />
                </ReactFlowProvider>
            )}

            <NegateDialog />

            <SelectNegationDialog
                open={selectNegationDialogOpen}
                onOpenChange={toggleSelectNegationDialog}
                originalPoint={{
                    id: point?.pointId ?? 0,
                    content: point?.content ?? "",
                    createdAt: point?.createdAt ?? new Date(),
                    stakedAmount: point?.cred ?? 0,
                    viewerCred: point?.viewerCred,
                    amountSupporters: point?.amountSupporters ?? 0,
                    amountNegations: point?.amountNegations ?? 0,
                    negationsCred: point?.negationsCred ?? 0,
                }}
                negationId={point?.pointId ?? 0}
            />

            {restakePoint && (
                <RestakeDialog
                    open={restakePoint !== null}
                    onOpenChange={(open) => !open && setRestakePoint(null)}
                    originalPoint={restakePoint.point}
                    counterPoint={restakePoint.counterPoint}
                    onEndorseClick={() => toggleEndorsePopoverOpen(true)}
                    openedFromSlashedIcon={restakePoint.openedFromSlashedIcon}
                />
            )}
        </main>
    );
} 