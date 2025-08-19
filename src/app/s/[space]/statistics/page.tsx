"use client";

import { DaoStatsPanel } from "@/components/statistics/DaoStatsPanel";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon } from "lucide-react";
import { useParams, useRouter } from "next/navigation";

export default function SpaceStatisticsPage() {
  const params = useParams();
  const router = useRouter();
  const space = params.space as string;

  return (
    <main className="flex-1 flex bg-background min-h-0 overflow-auto">
      {/* Left negative space (hidden on mobile) */}
      <div className="hidden sm:block flex-[2] max-w-[400px]"></div>

      {/* Center content */}
      <div className="relative w-full flex-[2] flex flex-col min-h-0">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
          <div className="px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8" 
                onClick={() => router.push(`/s/${space}`)}
              >
                <ArrowLeftIcon className="size-4" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Statistics</h1>
                <p className="text-sm text-muted-foreground">
                  Collective activity and engagement metrics for s/{space}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable content below sticky header */}
        <div className="flex-1 px-4 sm:px-6 lg:px-8 min-h-0 min-w-0">
          <div className="py-6">
            <DaoStatsPanel space={space} />
          </div>
        </div>
      </div>

      {/* Right negative space (hidden on mobile) */}
      <div className="hidden sm:block flex-[2] max-w-[400px]"></div>
    </main>
  );
}