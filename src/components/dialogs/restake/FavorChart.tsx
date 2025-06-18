import { FC } from "react";
import { Loader } from "@/components/ui/loader";
import {
    Line,
    LineChart,
    ReferenceLine,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { TimelineScale, timelineScales } from "@/lib/negation-game/timelineScale";

export type FavorDataPoint = {
    timestamp: Date;
    favor: number;
    isProjection?: boolean;
};

interface FavorChartProps {
    favorHistory: FavorDataPoint[] | undefined;
    projectedData: FavorDataPoint[];
    isLoadingHistory: boolean;
    timelineScale: TimelineScale;
    onTimelineScaleChange: (scale: TimelineScale) => void;
    favorReduced: number;
    stakeAmount: number;
    slashAmount: number;
    favorImpact: number;
    openedFromSlashedIcon: boolean;
    isSlashing: boolean;
}

export const FavorChart: FC<FavorChartProps> = ({
    favorHistory,
    projectedData,
    isLoadingHistory,
    timelineScale,
    onTimelineScaleChange,
    favorReduced,
    stakeAmount,
    slashAmount,
    favorImpact,
    openedFromSlashedIcon,
    isSlashing,
}) => {
    return (
        <div className="space-y-4">
            {/* Timeline controls */}
            <div className="flex justify-between items-center pb-2">
                <ToggleGroup
                    type="single"
                    value={timelineScale}
                    onValueChange={(v) => v && onTimelineScaleChange(v as TimelineScale)}
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

            {/* Graph */}
            <div className="w-full h-32 relative bg-background">
                {isLoadingHistory ? (
                    <Loader className="absolute left-0 right-0 mx-auto top-[20px]" />
                ) : (
                    <>
                        <div className="sticky top-0 flex justify-end w-full">
                            <span className="text-xs text-muted-foreground bg-background/80 px-2 py-1 rounded-sm translate-x-[-12.5px]">
                                Projected
                            </span>
                        </div>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart
                                data={projectedData}
                                className="[&>.recharts-surface]:overflow-visible"
                                margin={{ top: 20, right: 45, bottom: 20, left: 45 }}
                            >
                                <XAxis dataKey="timestamp" hide />
                                <YAxis domain={[0, 100]} hide />
                                <ReferenceLine y={50} className="[&>line]:stroke-muted" />
                                <Tooltip
                                    wrapperClassName="backdrop-blur-md !bg-background/15 !pb-2 !pt-1 !px-2 rounded-lg shadow-[0_4px_20px_-2px_rgba(0,0,0,0.2)] border border-border/40"
                                    labelClassName="-top-3 text-muted-foreground text-xs"
                                    formatter={(value: number) => value.toFixed(2)}
                                    labelFormatter={(timestamp: Date) =>
                                        timestamp.toLocaleString()
                                    }
                                />
                                <Line
                                    animationDuration={0}
                                    dataKey="favor"
                                    type="stepAfter"
                                    className="overflow-visible text-endorsed"
                                    dot={({ cx, cy, payload, index }: any) => {
                                        const isLastPoint =
                                            index === projectedData.length - 1;
                                        if (!isLastPoint) return <g key={`dot-${index}`} />;

                                        const textY =
                                            openedFromSlashedIcon || isSlashing
                                                ? cy + 20
                                                : cy - 10;
                                        const textX =
                                            cx +
                                            (openedFromSlashedIcon
                                                ? -35
                                                : isSlashing
                                                    ? 30
                                                    : -35);
                                        const textAnchor = openedFromSlashedIcon
                                            ? "start"
                                            : isSlashing
                                                ? "end"
                                                : "start";

                                        return (
                                            <g key={`dot-${index}`}>
                                                <circle
                                                    cx={cx}
                                                    cy={cy}
                                                    r={4}
                                                    fill="currentColor"
                                                    className="animate-none text-endorsed"
                                                />
                                                {(favorReduced > 0 ||
                                                    stakeAmount > 0 ||
                                                    slashAmount > 0) && (
                                                        <text
                                                            x={textX}
                                                            y={textY}
                                                            textAnchor={textAnchor}
                                                            fill="currentColor"
                                                            className="text-xs whitespace-nowrap animate-none text-endorsed"
                                                        >
                                                            {
                                                                openedFromSlashedIcon
                                                                    ? `-${favorReduced}` // Doubting
                                                                    : isSlashing
                                                                        ? `-${favorImpact}` // Slashing
                                                                        : `+${stakeAmount}` // Restaking
                                                            }{" "}
                                                            favor
                                                        </text>
                                                    )}
                                            </g>
                                        );
                                    }}
                                    stroke="currentColor"
                                    strokeWidth={2}
                                    isAnimationActive={false}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </>
                )}
            </div>
        </div>
    );
}; 