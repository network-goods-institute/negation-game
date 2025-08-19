"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchDaoStats } from "@/actions/statistics/fetchDaoStats";
import {
  BarChart3Icon,
  ChevronRightIcon,
  Target,
  Sigma
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import { Loader } from "@/components/ui/loader";
import { useRouter } from "next/navigation";
import { useBasePath } from "@/hooks/utils/useBasePath";
import { StatisticsDialog } from "@/components/dialogs/StatisticsDialog";
import { StatisticsSummary } from "@/components/statistics/StatisticsSummary";

interface StatisticsSummaryCardProps {
  space: string;
}


export function StatisticsSummaryCard({ space }: StatisticsSummaryCardProps) {
  const router = useRouter();
  const basePath = useBasePath();
  const [isDeltaLoading, setIsDeltaLoading] = useState(false);
  const [isStatisticsOpen, setIsStatisticsOpen] = useState(false);

  const { data: stats, isLoading, error } = useQuery({
    queryKey: ["dao-stats", space],
    queryFn: () => fetchDaoStats(space),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });


  if (isLoading) {
    return (
      <div className="rounded-lg border bg-card p-4 animate-pulse">
        <div className="h-6 bg-muted rounded w-32 mb-4" />
        <div className="space-y-3">
          <div className="h-10 bg-muted rounded" />
          <div className="h-10 bg-muted rounded" />
          <div className="h-10 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return null; // Fail silently for summary
  }

  const healthScore = Math.round(stats.daoAlignment * 100);
  const healthColor = healthScore > 70 ? "text-green-600 dark:text-green-400" :
    healthScore < 30 ? "text-red-600 dark:text-red-400" :
      "text-yellow-600 dark:text-yellow-400";

  return (
    <div className="rounded-lg border bg-card/50 backdrop-blur p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BarChart3Icon className="size-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Stats</h3>
        </div>
        <div className="flex items-center gap-2">
          <Target className="size-4 text-muted-foreground" />
          <span className={cn("text-sm font-medium", healthColor)}>
            {healthScore}% Health
          </span>
        </div>
      </div>

      <div className="mb-2">
        <StatisticsSummary stats={stats} />
      </div>

      {/* Delta Compare removed from Stats card */}

      <button
        onClick={() => setIsStatisticsOpen(true)}
        className="w-full flex items-center justify-center gap-2 mt-3 pt-3 border-t text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        View Full Statistics
        <ChevronRightIcon className="size-3" />
      </button>

      <StatisticsDialog
        open={isStatisticsOpen}
        onOpenChange={setIsStatisticsOpen}
        space={space}
      />
    </div>
  );
}