"use client";
import { format } from "date-fns";

import { canvasEnabledAtom } from "@/atoms/canvasEnabledAtom";
import { hoveredPointIdAtom } from "@/atoms/hoveredPointIdAtom";
import { negatedPointIdAtom } from "@/atoms/negatedPointIdAtom";
import { negationContentAtom } from "@/atoms/negationContentAtom";
import { CredInput } from "@/components/CredInput";
import { GraphView } from "@/components/graph/GraphView";
import { EndorseIcon } from "@/components/icons/EndorseIcon";
import { NegateIcon } from "@/components/icons/NegateIcon";
import { NegateDialog } from "@/components/NegateDialog";
import { PointCard } from "@/components/PointCard";
import { PointStats } from "@/components/PointStats";
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
import { cn } from "@/lib/cn";
import { decodeId } from "@/lib/decodeId";
import { encodeId } from "@/lib/encodeId";
import { preventDefaultIfContainsSelection } from "@/lib/preventDefaultIfContainsSelection";
import { TimelineScale, timelineScales } from "@/lib/timelineScale";
import { useEndorse } from "@/mutations/useEndorse";
import { useCounterpointSuggestions } from "@/queries/useCounterpointSuggestions";
import { useFavorHistory } from "@/queries/useFavorHistory";
import { usePointNegations } from "@/queries/usePointNegations";
import { useSpace } from "@/queries/useSpace";
import { useUser } from "@/queries/useUser";
import { usePrivy } from "@privy-io/react-auth";
import { AvatarImage } from "@radix-ui/react-avatar";
import { useToggle } from "@uidotdev/usehooks";
import { useAtom, useSetAtom } from "jotai";
import { useAtomCallback } from "jotai/utils";
import {
  ArrowLeftIcon,
  CircleXIcon,
  DiscIcon,
  NetworkIcon,
  SparklesIcon,
  Repeat2Icon,
} from "lucide-react";
import Link from "next/link";
import { notFound, useRouter } from "next/navigation";
import { Fragment, use, useEffect, useState } from "react";
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
import { usePointData } from "../../../../queries/usePointData";
import { SelectNegationDialog } from "@/components/SelectNegationDialog";
import { RestakeDialog } from "@/components/RestakeDialog";
import { usePrefetchPoint } from "@/hooks/usePrefetchPoint";

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
};

