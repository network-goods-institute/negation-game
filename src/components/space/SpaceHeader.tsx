"use client";

import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/ui/loader";
import { BrainCircuitIcon, Sigma } from "lucide-react";
import type { useSpace } from "@/queries/space/useSpace";
import Link from "next/link";

type SpaceResult = ReturnType<typeof useSpace>;

interface SpaceHeaderProps {
    space: SpaceResult;
    isLoading: boolean;
    onAiClick: () => void;
    chatHref: string;
}

export function SpaceHeader({ space, isLoading, onAiClick, chatHref }: SpaceHeaderProps) {
    if (!space?.data) {
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
            <div className="flex gap-2">
                <Button asChild disabled={isLoading} className="h-12 w-auto px-6" onClick={onAiClick}>
                    <Link href={chatHref} prefetch={false} className="flex items-center">
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
                    </Link>
                </Button>
                <Button asChild variant="secondary" className="h-12 w-auto px-6">
                    <Link href={`/s/${space.data.id}/delta`} prefetch={false} className="flex items-center">
                        <Sigma className="size-6" />
                        <span className="ml-sm">Δ Compare</span>
                    </Link>
                </Button>
            </div>
        </div>
    );
} 