"use client";

import React, { useState, useMemo } from "react";
import { useTopicSuggestions } from "@/queries/topics/useTopicSuggestions";
import { useUserTopicRationales } from "@/queries/topics/useUserTopicRationales";
import { usePrivy } from "@privy-io/react-auth";
import { Button } from "@/components/ui/button";
import { ChevronDownIcon, ChevronUpIcon, ArrowRightIcon, Circle, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { encodeId } from "@/lib/negation-game/encodeId";
import Link from "next/link";

interface RationalesConcernsSectionProps {
  spaceId: string;
}

const RationalesConcernsSection = React.memo(function RationalesConcernsSection({ spaceId }: RationalesConcernsSectionProps) {
  const { user: privyUser } = usePrivy();
  const { data: topics, isLoading: topicsLoading } = useTopicSuggestions(spaceId);
  const [isExpanded, setIsExpanded] = useState(true);

  const topicIds = useMemo(() => topics?.map(topic => topic.id) || [], [topics]);

  const { data: userTopicRationales, isLoading: userRationalesLoading } = useUserTopicRationales(
    privyUser?.id,
    topicIds
  );

  const { displayTopics, isLoading, hasTopics } = useMemo(() => {
    if (!privyUser?.id) {
      return { displayTopics: [], isLoading: false, hasTopics: false };
    }

    if (topicsLoading) {
      return { displayTopics: [], isLoading: true, hasTopics: false };
    }

    if (!topics || topics.length === 0) {
      return { displayTopics: [], isLoading: false, hasTopics: false };
    }

    if (userRationalesLoading || userTopicRationales === undefined) {
      return { displayTopics: topics, isLoading: false, hasTopics: true };
    }

    const publishedTopicIds = new Set(userTopicRationales || []);
    const filtered = topics.filter(topic => !publishedTopicIds.has(topic.id));

    return { displayTopics: filtered, isLoading: false, hasTopics: true };
  }, [topics, userTopicRationales, topicsLoading, userRationalesLoading, privyUser?.id]);

  // Early return for unauthenticated users
  if (!privyUser) {
    return null;
  }

  if (isLoading && !hasTopics) {
    return (
      <div className="mb-4">
        <div className="rounded-md border border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-700/50 shadow-sm">
          <div className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-amber-500 rounded-full animate-pulse">
                <BookOpen className="h-3 w-3 text-white" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                  Loading topics...
                </h2>
                <p className="text-xs text-amber-600 dark:text-amber-300">
                  Finding topics that need your rationale
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isLoading && displayTopics.length === 0) {
    return null;
  }

  return (
    <div className="mb-4">
      {/* Collapsible Concerns Card */}
      <div className="rounded-md border border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-700/50 shadow-sm">
        {/* Collapsible Header */}
        <div
          className="p-3 cursor-pointer hover:bg-amber-100/30 dark:hover:bg-amber-900/10 transition-colors"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-amber-500 rounded-full">
                <BookOpen className="h-3 w-3 text-white" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                  {isLoading ? 'Loading topics...' : `${displayTopics.length} Topics Need Your Rationale`}
                </h2>
                <p className="text-xs text-amber-600 dark:text-amber-300">
                  {isLoading ? 'Filtering based on your existing rationales' : (isExpanded ? 'Click to hide' : 'Click to view topics')}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="text-amber-700 hover:text-amber-900 dark:text-amber-200 dark:hover:text-amber-100 border-amber-300 hover:border-amber-400 dark:border-amber-600 dark:hover:border-amber-500 h-8 px-2 bg-amber-100/50 hover:bg-amber-200/50 dark:bg-amber-900/30 dark:hover:bg-amber-800/40"
            >
              {isExpanded ? (
                <ChevronUpIcon className="h-4 w-4" />
              ) : (
                <ChevronDownIcon className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Expandable Content */}
        {isExpanded && (
          <div className="px-3 pb-3 border-t border-amber-200/50 dark:border-amber-700/30">
            <div className="pt-3">
              {/* Topic list with TopicCard styling */}
              <div className="grid gap-2 mb-3">
                {displayTopics.map((topic) => (
                  <div key={topic.id}>
                    <Link href={`/s/${spaceId}/topic/${encodeId(topic.id)}`}>
                      <div
                        className={cn(
                          "h-auto p-3 bg-white dark:bg-gray-900/50 border border-amber-200 dark:border-amber-700/50",
                          "hover:border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/10",
                          "transition-all duration-200 rounded-md cursor-pointer"
                        )}
                      >
                        <div className="flex items-center gap-2 w-full">
                          {/* Status indicator */}
                          <div className="flex-shrink-0">
                            <div className="w-4 h-4 border border-amber-400 rounded-full flex items-center justify-center">
                              <Circle className="w-1.5 h-1.5 text-amber-400" fill="currentColor" />
                            </div>
                          </div>
                          <div className="flex-1 text-left">
                            <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-slate-600 dark:hover:text-slate-200">
                              {topic.name}
                            </h3>
                            <p className="text-xs text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200">
                              Create rationale →
                            </p>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </div>
                ))}
              </div>

              {/* See all topics link */}
              <div className="text-center">
                <Button
                  variant="link"
                  size="sm"
                  className="text-amber-600 hover:text-amber-800 dark:text-amber-300 dark:hover:text-amber-200 text-xs h-auto p-1"
                  asChild
                >
                  <Link href={`/s/${spaceId}/topics`} className="flex items-center gap-1">
                    View all topics
                    <ArrowRightIcon className="h-3 w-3" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
});

export { RationalesConcernsSection };