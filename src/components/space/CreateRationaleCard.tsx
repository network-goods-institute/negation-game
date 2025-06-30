"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { PlusIcon, BookOpenIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface CreateRationaleCardProps {
  onClick: () => void;
  isLoading?: boolean;
  className?: string;
  sticky?: boolean;
}

export function CreateRationaleCard({ 
  onClick, 
  isLoading = false, 
  className,
  sticky = false 
}: CreateRationaleCardProps) {
  return (
    <div 
      className={cn(
        "border-b bg-background",
        sticky && "sticky top-0 z-10",
        className
      )}
    >
      <div className="p-4 sm:p-6">
        <Button
          onClick={onClick}
          disabled={isLoading}
          variant="outline"
          className="w-full h-auto p-6 border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 hover:bg-accent/50 transition-all duration-200 group"
        >
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
              {isLoading ? (
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
              ) : (
                <PlusIcon className="h-6 w-6 text-primary" />
              )}
            </div>
            
            <div className="space-y-2">
              <h3 className="font-semibold text-lg text-foreground">
                Create New Rationale
              </h3>
              <p className="text-sm text-muted-foreground max-w-md">
                Share your reasoning and perspective on topics in this space. 
                Build connected arguments with points and evidence.
              </p>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <BookOpenIcon className="h-4 w-4" />
              <span>Start building your rationale</span>
            </div>
          </div>
        </Button>
      </div>
    </div>
  );
}