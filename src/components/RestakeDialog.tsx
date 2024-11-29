import { Dialog, DialogClose, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { DialogProps } from "@radix-ui/react-dialog";
import { FC, useState, useEffect, useCallback } from "react";
import { ArrowLeftIcon, AlertCircle } from "lucide-react";
import { Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fetchFavorHistory } from "@/actions/fetchFavorHistory";
import { useQuery } from "@tanstack/react-query";
import { DEFAULT_TIMESCALE } from "@/constants/config";
import { TimelineScale } from "@/lib/timelineScale";
import { Loader } from "./ui/loader";
import { cn } from "@/lib/cn";
import { endorse } from "@/actions/endorse";
import { CredInput } from "@/components/CredInput";
import { useCredInput } from "@/hooks/useCredInput";
import { useQueryClient } from "@tanstack/react-query";
import { useToggle } from "@uidotdev/usehooks";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { timelineScales } from "@/lib/timelineScale";
import { PointStats } from "@/components/PointStats";
import { favor } from "@/lib/negation-game/favor";
import { format } from "date-fns";

export interface RestakeDialogProps extends DialogProps {
  originalPoint: {
    id: number;
    content: string;
    createdAt: Date;
    stakedAmount: number;
    viewerCred?: number;
    cred: number;
    negationsCred: number;
    amountSupporters: number;
    amountNegations: number;
  };
  counterPoint: {
    id: number;
    content: string;
    createdAt: Date;
  };
}

export const RestakeDialog: FC<RestakeDialogProps> = ({
  originalPoint,
  counterPoint,
  open,
  onOpenChange,
  ...props
}) => {
  const [stakePercentage, setStakePercentage] = useState(0);
  const [timelineScale, setTimelineScale] = useState<TimelineScale>(DEFAULT_TIMESCALE);
  const [endorsePopoverOpen, toggleEndorsePopoverOpen] = useToggle(false);
  const { cred, setCred, notEnoughCred } = useCredInput({
    resetWhen: !endorsePopoverOpen,
  });
  const queryClient = useQueryClient();

  const { data: favorHistory, isLoading: isLoadingHistory } = useQuery({
    queryKey: ["favor-history", originalPoint.id, timelineScale],
    queryFn: () => fetchFavorHistory({ 
      pointId: originalPoint.id, 
      scale: timelineScale 
    }),
    enabled: open,
  });

  const maxStakeAmount = originalPoint.viewerCred || 0;
  const actualStakeAmount = (maxStakeAmount * stakePercentage) / 100;
  const bonusFavor = Math.round(actualStakeAmount);

  // Get the current favor from the last data point
  const currentFavor = favorHistory?.length ? favorHistory[favorHistory.length - 1].favor : 50;
  
  const handleSliderChange = useCallback((values: number[]) => {
    setStakePercentage(values[0]);
  }, []);

  const projectedData = favorHistory ? [
    ...favorHistory,
    {
      timestamp: new Date(Date.now() + 8000),
      favor: currentFavor + bonusFavor,
      isProjection: true
    }
  ] : [];

  useEffect(() => {
    if (!open) {
      setStakePercentage(0);
    }
  }, [open]);

  return (
    <Dialog {...props} open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="flex flex-col gap-4 p-4 sm:p-6 max-w-xl overflow-hidden"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-2 pb-2 border-b">
          <div className="flex items-center gap-2">
            <DialogClose asChild>
              <Button variant="ghost" size="icon" className="text-primary">
                <ArrowLeftIcon className="size-5" />
              </Button>
            </DialogClose>
            <DialogTitle>Get higher favor</DialogTitle>
          </div>
          
          <Popover open={endorsePopoverOpen} onOpenChange={toggleEndorsePopoverOpen}>
            <PopoverTrigger asChild>
              <Button 
                variant="ghost" 
                className={cn(
                  "border px-4",
                  (originalPoint.viewerCred || 0) > 0 && "text-endorsed"
                )}
              >
                {(originalPoint.viewerCred || 0) > 0 ? "Endorsed" : "Endorse"}
                {(originalPoint.viewerCred || 0) > 0 && (
                  <span className="ml-2">{originalPoint.viewerCred} cred</span>
                )}
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
                    endorse({ pointId: originalPoint.id, cred }).then(() => {
                      queryClient.invalidateQueries({ 
                        queryKey: ["point", originalPoint.id] 
                      });
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

        {/* Original Point with Date */}
        <div className="space-y-2 pb-2">
          <p className="text-lg font-medium">{originalPoint.content}</p>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm">
              {format(originalPoint.createdAt, "h':'mm a '·' MMM d',' yyyy")}
            </span>
            <span className="inline-flex px-3 py-1 rounded-full bg-endorsed/10 text-endorsed text-sm">
              {favor({ cred: originalPoint.cred, negationsCred: originalPoint.negationsCred })} favor
            </span>
          </div>
        </div>

        {/* Timeline Controls */}
        <div className="flex justify-between items-center pb-2">
          <ToggleGroup
            type="single"
            value={timelineScale}
            onValueChange={(v) => v && setTimelineScale(v as TimelineScale)}
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
          </ToggleGroup>
          <Loader
            className="text-muted-foreground size-4"
            style={{
              display: isLoadingHistory ? "block" : "none",
            }}
          />
        </div>

        {/* Graph Section */}
        <div className="w-full h-32 relative bg-background mb-4">
          {isLoadingHistory ? (
            <Loader className="absolute left-0 right-0 mx-auto top-[20px]" />
          ) : (
            <>
              <div className="sticky top-0 flex justify-end w-full">
                <span className="text-xs text-muted-foreground bg-background/80 px-2 py-1 rounded-sm">
                  Projected
                </span>
              </div>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart 
                  data={projectedData} 
                  className="[&>.recharts-surface]:overflow-visible"
                  margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                >
                  <XAxis dataKey="timestamp" hide />
                  <YAxis domain={[0, 100]} hide />
                  <ReferenceLine y={50} className="[&>line]:stroke-muted" />
                  <Tooltip
                    wrapperClassName="backdrop-blur-sm !bg-transparent !pb-0 rounded-sm"
                    labelClassName="-top-3 text-muted-foreground text-xs"
                    formatter={(value: number) => value.toFixed(2)}
                    labelFormatter={(timestamp: Date) => timestamp.toLocaleString()}
                  />
                  <Line
                    animationDuration={0}
                    dataKey="favor"
                    type="stepAfter"
                    className="overflow-visible text-endorsed"
                    dot={({ cx, cy, key }: any) => {
                      const isLastPoint = projectedData.length > 0 && 
                        key === `dot-${projectedData.length - 1}`;
                      if (!isLastPoint) return <g key={key}></g>;

                      return (
                        <g key={key}>
                          <circle cx={cx} cy={cy} r={4} fill="currentColor" />
                          <text
                            x={cx}
                            y={cy - 10}
                            textAnchor="middle"
                            fill="currentColor"
                            className="text-xs whitespace-nowrap"
                          >
                            +{bonusFavor} favor
                          </text>
                        </g>
                      );
                    }}
                    stroke="currentColor"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </>
          )}
        </div>

        {/* Stats */}
        <PointStats
          className="justify-evenly ~@/lg:~text-xs/sm border-t pt-2"
          favor={favor({ 
            cred: originalPoint.cred,
            negationsCred: originalPoint.negationsCred
          })}
          amountNegations={originalPoint.amountNegations}
          amountSupporters={originalPoint.amountSupporters}
          cred={originalPoint.cred}
        />

        {/* Credibility Section with Date */}
        <div className="space-y-3 pt-2 border-t">
          <p className="text-sm text-muted-foreground">
            I would relinquish {Math.round(actualStakeAmount * 10) / 10} cred if I learned that...
          </p>
          <div className="space-y-2">
            <p className="text-base">{counterPoint.content}</p>
            <span className="text-muted-foreground text-sm">
              {format(counterPoint.createdAt, "h':'mm a '·' MMM d',' yyyy")}
            </span>
          </div>
        </div>

        {/* No Stake Warning */}
        {maxStakeAmount === 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-md p-3">
            <AlertCircle className="size-4 shrink-0" />
            <p>You need to endorse this point before you can restake.</p>
          </div>
        )}

        {/* Slider Section */}
        <div className={cn(
          "space-y-4 pt-2 border-t",
          maxStakeAmount === 0 && "opacity-50"
        )}>
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Impact</span>
            <span className="text-sm text-muted-foreground">
              {Math.round(actualStakeAmount * 10) / 10} / {maxStakeAmount} staked ({stakePercentage}%)
            </span>
          </div>
          
          <Slider
            value={[stakePercentage]}
            onValueChange={handleSliderChange}
            max={100}
            step={1}
            className="w-full"
            disabled={maxStakeAmount === 0}
          />
        </div>

        {/* Favor Indicator and Actions */}
        <div className="flex items-center justify-between pt-2 border-t">
          <span className="inline-flex px-3 py-1 rounded-full bg-endorsed/10 text-endorsed text-sm">
            +{bonusFavor} favor
          </span>
          
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => onOpenChange?.(false)}>
              Cancel
            </Button>
            <Button 
              variant="default" 
              className="bg-endorsed hover:bg-endorsed/90"
              onClick={() => onOpenChange?.(false)}
              disabled={maxStakeAmount === 0}
            >
              Submit
            </Button>
          </div>
        </div>

      </DialogContent>
    </Dialog>
  );
}; 