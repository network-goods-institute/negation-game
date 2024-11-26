import { Dialog, DialogClose, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { DialogProps } from "@radix-ui/react-dialog";
import { FC, useState, useEffect, useCallback, Fragment } from "react";
import { ArrowLeftIcon, TrendingUpIcon } from "lucide-react";
import { useDebounce } from "@uidotdev/usehooks";
import { Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis, Dot } from "recharts";

export interface RestakeDialogProps extends DialogProps {
  originalPoint: {
    id: number;
    content: string;
    createdAt: Date;
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
  const [localCredAmount, setLocalCredAmount] = useState(25);
  const debouncedCredAmount = useDebounce(localCredAmount, 100);

  // Mock data for the graph - current favor at 50, projected to increase by 20
  const currentTime = Date.now();
  const favorHistory = [
    { timestamp: new Date(currentTime - 2000), favor: 50 },
    { timestamp: new Date(currentTime + 8000), favor: 50 },
  ];

  useEffect(() => {
    if (!open) {
      setLocalCredAmount(25);
    }
  }, [open]);

  const handleSliderChange = useCallback((values: number[]) => {
    setLocalCredAmount(values[0]);
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
          <div className="absolute right-[8%] top-2 text-xs text-muted-foreground bg-background/80 px-2 py-1 rounded">
            Projected
          </div>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={favorHistory} className="[&>.recharts-surface]:overflow-visible">
              <XAxis dataKey="timestamp" hide />
              <YAxis domain={[0, 100]} hide />
              <Line
                animationDuration={300}
                dataKey="favor"
                type="linear"
                className="overflow-visible text-primary"
                dot={({ key, ...dot }) =>
                  favorHistory &&
                  dot.index === favorHistory.length - 1 ? (
                    <Fragment key={key}>
                      <Dot
                        {...dot}
                        fill={dot.stroke}
                        r={4}
                      />
                      <line
                        x1={dot.cx}
                        y1={dot.cy}
                        x2={dot.cx}
                        y2={dot.cy - 30}
                        stroke="currentColor"
                        strokeWidth={2}
                        strokeDasharray="4 4"
                      />
                      <circle
                        cx={dot.cx}
                        cy={dot.cy - 30}
                        r={4}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                      />
                      <text
                        x={dot.cx}
                        y={dot.cy - 40}
                        textAnchor="middle"
                        fill="currentColor"
                        className="text-xs"
                      >
                        +20 favor
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
            <span className="text-sm font-medium">Credibility Stake</span>
            <span className="text-sm text-muted-foreground">
              {debouncedCredAmount} / 100 cred
            </span>
          </div>
          
          <Slider
            value={[localCredAmount]}
            onValueChange={handleSliderChange}
            max={100}
            step={1}
            className="w-full"
          />
        </div>

        {/* Favor Indicator */}
        <div>
          <span className="inline-flex px-3 py-1 rounded-full bg-primary/10 text-primary text-sm">
            +20 favor
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