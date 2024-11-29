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

export interface RestakeDialogProps extends DialogProps {
  originalPoint: {
    id: number;
    content: string;
    createdAt: Date;
    stakedAmount: number;
    viewerCred?: number;
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
        className="flex flex-col gap-6 p-4 sm:p-6 max-w-xl overflow-hidden"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2">
          <DialogClose asChild>
            <Button variant="ghost" size="icon" className="text-primary">
              <ArrowLeftIcon className="size-5" />
            </Button>
          </DialogClose>
          <DialogTitle className="sr-only">Get higher favor</DialogTitle>
        </div>

        {/* Original Point */}
        <div>
          <p className="text-lg font-medium">{originalPoint.content}</p>
        </div>

        {/* Graph */}
        <div className="w-full h-32 relative bg-background">
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
                  margin={{ top: 20, right: 20, bottom: 0, left: 20 }}
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

        {/* Credibility Section */}
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            I would relinquish {Math.round(actualStakeAmount * 10) / 10} cred if I learned that...
          </p>
          <p className="text-base">{counterPoint.content}</p>
        </div>

        {/* Add this message when user has no stake */}
        {maxStakeAmount === 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-md p-3">
            <AlertCircle className="size-4 shrink-0" />
            <p>You need to endorse this point before you can restake it</p>
          </div>
        )}

        {/* Slider Section */}
        <div 
          className={cn(
            "space-y-4",
            maxStakeAmount === 0 && "opacity-50"
          )}
        >
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Impact</span>
            <span className="text-sm text-muted-foreground">
              {Math.round(actualStakeAmount * 10) / 10} / {maxStakeAmount} cred ({stakePercentage}%)
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

        {/* Favor Indicator */}
        <div>
          <span className="inline-flex px-3 py-1 rounded-full bg-endorsed/10 text-endorsed text-sm">
            +{bonusFavor} favor
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 justify-end">
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
      </DialogContent>
    </Dialog>
  );
}; 