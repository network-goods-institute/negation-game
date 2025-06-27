"use client";

import React from "react";
import { cn } from "@/lib/utils/cn";
import { SparklesIcon, ExternalLinkIcon } from "lucide-react";
import Link from "next/link";
import { useKnowledgeBase } from "@/components/contexts/KnowledgeBaseContext";

interface CreateRationaleViewpointCardProps {
  onClick: () => void;
  isLoading?: boolean;
  className?: string;
  href?: string;
}

export function CreateRationaleViewpointCard({
  onClick,
  isLoading = false,
  className,
  href
}: CreateRationaleViewpointCardProps) {
  const { openDialog } = useKnowledgeBase();

  const handleLearnMoreClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    openDialog(false, 'rationales');
  };

  const cardContent = (
    <div className="@container/point relative flex flex-col border-b-2 border-dashed border-blue-300 dark:border-blue-600 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 hover:from-blue-100 hover:to-indigo-100 dark:hover:from-blue-900/40 dark:hover:to-indigo-900/40 transition-all duration-300 cursor-pointer">
      {isLoading && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-10">
          <div className="size-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      <div className="flex flex-col flex-grow w-full min-w-0 p-6">
        <div className="flex items-start gap-4">
          <div className="relative flex-shrink-0">
            <div className="p-2 bg-blue-500 rounded-full">
              <SparklesIcon className="h-5 w-5 text-white" />
            </div>
          </div>

          <div className="flex-1">
            <h3 className="text-xl font-bold text-blue-900 dark:text-blue-100 group-hover:text-blue-700 dark:group-hover:text-blue-200 transition-colors mb-2">
              ✨ Create Your Rationale
            </h3>

            <p className="text-blue-700 dark:text-blue-200 font-medium mb-4 leading-relaxed">
              Share your reasoning and perspective. Build connected arguments with points and evidence to contribute to the discussion.
            </p>

            <div className="flex items-center justify-between">
              <div
                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-full font-bold text-sm group-hover:scale-105 transition-all duration-200 shadow-lg cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  onClick();
                }}
              >
                CREATE NOW
              </div>

              <button
                onClick={handleLearnMoreClick}
                className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-200 transition-colors"
              >
                <ExternalLinkIcon className="h-3 w-3" />
                <span>Learn more</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className={cn("block focus:outline-none group", className)}>
        {cardContent}
      </Link>
    );
  }

  return (
    <div
      className={cn("block focus:outline-none group", className)}
      onClick={onClick}
    >
      {cardContent}
    </div>
  );
}