export default function PointPage({
  params,
}: {
  params: Promise<{ encodedPointId: string; space: string }>;
}) {
  const encodedPointId = use(params).encodedPointId;
  const pointId = decodeId(encodedPointId);
  const { user: privyUser, login, ready } = usePrivy();
  const setNegatedPointId = useSetAtom(negatedPointIdAtom);
  const setNegationContent = useAtomCallback(
    (_get, set, negatedPointId: number, content: string) => {
      set(negationContentAtom(negatedPointId), content);
    }
  );

  const basePath = useBasePath();
  const space = useSpace();

  const { mutateAsync: endorse } = useEndorse();

  const [canvasEnabled, setCanvasEnabled] = useAtom(canvasEnabledAtom);

  const {
    data: point,
    refetch: refetchPoint,
    isLoading: isLoadingPoint,
  } = usePointData(pointId);

  useEffect(() => {
    if (point === null) notFound();
  }, [point]);

  const [timelineScale, setTimelineScale] =
    useState<TimelineScale>(DEFAULT_TIMESCALE);
  const {
    data: favorHistory,
    refetch: refetchFavorHistory,
    isFetching: isFetchingFavorHistory,
  } = useFavorHistory({ pointId, timelineScale });

  const { data: negations, isLoading: isLoadingNegations } =
    usePointNegations(pointId);

  const endorsedByViewer =
    point?.viewerCred !== undefined && point.viewerCred > 0;

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

  const counterpointSuggestions = useCounterpointSuggestions(point?.pointId);

  const [selectNegationDialogOpen, toggleSelectNegationDialog] = useToggle(false);
  const [restakePoint, setRestakePoint] = useState<{
    point: Point;
    counterPoint: Point;
    openedFromSlashedIcon?: boolean;
  } | null>(null);

  const prefetchPoint = usePrefetchPoint();

  // If Privy isn't ready yet, show loading state
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
                {space?.data && space.data.id !== DEFAULT_SPACE ? (
                  <>
                    <Avatar className="border-4 border-background h-12 w-12">
                      {space.data.icon && (
                        <AvatarImage
                          src={space.data.icon}
                          alt={`s/${space.data.id} icon`}
                        />
                      )}
                      <AvatarFallback className="text-xl font-bold text-muted-foreground">
                        {space.data.id.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <h1 className="text-lg  font-semibold">
                      s/{space.data.id}
                    </h1>
                  </>
                ) : (
                  <>
                    <DiscIcon className="shrink-0 size-6 text-muted-foreground stroke-1" />
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
                  onClick={() => setCanvasEnabled(!canvasEnabled)}
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
                      onClick={(e) => {
                        if (privyUser === null) {
                          e.preventDefault();
                          login();
                          return;
                        }
                        toggleEndorsePopoverOpen();
                      }}
                      variant={"ghost"}
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
                          endorse({ pointId, cred }).then(() => {
                            refetchPoint();
                            refetchFavorHistory();
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
                <Button
                  variant="ghost"
                  className={cn(
                    "p-2  rounded-full size-fit hover:bg-primary/30",
                    "@md/point:border @md/point:px-4"
                  )}
                  onClick={() =>
                    privyUser !== null
                      ? setNegatedPointId(point.pointId)
                      : login()
                  }
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
              className=" px-4 py-3 border-b data-[show-hover=true]:shadow-[inset_0_0_0_2px_hsl(var(--primary))]"
            >
              <p className="tracking-tight text-md  @xs/point:text-md @sm/point:text-lg mb-sm">
                {point.content}
              </p>
              <span className="text-muted-foreground text-sm">
                {format(point.createdAt, "h':'mm a '·' MMM d',' yyyy")}
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
                    .filter(negation => negation.pointId !== pointId)
                    .map((negation) => (
                      <Link
                        data-show-hover={
                          canvasEnabled && hoveredPointId === negation.pointId
                        }
                        draggable={false}
                        onClick={preventDefaultIfContainsSelection}
                        href={`${basePath}/${encodeId(negation.pointId)}`}
                        key={negation.pointId}
                        className={cn(
                          "flex cursor-pointer px-4 pt-5 pb-2 border-b hover:bg-accent data-[show-hover=true]:shadow-[inset_0_0_0_2px_hsl(var(--primary))]"
                        )}
                        onMouseEnter={() => prefetchPoint(negation.pointId)}
                      >
                        <PointCard
                          onNegate={(e) => {
                            e.preventDefault();
                            user !== null ? setNegatedPointId(negation.pointId) : login();
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
                            stakedAmount: point.cred
                          }}
                          negationId={point.pointId}
                          onRestake={({openedFromSlashedIcon}) => {
                            if (privyUser === null) {
                              login();
                              return;
                            }
                            setRestakePoint({
                              point: {
                                ...point,
                                stakedAmount: point.cred,
                                pointId: point.pointId,
                                id: point.pointId
                              },
                              counterPoint: {
                                ...negation,
                                stakedAmount: negation.cred,
                                pointId: negation.pointId,
                                id: negation.pointId
                              },
                              openedFromSlashedIcon
                            });
                          }}
                          restake={negation.restake}
                          doubt={negation.doubt}
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
                      className="flex gap-3 mt-3 mx-2 px-3 py-4 rounded-md border border-dashed hover:bg-muted cursor-pointer animate-fade-in"
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
        <GraphView
          closeButtonClassName="md:hidden"
          className="!fixed md:!sticky inset-0 top-[var(--header-height)] md:inset-[reset]  !h-[calc(100vh-var(--header-height))] md:top-[var(--header-height)] md: !z-10 md:z-auto"
          rootPointId={pointId}
          onClose={() => setCanvasEnabled(false)}
        />
      )}

      <NegateDialog />

      <SelectNegationDialog
        open={selectNegationDialogOpen}
        onOpenChange={toggleSelectNegationDialog}
        originalPoint={{
          id: point?.pointId ?? 0,
          content: point?.content ?? '',
          createdAt: point?.createdAt ?? new Date(),
          stakedAmount: point?.cred ?? 0,
          viewerCred: point?.viewerCred,
          amountSupporters: point?.amountSupporters ?? 0,
          amountNegations: point?.amountNegations ?? 0,
          negationsCred: point?.negationsCred ?? 0
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
