"use client";

import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
    isDeltaLoading: boolean;
    onDeltaClick: () => void;
    deltaHref: string;
}

export function SpaceHeader({ space, isLoading, onAiClick, chatHref, isDeltaLoading, onDeltaClick, deltaHref }: SpaceHeaderProps) {
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
            <div className="flex gap-3">
                <Link
                    href={chatHref}
                    prefetch={false}
                    onClick={onAiClick}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-md bg-muted/50 hover:bg-muted border border-border text-foreground hover:text-primary transition-colors min-w-[140px]"
                >
                    {isLoading ? (
                        <>
                            <Loader className="size-4" />
                            <span className="text-sm font-medium">AI Assistant</span>
                        </>
                    ) : (
                        <>
                            <BrainCircuitIcon className="size-4" />
                            <span className="text-sm font-medium">AI Assistant</span>
                        </>
                    )}
                </Link>
                <Link
                    href={deltaHref}
                    prefetch={false}
                    onClick={onDeltaClick}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-md bg-muted/50 hover:bg-muted border border-border text-foreground hover:text-orange-600 transition-colors min-w-[140px]"
                >
                    {isDeltaLoading ? (
                        <>
                            <Loader className="size-4" />
                            <span className="text-sm font-medium">Delta Compare</span>
                        </>
                    ) : (
                        <>
                            <Sigma className="size-4" />
                            <span className="text-sm font-medium">Delta Compare</span>
                        </>
                    )}
                </Link>
            </div>
        </div>
    );
} 