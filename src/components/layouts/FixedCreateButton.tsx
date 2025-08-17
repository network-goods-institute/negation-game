"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Loader } from "@/components/ui/loader";
import { cn } from "@/lib/utils/cn";
import { usePrivy } from "@privy-io/react-auth";

interface FixedCreateButtonProps {
  onCreateRationale: () => void;
  isCreatingRationale?: boolean;
  className?: string;
}

export function FixedCreateButton({
  onCreateRationale,
  isCreatingRationale = false,
  className
}: FixedCreateButtonProps) {
  const { user, login } = usePrivy();

  const handleClick = () => {
    if (!user) {
      login();
    } else {
      onCreateRationale();
    }
  };

  return (
    <Button
      onClick={handleClick}
      className={cn(
        "fixed bottom-6 right-6 z-40",
        "h-14 w-14 rounded-full",
        "bg-blue-500 hover:bg-blue-600 text-white",
        "shadow-lg hover:shadow-xl transition-all",
        "flex items-center justify-center",
        "lg:hidden", // Only show on mobile/tablet
        className
      )}
      size="icon"
      disabled={isCreatingRationale}
    >
      {isCreatingRationale ? (
        <Loader className="h-6 w-6" color="white" />
      ) : (
        <Plus className="h-6 w-6" strokeWidth={2.5} />
      )}
      <span className="sr-only">Create a rationale</span>
    </Button>
  );
}