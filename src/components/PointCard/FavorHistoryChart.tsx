import React, { Fragment } from "react";
import {
    Line,
    LineChart,
    ReferenceLine,
    ResponsiveContainer,
    Tooltip as RechartsTooltip,
    XAxis,
    YAxis,
    Dot,
} from "recharts";

export interface FavorHistoryChartProps {
    popoverFavorHistory: Array<{ timestamp: Date; favor: number }> | null;
    initialFavorHistory: Array<{ timestamp: Date; favor: number }>;
    favor: number;
    isLoadingFavorHistory: boolean;
}

export const FavorHistoryChart: React.FC<FavorHistoryChartProps> = ({
    popoverFavorHistory,
    initialFavorHistory,
    favor,
    isLoadingFavorHistory,
}) => {
    const historyToUse = popoverFavorHistory || initialFavorHistory;

    // If we have valid history data
    if (Array.isArray(historyToUse)) {
        // If we only have one point, duplicate it to show a meaningful graph
        const dataPoints =
            historyToUse.length === 1
                ? [
                    {
                        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
                        favor: historyToUse[0].favor,
                    },
                    historyToUse[0],
                ]
                : historyToUse;

        const isLimitedHistory =
            dataPoints.length === 2 && dataPoints[0].favor === dataPoints[1].favor;

        return (
            <div className="mt-2">
                <div className="flex flex-col mb-2">
                    <h4 className="text-sm font-semibold">Favor History</h4>
                    {isLimitedHistory && (
                        <span className="text-xs text-muted-foreground">
                            Limited history available
                        </span>
                    )}
                </div>
                <ResponsiveContainer width="100%" height={100}>
                    <LineChart
                        width={300}
                        height={100}
                        data={dataPoints}
                        className="[&>.recharts-surface]:overflow-visible"
                    >
                        <XAxis dataKey="timestamp" hide />
                        <YAxis domain={[0, 100]} hide />
                        <ReferenceLine y={50} className="[&>line]:stroke-muted" />
                        <Line
                            animationDuration={300}
                            dataKey="favor"
                            type="stepAfter"
                            className="overflow-visible text-endorsed"
                            dot={({ key, ...dot }) => {
                                if (dot.index === undefined) return <Fragment key={key} />;
                                return dot.index === dataPoints.length - 1 ? (
                                    <React.Fragment key={key}>
                                        <Dot
                                            key={`${key}-ping`}
                                            {...dot}
                                            fill={dot.stroke}
                                            className="animate-ping"
                                            style={{ transformOrigin: `${dot.cx}px ${dot.cy}px` }}
                                        />
                                        <Dot key={`${key}-main`} {...dot} fill={dot.stroke} />
                                    </React.Fragment>
                                ) : (
                                    <Fragment key={key} />
                                );
                            }}
                            stroke="currentColor"
                            strokeWidth={2}
                        />
                        <RechartsTooltip
                            wrapperClassName="backdrop-blur-sm !bg-transparent !pb-0 rounded-sm"
                            labelClassName=" -top-3 text-muted-foreground text-xs"
                            formatter={(value: number) => value.toFixed(2)}
                            labelFormatter={(timestamp: Date) => timestamp.toLocaleString()}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        );
    }

    // Loading state
    if (isLoadingFavorHistory) {
        return (
            <div className="mt-2 h-[120px] animate-pulse flex flex-col items-center justify-center">
                <div className="w-full h-4 bg-muted rounded mb-2"></div>
                <div className="w-3/4 h-20 bg-muted/50 rounded"></div>
            </div>
        );
    }

    // Default fallback
    const defaultData = [
        { timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), favor },
        { timestamp: new Date(), favor },
    ];
    return (
        <div className="mt-2">
            <div className="flex flex-col mb-2">
                <h4 className="text-sm font-semibold">Favor History</h4>
                <span className="text-xs text-muted-foreground">
                    Limited history available
                </span>
            </div>
            <ResponsiveContainer width="100%" height={100}>
                <LineChart
                    width={300}
                    height={100}
                    data={defaultData}
                    className="[&>.recharts-surface]:overflow-visible"
                >
                    <XAxis dataKey="timestamp" hide />
                    <YAxis domain={[0, 100]} hide />
                    <ReferenceLine y={50} className="[&>line]:stroke-muted" />
                    <Line
                        animationDuration={300}
                        dataKey="favor"
                        type="stepAfter"
                        className="overflow-visible text-endorsed"
                        dot={({ key, ...dot }) => {
                            if (dot.index === undefined) return <Fragment key={key} />;
                            return dot.index === defaultData.length - 1 ? (
                                <React.Fragment key={key}>
                                    <Dot
                                        key={`${key}-default-ping`}
                                        {...dot}
                                        fill={dot.stroke}
                                        className="animate-ping"
                                        style={{ transformOrigin: `${dot.cx}px ${dot.cy}px` }}
                                    />
                                    <Dot key={`${key}-default-main`} {...dot} fill={dot.stroke} />
                                </React.Fragment>
                            ) : (
                                <Fragment key={key} />
                            );
                        }}
                        stroke="currentColor"
                        strokeWidth={2}
                    />
                    <RechartsTooltip
                        wrapperClassName="backdrop-blur-sm !bg-transparent !pb-0 rounded-sm"
                        labelClassName=" -top-3 text-muted-foreground text-xs"
                        formatter={(value: number) => value.toFixed(2)}
                        labelFormatter={(timestamp: Date) => timestamp.toLocaleString()}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};

export default FavorHistoryChart; 