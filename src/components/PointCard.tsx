import { cn } from "@/lib/cn";
import { HTMLAttributes, MouseEventHandler } from "react";
import { AuthenticatedActionButton, Button } from "./ui/button";

import { hoveredPointIdAtom } from "@/atoms/hoveredPointIdAtom";
import { CredInput } from "@/components/CredInput";
import { EndorseIcon } from "@/components/icons/EndorseIcon";
import { NegateIcon } from "@/components/icons/NegateIcon";
import { PointStats } from "@/components/PointStats";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useCredInput } from "@/hooks/useCredInput";
import { useEndorse } from "@/mutations/useEndorse";
import { usePrivy } from "@privy-io/react-auth";
import { useQueryClient } from "@tanstack/react-query";
import { useToggle } from "@uidotdev/usehooks";
import { useAtom } from "jotai";

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
}

export const PointCard = ({
  pointId,
  content,
  createdAt,
  className,
  cred,
  favor,
  amountSupporters: amountSupporters,
  amountNegations,
  viewerContext,
  onNegate,
  ...props
}: PointCardProps) => {
  const [hoveredPointId, setHoveredPointId] = useAtom(hoveredPointIdAtom);
  const endorsedByViewer =
    viewerContext?.viewerCred !== undefined && viewerContext.viewerCred > 0;
  const { mutateAsync: endorse } = useEndorse();

  const { user: privyUser, login } = usePrivy();

  const queryClient = useQueryClient();
  const [endorsePopoverOpen, toggleEndorsePopoverOpen] = useToggle(false);
  const { credInput, setCredInput, notEnoughCred } = useCredInput({
    resetWhen: !endorsePopoverOpen,
  });

  return (
    <div
      className={cn(
        "@container/point flex gap-3 pt-4 pb-3 px-4 relative rounded-none",
        className
      )}
      onMouseOver={() => setHoveredPointId(pointId)}
      onMouseLeave={() => setHoveredPointId(undefined)}
      {...props}
    >
      {/* <CircleDotIcon className="shrink-0 size-6  text-muted-foreground" /> */}
      <div className="flex flex-col">
        <p className="tracking-tight text-md  @xs/point:text-md @sm/point:text-lg mb-xs -mt-1 select-text">
          {content}
        </p>

        <PointStats
          className="mb-md select-text"
          amountNegations={amountNegations}
          amountSupporters={amountSupporters}
          favor={favor}
          cred={cred}
        />

        <div className="flex gap-sm w-full text-muted-foreground">
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
                  disabled={credInput === 0 || notEnoughCred}
                  onClick={() => {
                    endorse({ pointId, cred: credInput }).then(() => {
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
