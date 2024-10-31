"use client";
import { format } from "date-fns";

import { endorse } from "@/actions/endorse";
import { fetchPoint } from "@/actions/fetchPoint";
import { fetchPointNegations } from "@/actions/fetchPointNegations";
import { getCounterpointSuggestions } from "@/actions/getCounterpointSuggestions";
import { CredInput } from "@/components/CredInput";
import { NegateDialog, negationContentAtom } from "@/components/NegateDialog";
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
import { useUser } from "@/hooks/useUser";
import { cn } from "@/lib/cn";
import { decodeId } from "@/lib/decodeId";
import { encodeId } from "@/lib/encodeId";
import { usePrivy } from "@privy-io/react-auth";
import { useQuery } from "@tanstack/react-query";
import { useToggle } from "@uidotdev/usehooks";
import { useSetAtom } from "jotai";
import {
  ArrowLeftIcon,
  CircleCheckBigIcon,
  CircleSlash2Icon,
  CircleXIcon,
  DiscIcon,
  SparklesIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";

export default function PointPage({
  params,
}: {
  params: Promise<{ encodedPointId: string }>;
}) {
  const encodedPointId = use(params).encodedPointId;
  const pointId = decodeId(encodedPointId);
  const { user: privyUser, login } = usePrivy();
  const setNegationContent = useSetAtom(negationContentAtom);
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

  const { data: negations, isLoading: isLoadingNegations } = useQuery({
    queryKey: ["point-negations", pointId, privyUser?.id],
    queryFn: () => fetchPointNegations(pointId),
  });

  const { push } = useRouter();

  const endorsedByViewer =
    point?.viewerCred !== undefined && point.viewerCred > 0;

  const [cred, setCred] = useState(0);
  const { data: user } = useUser();
  const notEnoughCred = !!user && user.cred < cred;
  const [endorsePopoverOpen, toggleEndorsePopoverOpen] = useToggle(false);
  useEffect(() => {
    if (!endorsePopoverOpen) setCred(0);
  }, [endorsePopoverOpen]);

  const { back } = useRouter();
  const [negatedPoint, setNegatedPoint] = useState<
    { id: number; content: string; createdAt: Date } | undefined
  >(undefined);

  const { data: counterpointSuggestionsStream } = useQuery({
    queryKey: ["counterpoint-suggestions", point?.id],
    queryFn: ({ queryKey: [, pointId] }) =>
      getCounterpointSuggestions(pointId as number),
    enabled: !!point?.id && negations && negations.length === 0,
    staleTime: Infinity,
  });

  const [counterpointSuggestions, setCounterpointSuggestions] = useState<
    string[]
  >([]);

  useEffect(() => {
    if (!counterpointSuggestionsStream) return;

    setCounterpointSuggestions([]);
    let isCancelled = false;

    const consumeStream = async () => {
      for await (const suggestion of counterpointSuggestionsStream) {
        setCounterpointSuggestions((prev) => [...prev, suggestion]);

        if (isCancelled) break;
      }
    };

    consumeStream();

    return () => {
      isCancelled = true;
    };
  }, [counterpointSuggestionsStream]);

  return (
    <main className="sm:grid sm:grid-cols-[1fr_minmax(200px,600px)_1fr] flex-grow  gap-md pb-10  bg-background overflow-auto">
      <div className="w-full sm:col-[2] flex flex-col border-x ">
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
                  onClick={back}
                >
                  <ArrowLeftIcon />
                </Button>
                <DiscIcon className="shrink-0 size-6 text-muted-foreground stroke-1" />
                <h1 className="text-xl font-medium">Point</h1>
              </div>
              <div className="flex gap-sm items-center text-muted-foreground">
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
                        }
                      }}
                      variant={"ghost"}
                    >
                      <CircleCheckBigIcon className="size-5 @md/point:hidden" />
                      <span className="hidden @md/point:inline">
                        {point.viewerCred ? "Endorsed" : "Endorse"}
                      </span>
                    </Button>
                  </PopoverTrigger>

                  <PopoverContent className="flex flex-col items-start w-96">
                    <div className="w-full flex justify-between">
                      <CredInput cred={cred} setCred={setCred} />
                      <Button
                        disabled={cred === 0 || notEnoughCred}
                        onClick={() => {
                          endorse({ pointId, cred }).then(() => {
                            refetchPoint();
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
                    privyUser !== null ? setNegatedPoint(point) : login()
                  }
                >
                  <CircleSlash2Icon className="size-5 @md/point:hidden" />
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
              <Separator className="my-md" />
              <PointStats
                className="justify-evenly ~@/lg:~text-xs/sm mb-sm"
                favor={100}
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
                negations.map((negation, i) => (
                  <div
                    key={negation.id}
                    className={cn(
                      "flex cursor-pointer hover:bg-accent px-4 pt-5 pb-2 border-b"
                    )}
                  >
                    <div className="flex flex-col  items-center">
                      <CircleXIcon className="shrink-0 size-6 no-scaling-stroke stroke-1 text-muted-foreground " />
                    </div>
                    <PointCard
                      onClick={() => push(`/${encodeId(negation.id)}`)}
                      className="flex-grow -mt-3.5 pb-3"
                      favor={100}
                      content={negation.content}
                      createdAt={negation.createdAt}
                      amountSupporters={negation.amountSupporters}
                      amountNegations={negation.amountNegations}
                      pointId={negation.id}
                      totalCred={negation.cred}
                      viewerContext={{ viewerCred: negation.viewerCred }}
                    />
                  </div>
                ))}
              {!isLoadingNegations && negations?.length === 0 && (
                <p className="w-full text-center py-md border-b text-muted-foreground">
                  No negations yet
                </p>
              )}

              {counterpointSuggestions.length > 0 && (
                <>
                  <p className="w-full text-center pt-sm text-muted-foreground text-xs animate-fade-in">
                    Try one of these AI-generated negations
                  </p>
                  {counterpointSuggestions.map((suggestion, i) => (
                    <div
                      key={`suggestion-${i}`}
                      className="flex gap-3 mt-3 mx-2 px-3 py-4 rounded-md border hover:bg-muted cursor-pointer animate-fade-in"
                      onClick={() => {
                        if (privyUser === null) {
                          login();
                          return;
                        }
                        setNegationContent(suggestion);
                        setNegatedPoint(point);
                      }}
                    >
                      <div className="relative grid text-muted-foreground">
                        <CircleXIcon className="shrink-0 size-6 no-scaling-stroke circle-dashed-3 stroke-1 text-muted-foreground col-start-1 row-start-1" />
                      </div>
                      <p className="tracking-tighter text-md  @sm/point:text-lg text-muted-foreground -mt-1">
                        <SparklesIcon className="size-[14px] inline-block align-baseline" />{" "}
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
    </main>
  );
}
