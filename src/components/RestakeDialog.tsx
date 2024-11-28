import { Dialog, DialogClose, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { DialogProps } from "@radix-ui/react-dialog";
import { FC, useState, useEffect, useCallback, Fragment } from "react";
import { ArrowLeftIcon, TrendingUpIcon } from "lucide-react";
import { Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis, Dot } from "recharts";
import { fetchFavorHistory } from "@/actions/fetchFavorHistory";
import { useQuery } from "@tanstack/react-query";
import { DEFAULT_TIMESCALE } from "@/constants/config";
import { TimelineScale } from "@/lib/timelineScale";
import { Loader } from "./ui/loader";

export interface RestakeDialogProps extends DialogProps {
  originalPoint: {
    id: number;
    content: string;
    createdAt: Date;
    stakedAmount: number;
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

  const actualStakeAmount = (originalPoint.stakedAmount * stakePercentage) / 100;
  const bonusFavor = Math.round(actualStakeAmount);

  // Get the current favor from the last data point
  const currentFavor = favorHistory?.length ? favorHistory[favorHistory.length - 1].favor : 50;
  
  const projectedData = favorHistory ? [
    ...favorHistory,
    {
      timestamp: new Date(Date.now() + 8000),
      favor: currentFavor,
      isProjection: true
    }
  ] : [];

  useEffect(() => {
    if (!open) {
      setStakePercentage(0);
    }
  }, [open]);

  const handleSliderChange = useCallback((values: number[]) => {
    setStakePercentage(values[0]);
  }, []);

  return (
    <Dialog {...props} open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="flex flex-col gap-6 p-4 sm:p-6 max-w-xl"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2">
          <DialogClose asChild>
            <Button variant="ghost" size="icon" className="text-primary">
              <ArrowLeftIcon className="size-5" />
            </Button>
          </DialogClose>
          <DialogTitle className="sr-only">Restake Points</DialogTitle>
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
              <div className="absolute right-[8%] top-2 text-xs text-muted-foreground bg-background/80 px-2 py-1 rounded">
                Projected
              </div>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={projectedData} className="[&>.recharts-surface]:overflow-visible">
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
                    animationDuration={300}
                    dataKey="favor"
                    type="stepAfter"
                    className="overflow-visible text-primary"
                    dot={({ key, ...dot }) =>
                      dot.payload.isProjection ? (
                        <Fragment key={key}>
                          <Dot {...dot} fill={dot.stroke} r={4} />
                          <line
                            x1={dot.cx}
                            y1={dot.cy}
                            x2={dot.cx}
                            y2={dot.cy - (bonusFavor * 2)}
                            stroke="currentColor"
                            strokeWidth={2}
                            strokeDasharray="4 4"
                          />
                          <circle
                            cx={dot.cx}
                            cy={dot.cy - (bonusFavor * 2)}
                            r={4}
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2}
                          />
                          <text
                            x={dot.cx}
                            y={dot.cy - (bonusFavor * 2) - 10}
                            textAnchor="middle"
                            fill="currentColor"
                            className="text-xs"
                          >
                            +{bonusFavor} favor
                          </text>
                        </Fragment>
                      ) : (
                        <Fragment key={key} />
                      )
                    }
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
            I would relinquish X cred if I learned that...
          </p>
          <p className="text-base">{counterPoint.content}</p>
        </div>

        {/* Slider Section */}
        <div 
          className="space-y-4"
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onPointerUp={(e) => e.stopPropagation()}
          onMouseUp={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Restake Percentage</span>
            <span className="text-sm text-muted-foreground">
              {Math.round(actualStakeAmount * 10) / 10} / {originalPoint.stakedAmount} cred ({stakePercentage}%)
            </span>
          </div>
          
          <Slider
            value={[stakePercentage]}
            onValueChange={handleSliderChange}
            max={100}
            step={1}
            className="w-full"
          />
        </div>

        {/* Favor Indicator */}
        <div>
          <span className="inline-flex px-3 py-1 rounded-full bg-primary/10 text-primary text-sm">
            +{bonusFavor} favor
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={() => onOpenChange?.(false)}>
            Cancel
          </Button>
          <Button variant="default" onClick={() => onOpenChange?.(false)}>
            Submit
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}; 