"use client";

import React from "react";
import { 
    Users, 
    Activity,
    TrendingUp,
    MessageCircle,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { DaoStats } from "@/actions/statistics/fetchDaoStats";

interface StatisticsSummaryProps {
    stats: DaoStats;
    variant?: "compact" | "default";
}

interface MiniStatProps {
    icon: React.ReactNode;
    label: string;
    value: string | number;
    trend?: number;
}

const MiniStat = ({ icon, label, value, trend }: MiniStatProps) => {
    const isPositive = trend && trend > 0;
    const isNegative = trend && trend < 0;

    return (
        <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2">
                <div className="p-1.5 rounded bg-primary/10 border border-primary/20">
                    {icon}
                </div>
                <span className="text-sm text-muted-foreground">{label}</span>
            </div>
            <div className="flex items-center gap-2">
                <span className="text-sm font-semibold tabular-nums">{value}</span>
                {trend !== undefined && (
                    <span className={cn(
                        "text-xs font-medium",
                        isPositive && "text-green-600 dark:text-green-400",
                        isNegative && "text-red-600 dark:text-red-400",
                        !isPositive && !isNegative && "text-muted-foreground"
                    )}>
                        {isPositive && "+"}
                        {trend}%
                    </span>
                )}
            </div>
        </div>
    );
};

export function StatisticsSummary({ stats, variant = "default" }: StatisticsSummaryProps) {
    return (
        <div className="space-y-0">
            <MiniStat
                icon={<Users className="size-3.5 text-primary" />}
                label="Active Users"
                value={stats.activeUsers.toLocaleString()}
                trend={stats.userGrowth}
            />
            <MiniStat
                icon={<Activity className="size-3.5 text-primary" />}
                label="Daily Activity"
                value={stats.dailyActivity.toLocaleString()}
                trend={stats.activityTrend}
            />
            <MiniStat
                icon={<TrendingUp className="size-3.5 text-primary" />}
                label="Cred Flow"
                value={stats.credFlow.toLocaleString()}
            />
            <MiniStat
                icon={<MessageCircle className="size-3.5 text-primary" />}
                label="Points Created"
                value={stats.newPoints.toLocaleString()}
            />
        </div>
    );
}