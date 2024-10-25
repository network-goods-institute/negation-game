"use client";
import { format } from "date-fns";

import { endorse } from "@/actions/endorse";
import { fetchPoint } from "@/actions/fetchPoint";
import { CredInput } from "@/components/CredInput";
import { NegateDialog } from "@/components/NegateDialog";
import { PointStats } from "@/components/PointStats";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/ui/loader";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useUser } from "@/hooks/useUser";
import { cn } from "@/lib/cn";
import { decodeId } from "@/lib/decodeId";
import { usePrivy } from "@privy-io/react-auth";
import { useQuery } from "@tanstack/react-query";
import { useToggle } from "@uidotdev/usehooks";
import {
  ArrowLeftIcon,
  CircleCheckBigIcon,
  CircleDotIcon,
  CircleSlash2Icon,
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
  const {
    data: point,
    refetch,
    isLoading,
  } = useQuery({
    queryKey: ["point", pointId],
    queryFn: () => {
      return fetchPoint(pointId);
    },
  });

  const { user: privyUser, login } = usePrivy();

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

  return (
    <main className="sm:grid sm:grid-cols-[1fr_minmax(200px,600px)_1fr] flex-grow min-h-screen gap-md  bg-background overflow-auto">
      <div className="w-full sm:col-[2] flex flex-col">
        {isLoading && <Loader />}

        {point && (
          <div className="@container/point relative flex-grow  border border-t-0 bg-background">
            <div className="sticky top-0 w-full flex items-center justify-between gap-3 px-4 py-3 bg-background/70 backdrop-blur">
              <div className="flex items-center gap-3">
                <Button
                  variant={"link"}
                  size={"icon"}
                  className="text-foreground -ml-3"
                  onClick={back}
                >
                  <ArrowLeftIcon />
                </Button>
                <CircleDotIcon className="shrink-0 size-6 text-muted-foreground" />
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
                            refetch();
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

            <div className="bg-background px-4 pb-3">
              <p className="tracking-tight text-md  @xs/point:text-md @sm/point:text-lg mb-sm">
                {point.content}
              </p>
              <PointStats
                favor={100}
                amountNegations={point.amountNegations}
                amountSupporters={point.amountSupporters}
                cred={point.cred}
              />
              <span className="text-muted-foreground text-sm">
                {format(point.createdAt, "h':'mm a '·' MMM d',' yyyy")}
              </span>
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
