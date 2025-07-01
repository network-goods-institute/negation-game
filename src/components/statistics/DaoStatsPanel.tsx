"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Loader2Icon,
  UsersIcon,
  MessageCircleIcon,
  TrendingUpIcon,
  BarChart3Icon,
  PieChartIcon,
  TrendingDownIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  Target,
  Users2Icon
} from "lucide-react";
import { fetchDaoStats } from "@/actions/statistics/fetchDaoStats";
import { cn } from "@/lib/utils/cn";

interface DaoStatsPanelProps {
  space: string;
}

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
  trend?: string;
  className?: string;
}

const StatCard = ({ title, value, subtitle, icon, trend, className }: StatCardProps) => {
  const isPositiveTrend = trend && trend.includes('+');
  const isNegativeTrend = trend && trend.includes('-');

  return (
    <div className={cn(
      "group relative overflow-hidden rounded-lg border bg-card p-4 transition-all duration-200 hover:shadow-md hover:border-primary/30",
      className
    )}>
      <div className="flex items-start justify-between mb-3">
        <div className="p-2 rounded-md bg-primary/10 border border-primary/20">
          {icon}
        </div>
        {trend && (
          <div className={cn(
            "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md",
            isPositiveTrend && "text-green-700 bg-green-100 dark:text-green-400 dark:bg-green-950/50",
            isNegativeTrend && "text-red-700 bg-red-100 dark:text-red-400 dark:bg-red-950/50",
            !isPositiveTrend && !isNegativeTrend && "text-muted-foreground bg-muted"
          )}>
            {isPositiveTrend && <ArrowUpIcon className="size-3" />}
            {isNegativeTrend && <ArrowDownIcon className="size-3" />}
            {trend}
          </div>
        )}
      </div>
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</p>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
};

const QuickMetric = ({
  label,
  value,
  valueColor
}: {
  label: string;
  value: string | number;
  valueColor?: 'positive' | 'negative' | 'neutral';
}) => (
  <div className="flex items-center justify-between py-2">
    <span className="text-sm text-muted-foreground">{label}</span>
    <span className={cn(
      "text-sm font-semibold tabular-nums",
      valueColor === 'positive' && "text-green-700 dark:text-green-400",
      valueColor === 'negative' && "text-red-700 dark:text-red-400",
      (!valueColor || valueColor === 'neutral') && "text-foreground"
    )}>
      {value}
    </span>
  </div>
);

const DetailedMetric = ({
  label,
  value,
  description,
  valueColor,
  icon
}: {
  label: string;
  value: string | number;
  description: string;
  valueColor?: 'positive' | 'negative' | 'neutral';
  icon?: React.ReactNode;
}) => (
  <div className="flex items-start gap-3 py-3">
    {icon && (
      <div className="p-1.5 rounded-md bg-muted/50 mt-0.5">
        {icon}
      </div>
    )}
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between mb-1">
        <p className="text-sm font-medium">{label}</p>
        <p className={cn(
          "text-lg font-bold tabular-nums",
          valueColor === 'positive' && "text-green-700 dark:text-green-400",
          valueColor === 'negative' && "text-red-700 dark:text-red-400",
          (!valueColor || valueColor === 'neutral') && "text-foreground"
        )}>
          {value}
        </p>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
    </div>
  </div>
);

export const DaoStatsPanel = ({ space }: DaoStatsPanelProps) => {
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ["dao-stats", space],
    queryFn: () => fetchDaoStats(space),
    staleTime: 60 * 1000, // 1 minute
    retry: 3,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <div className="relative">
          <Loader2Icon className="size-8 animate-spin text-primary" />
          <div className="absolute inset-0 size-8 border-2 border-primary/20 rounded-full animate-pulse" />
        </div>
        <div className="text-center space-y-1">
          <div className="text-base font-medium">Loading DAO statistics...</div>
          <div className="text-sm text-muted-foreground">Analyzing engagement patterns</div>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <div className="p-4 rounded-full bg-destructive/10 border border-destructive/20 dark:bg-destructive/20 dark:border-destructive/30">
          <TrendingDownIcon className="size-8 text-destructive" />
        </div>
        <div className="text-center space-y-1">
          <div className="text-base font-medium">Failed to load statistics</div>
          <div className="text-sm text-muted-foreground">Please check your connection and try again</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics at a Glance */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Active Users"
          value={stats.activeUsers.toLocaleString()}
          subtitle={stats.currentMonth}
          icon={<UsersIcon className="size-4 text-primary" />}
          trend={stats.userGrowth ? `${stats.userGrowth > 0 ? '+' : ''}${stats.userGrowth}%` : undefined}
        />
        <StatCard
          title="Daily Activity"
          value={stats.dailyActivity.toLocaleString()}
          subtitle="avg/day"
          icon={<BarChart3Icon className="size-4 text-primary" />}
          trend={stats.activityTrend ? `${stats.activityTrend > 0 ? '+' : ''}${stats.activityTrend}%` : undefined}
        />
        <StatCard
          title="New Content"
          value={stats.contentCreation.toLocaleString()}
          subtitle={stats.currentMonth}
          icon={<MessageCircleIcon className="size-4 text-primary" />}
        />
        <StatCard
          title="Cred Activity"
          value={stats.credFlow.toLocaleString()}
          subtitle={stats.currentMonth}
          icon={<TrendingUpIcon className="size-4 text-primary" />}
        />
      </div>

      {/* Quick Health Check */}
      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Target className="size-4 text-primary" />
          <h3 className="font-semibold">Health Check</h3>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1">
          <QuickMetric
            label="DAO Alignment"
            value={`${Math.round(stats.daoAlignment * 100)}%`}
            valueColor={stats.daoAlignment > 0.7 ? 'positive' : stats.daoAlignment < 0.3 ? 'negative' : 'neutral'}
          />
          <QuickMetric
            label="Response Rate"
            value={`${Math.round(stats.responseRate * 100)}%`}
            valueColor={stats.responseRate > 0.5 ? 'positive' : 'neutral'}
          />
          <QuickMetric
            label="Dialectical Engagement"
            value={`${stats.dialecticalEngagement.toFixed(1)}`}
            valueColor={stats.dialecticalEngagement > 1 ? 'positive' : 'neutral'}
          />
          <QuickMetric
            label="New Contributors"
            value={`${Math.round(stats.newContributorRatio * 100)}%`}
            valueColor={stats.newContributorRatio > 0.2 ? 'positive' : 'neutral'}
          />
        </div>
      </div>

      {/* Detailed Breakdown */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Engagement Details */}
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 mb-4">
            <PieChartIcon className="size-4 text-primary" />
            <h3 className="font-semibold">Engagement Details</h3>
          </div>
          <div className="space-y-1">
            <DetailedMetric
              icon={<MessageCircleIcon className="size-4 text-muted-foreground" />}
              label="Points Created"
              value={stats.newPoints.toLocaleString()}
              description={`New points added in ${stats.currentMonth}`}
              valueColor="neutral"
            />
            <DetailedMetric
              icon={<BarChart3Icon className="size-4 text-muted-foreground" />}
              label="Rationales Written"
              value={stats.newRationales.toLocaleString()}
              description={`Comprehensive viewpoints shared in ${stats.currentMonth}`}
              valueColor="neutral"
            />
            <DetailedMetric
              icon={<Target className="size-4 text-muted-foreground" />}
              label="Contested Points"
              value={stats.contestedPoints.toLocaleString()}
              description="Points with active debate"
              valueColor="neutral"
            />
          </div>
        </div>

        {/* Distribution Analysis */}
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 mb-4">
            <Users2Icon className="size-4 text-primary" />
            <h3 className="font-semibold">Participation Analysis</h3>
          </div>
          <div className="space-y-1">
            <DetailedMetric
              icon={<UsersIcon className="size-4 text-muted-foreground" />}
              label="Activity Distribution"
              value={`${Math.round(stats.activityConcentration)}%`}
              description="How concentrated activity is (lower = better)"
              valueColor={stats.activityConcentration < 50 ? 'positive' : stats.activityConcentration > 80 ? 'negative' : 'neutral'}
            />
            <DetailedMetric
              icon={<Users2Icon className="size-4 text-muted-foreground" />}
              label="Cross-Space Users"
              value={stats.crossSpaceUsers.toLocaleString()}
              description="Active in multiple DAO spaces"
              valueColor="neutral"
            />
            <DetailedMetric
              icon={<TrendingUpIcon className="size-4 text-muted-foreground" />}
              label="Growth Pattern"
              value={stats.userGrowth ? `${stats.userGrowth > 0 ? '+' : ''}${stats.userGrowth}%` : 'Stable'}
              description="User growth vs previous month"
              valueColor={stats.userGrowth && stats.userGrowth > 0 ? 'positive' : 'neutral'}
            />
          </div>
        </div>
      </div>
    </div>
  );
};