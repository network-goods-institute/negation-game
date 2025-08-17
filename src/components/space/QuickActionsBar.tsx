"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Bot, GitCompare } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useRouter } from "next/navigation";
import { useBasePath } from "@/hooks/utils/useBasePath";
import useIsMobile from "@/hooks/ui/useIsMobile";

interface QuickActionsBarProps {
  className?: string;
}

export function QuickActionsBar({ className }: QuickActionsBarProps) {
  const router = useRouter();
  const basePath = useBasePath();
  const isMobile = useIsMobile();

  const handleAIAssistant = () => {
    router.push(`${basePath}/chat`);
  };

  const handleDeltaCompare = () => {
    router.push(`${basePath}/delta`);
  };

  // Only render on mobile
  if (!isMobile) {
    return null;
  }

  return (
    <div
      className={cn(
        "bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b",
        className
      )}
    >
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleAIAssistant}
            className="flex-1 sm:flex-initial"
          >
            <Bot className="h-4 w-4 mr-2" />
            AI Assistant
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDeltaCompare}
            className="flex-1 sm:flex-initial"
          >
            <GitCompare className="h-4 w-4 mr-2" />
            Delta Compare
          </Button>
        </div>
      </div>
    </div>
  );
}