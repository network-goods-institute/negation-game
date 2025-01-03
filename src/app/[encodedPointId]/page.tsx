"use client";
import { format } from "date-fns";

import { endorse } from "@/actions/endorse";
import { fetchFavorHistory } from "@/actions/fetchFavorHistory";
import { fetchPoint } from "@/actions/fetchPoint";
import { fetchPointNegations } from "@/actions/fetchPointNegations";
import { getCounterpointSuggestions } from "@/actions/getCounterpointSuggestions";
import { negationContentAtom } from "@/atoms/negationContentAtom";
import { CredInput } from "@/components/CredInput";
import { EndorseIcon } from "@/components/icons/EndorseIcon";
import { NegateIcon } from "@/components/icons/NegateIcon";
import { NegateDialog } from "@/components/NegateDialog";
import { PointCard } from "@/components/PointCard";
import { PointStats } from "@/components/PointStats";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/ui/loader";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { DEFAULT_TIMESCALE } from "@/constants/config";
import { useCredInput } from "@/hooks/useCredInput";
import { useUser } from "@/hooks/useUser";
import { cn } from "@/lib/cn";
import { decodeId } from "@/lib/decodeId";
import { encodeId } from "@/lib/encodeId";
import { TimelineScale, timelineScales } from "@/lib/timelineScale";
import { usePrivy } from "@privy-io/react-auth";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToggle } from "@uidotdev/usehooks";
import { useAtomCallback } from "jotai/utils";
import {
  ArrowLeftIcon,
  CircleXIcon,
  DiscIcon,
  Repeat2Icon,
  SparklesIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { preventDefaultIfContainsSelection } from "@/lib/preventDefaultIfContainsSelection";
import { SelectNegationDialog } from "@/components/SelectNegationDialog";
import { RestakeDialog } from "@/components/RestakeDialog";

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
  params: Promise<{ encodedPointId: string }>;
}) {
  const encodedPointId = use(params).encodedPointId;
  const pointId = decodeId(encodedPointId);
  const { user: privyUser, login } = usePrivy();
  const [negatedPoint, setNegatedPoint] = useState<
    { id: number; content: string; createdAt: Date; cred: number } | undefined
  >(undefined);
  const setNegationContent = useAtomCallback(
    (_get, set, negatedPointId: number, content: string) => {
      set(negationContentAtom(negatedPointId), content);
    }
  );
  const {
    data: point,
    refetch: refetchPoint,
    isLoading: isLoadingPoint,
  } = useQuery({
    queryKey: ["point", pointId, privyUser?.id],
    queryFn: () => {
      return fetchPoint(pointId);
    },
  });

  const [timelineScale, setTimelineScale] =
    useState<TimelineScale>(DEFAULT_TIMESCALE);
  const {
    data: favorHistory,
    refetch: refetchFavorHistory,
    isFetching: isFetchingFavorHistory,
  } = useQuery({
    queryKey: [pointId, "favor-history", timelineScale] as const,
    queryFn: ({ queryKey: [id, , scale] }) => {
      return fetchFavorHistory({ pointId: id, scale });
    },
    placeholderData: keepPreviousData,
    refetchInterval: 60000,
  });

  const { data: negations, isLoading: isLoadingNegations } = useQuery({
    queryKey: [pointId, "point-negations", privyUser?.id],
    queryFn: () => fetchPointNegations(pointId),
  });

  const endorsedByViewer =
    point?.viewerCred !== undefined && point.viewerCred > 0;

  const { data: user } = useUser();
  const [endorsePopoverOpen, toggleEndorsePopoverOpen] = useToggle(false);
  const { cred, setCred, notEnoughCred } = useCredInput({
    resetWhen: !endorsePopoverOpen,
  });

  const { back, push } = useRouter();

  const { data: counterpointSuggestions = [] } = useQuery({
    queryKey: ["counterpoint-suggestions", point?.id],
    queryFn: async ({ queryKey: [, pointId] }) => {
      const stream = await getCounterpointSuggestions(pointId as number);

      if (stream instanceof ReadableStream) {
        const reader = stream.getReader();
        const suggestions: string[] = [];
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) suggestions.push(value);
        }
        
        return suggestions;
      }
      
      return [];
    },
    enabled: !!point?.id,
    staleTime: Infinity,
  });

  console.log('Current counterpointSuggestions:', counterpointSuggestions);

  const [selectNegationDialogOpen, toggleSelectNegationDialog] = useToggle(false);
  const [restakePoint, setRestakePoint] = useState<{
    point: Point;
    counterPoint: Point;
    openedFromSlashedIcon?: boolean;
  } | null>(null);

  return (
    <main className="sm:grid sm:grid-cols-[1fr_minmax(200px,600px)_1fr] flex-grow  gap-md bg-background overflow-auto">
      <div className="w-full sm:col-[2] flex flex-col border-x pb-10">
        {isLoadingPoint && (
          <Loader className="absolute self-center my-auto top-0 bottom-0" />
        )}

        {point && (
          <div className="@container/point relative flex-grow   bg-background">
            <div className="sticky top-0 z-10 w-full flex items-center justify-between gap-3 px-4 py-3 bg-background/70 backdrop-blur">
              <div className="flex items-center gap-3">
                <Button
                  variant={"link"}
                  size={"icon"}
                  className="text-foreground -ml-3"
                  onClick={() => {
                    if (window.history.state?.idx > 0) {
                      back();
                      return;
                    }

                    push("/");
                  }}
                >
                  <ArrowLeftIcon />
                </Button>
                <DiscIcon className="shrink-0 size-6 text-muted-foreground stroke-1" />
                <h1 className="text-xl font-medium">Point</h1>
              </div>
              <div className="flex gap-sm items-center text-muted-foreground">
                <Button
                  variant="ghost"
                  className="p-2 rounded-full size-fit hover:bg-muted/30"
                  onClick={() => toggleSelectNegationDialog(true)}
                >
                  <Repeat2Icon className="size-6 stroke-1" />
                </Button>
                <SelectNegationDialog
                  open={selectNegationDialogOpen}
                  onOpenChange={toggleSelectNegationDialog}
                  originalPoint={{
                    id: point.id,
                    content: point.content,
                    createdAt: point.createdAt,
                    stakedAmount: point.cred,
                    viewerCred: point.viewerCred,
                    amountSupporters: point.amountSupporters,
                    amountNegations: point.amountNegations,
                    negationsCred: point.negationsCred
                  }}
                  negationId={point.id}
                />
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
                        cred={cred}
                        setCred={setCred}
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
                    privyUser !== null ? setNegatedPoint({
                      id: point.id,
                      content: point.content,
                      createdAt: point.createdAt,
                      cred: point.cred
                    }) : login()
                  }
                >
                  <NegateIcon className="@md/point:hidden" />
                  <span className="hidden @md/point:inline">Negate</span>
                </Button>
              </div>
            </div>

            <div className="bg-background px-4 pb-3 border-b">
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
                      wrapperClassName="backdrop-blur-md !bg-background/15 !pb-2 !pt-1 !px-2 rounded-lg shadow-[0_4px_20px_-2px_rgba(0,0,0,0.2)] border border-border/40"
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
                favor={favorHistory?.length ? Math.floor(favorHistory[favorHistory.length - 1].favor) : 50}
                amountNegations={point.amountNegations}
                amountSupporters={point.amountSupporters}
                cred={point.cred}
              />
            </div>
            <div className="relative flex flex-col">
              {isLoadingNegations && (
                <Loader className="absolute left-0 right-0 mx-auto top-[20px] bottom-auto" />
              )}
              {negations &&
                negations.map((negation) => {
                  return (
                    <Link
                      draggable={false}
                      onClick={preventDefaultIfContainsSelection}
                      href={`/${encodeId(negation.id)}`}
                      key={negation.id}
                      className={cn(
                        "flex cursor-pointer hover:bg-accent px-4 pt-5 pb-2 border-b"
                      )}
                    >
                      <div className="flex flex-col  items-center">
                        <CircleXIcon className="shrink-0 size-6 no-scaling-stroke stroke-1 text-muted-foreground " />
                      </div>
                      <PointCard
                        onNegate={(e) => {
                          e.preventDefault();
                          privyUser !== null ? setNegatedPoint({
                            id: negation.id,
                            content: negation.content,
                            createdAt: negation.createdAt,
                            cred: negation.cred
                          }) : login();
                        }}
                        className="flex-grow -mt-3.5 pb-3"
                        favor={negation.favor}
                        content={negation.content}
                        createdAt={negation.createdAt}
                        amountSupporters={negation.amountSupporters}
                        amountNegations={negation.amountNegations}
                        pointId={negation.id}
                        totalCred={negation.cred}
                        viewerContext={{ viewerCred: negation.cred }}
                        isNegation={true}
                        parentPoint={{
                          ...point,
                          id: point.id
                        }}
                        negationId={point.id}
                        onRestake={({openedFromSlashedIcon}) => {
                          if (privyUser === null) {
                            login();
                            return;
                          }
                          setRestakePoint({
                            point: {
                              ...point,
                              stakedAmount: point.cred,
                              pointId: point.id,
                              id: point.id
                            },
                            counterPoint: {
                              ...negation,
                              stakedAmount: negation.cred,
                              pointId: negation.id,
                              id: negation.id
                            },
                            openedFromSlashedIcon
                          });
                        }}
                        restake={negation.restake}
                      />
                    </Link>
                  );
                })}
              {!isLoadingNegations && negations?.length === 0 && (
                <p className="w-full text-center py-md border-b text-muted-foreground">
                  No negations yet
                </p>
              )}

              {Array.isArray(counterpointSuggestions) && counterpointSuggestions.length > 0 && (
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
                        setNegationContent(point.id, suggestion);
                        setNegatedPoint({
                          id: point.id,
                          content: point.content,
                          createdAt: point.createdAt,
                          cred: point.cred
                        });
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

      <NegateDialog
        negatedPoint={negatedPoint}
        open={negatedPoint !== undefined}
        onOpenChange={(isOpen: boolean) =>
          !isOpen && setNegatedPoint(undefined)
        }
      />
      {restakePoint && (
        <RestakeDialog
          open={restakePoint !== null}
          onOpenChange={(open) => !open && setRestakePoint(null)}
          originalPoint={restakePoint?.point}
          counterPoint={restakePoint?.counterPoint}
          onEndorseClick={() => toggleEndorsePopoverOpen(true)}
          openedFromSlashedIcon={restakePoint.openedFromSlashedIcon}
        />
      )}
    </main>
  );
}
