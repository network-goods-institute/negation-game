import { cn } from "@/lib/cn";
import { HTMLAttributes, MouseEventHandler, useEffect, useState } from "react";
import { Button } from "./ui/button";

import { endorse } from "@/actions/endorse";
import { CredInput } from "@/components/CredInput";
import { PointStats } from "@/components/PointStats";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useUser } from "@/hooks/useUser";
import { usePrivy } from "@privy-io/react-auth";
import { useQueryClient } from "@tanstack/react-query";
import { useToggle } from "@uidotdev/usehooks";
import { CircleCheckBigIcon, CircleSlash2Icon } from "lucide-react";
import { useRouter } from "next/navigation";

export interface PointCardProps extends HTMLAttributes<HTMLDivElement> {
  pointId: number;
  content: string;
  createdAt: Date;
  totalCred: number;
  favor: number;
  amountSupporters: number;
  amountNegations: number;
  viewerContext?: {
    viewerCred?: number;
  };
  onNegate?: MouseEventHandler<HTMLButtonElement>;
  leftSlot?: React.ReactNode;
  bottomSlot?: React.ReactNode;
}

export const PointCard = ({
  pointId,
  content,
  createdAt,
  className,
  totalCred,
  favor,
  amountSupporters: amountSupporters,
  amountNegations,
  viewerContext,
  onNegate,
  ...props
}: PointCardProps) => {
  const endorsedByViewer =
    viewerContext?.viewerCred !== undefined && viewerContext.viewerCred > 0;

  const { user: privyUser, login } = usePrivy();

  const [cred, setCred] = useState(0);
  const { data: user } = useUser();
  const notEnoughCred = !!user && user.cred < cred;
  const queryClient = useQueryClient();
  const [endorsePopoverOpen, toggleEndorsePopoverOpen] = useToggle(false);
  useEffect(() => {
    if (!endorsePopoverOpen) setCred(0);
  }, [endorsePopoverOpen]);
  const { push } = useRouter();

  return (
    <div
      className={cn(
        "@container/point flex gap-3 pt-4 pb-3 px-4 relative rounded-none",
        className
      )}
      {...props}
    >
      {/* <CircleDotIcon className="shrink-0 size-6  text-muted-foreground" /> */}
      <div className="flex flex-col">
        <p className="tracking-tight text-md  @xs/point:text-md @sm/point:text-lg mb-xs -mt-1">
          {content}
        </p>

        <PointStats
          amountNegations={amountNegations}
          amountSupporters={amountSupporters}
          favor={favor}
          cred={totalCred}
        />

        <div className="flex gap-sm w-full text-muted-foreground">
          <Button
            variant="ghost"
            className="p-2 -ml-3 -mb-2 rounded-full size-fit hover:bg-negated/30"
            onClick={(e) => {
              e.stopPropagation();
              onNegate?.(e);
            }}
          >
            <CircleSlash2Icon className="size-5" />
          </Button>
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
                  "p-2 rounded-full -mb-2 size-fit gap-sm hover:bg-endorsed/30",
                  endorsedByViewer && "text-endorsed pr-3"
                )}
                variant={"ghost"}
              >
                <CircleCheckBigIcon className="size-5" />{" "}
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
                <CredInput cred={cred} setCred={setCred} />
                <Button
                  disabled={cred === 0 || notEnoughCred}
                  onClick={() => {
                    endorse({ pointId, cred }).then(() => {
                      queryClient.invalidateQueries({ queryKey: ["feed"] });
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
        </div>
      </div>
    </div>
  );
};
