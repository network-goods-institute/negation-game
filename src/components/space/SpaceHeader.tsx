"use client";

import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/ui/loader";
import { BrainCircuitIcon } from "lucide-react";
import { DEFAULT_SPACE } from "@/constants/config";
import type { useSpace } from "@/queries/space/useSpace";

type SpaceResult = ReturnType<typeof useSpace>;

interface SpaceHeaderProps {
    space: SpaceResult;
    isLoading: boolean;
    onAiClick: () => void;
}

export function SpaceHeader({ space, isLoading, onAiClick }: SpaceHeaderProps) {
    if (!space?.data || space.data.id === DEFAULT_SPACE) {
        return null;
    }

    return (
        <div className="py-3 px-4 flex items-center justify-between gap-3 w-full border-b">
            <div className="flex items-center gap-3">
                <Avatar className="border-2 sm:border-a4 border-background h-12 w-12 sm:h-20 sm:w-20">
                    {space.data.icon ? (
                        <AvatarImage src={space.data.icon} alt={`s/${space.data.id} icon`} />
                    ) : (
                        <AvatarFallback className="text-2xl sm:text-4xl font-bold text-muted-foreground">
                            {space.data.id.charAt(0).toUpperCase()}
                        </AvatarFallback>
                    )}
                </Avatar>
                <h1 className="text-lg sm:text-xl font-semibold">s/{space.data.id}</h1>
            </div>
            <Button onClick={onAiClick} disabled={isLoading} className="h-12 w-auto px-6">
                {isLoading ? (
                    <>
                        <Loader className="size-6 mr-sm text-white" />
                        <span>Loading...</span>
                    </>
                ) : (
                    <>
                        <BrainCircuitIcon className="size-6" />
                        <span className="ml-sm">AI Assistant</span>
                    </>
                )}
            </Button>
        </div>
    );
} 