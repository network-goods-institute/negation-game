"use client";

import * as HoverCardPrimitive from "@radix-ui/react-hover-card";
import { ProfilePreviewCard } from "../cards/ProfilePreviewCard";
import { cn } from "@/lib/utils/cn";
import React from "react";
import { useProfilePreviewData } from "@/queries/users/useProfilePreviewData";
import useIsMobile from "@/hooks/ui/useIsMobile";

interface UsernameDisplayProps {
    username: string;
    userId?: string;
    className?: string;
}

export function UsernameDisplay({
    username,
    userId,
    className,
}: UsernameDisplayProps) {
    const isMobile = useIsMobile();
    const { data, isLoading, isError } = useProfilePreviewData(userId);

    const triggerClasses = cn(
        "font-medium underline-offset-2 cursor-pointer text-yellow-500",
        className
    );

    // On mobile, just render the username without hover card to prevent overflow
    if (isMobile) {
        return (
            <span
                className={triggerClasses}
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
            >
                {username}
            </span>
        );
    }

    return (
        <HoverCardPrimitive.Root openDelay={300} closeDelay={100}>
            <HoverCardPrimitive.Trigger asChild>
                <span
                    className={triggerClasses}
                    onClick={(e: React.MouseEvent) => e.stopPropagation()}
                >
                    {username}
                </span>
            </HoverCardPrimitive.Trigger>
            <HoverCardPrimitive.Portal>
                <HoverCardPrimitive.Content
                    className="w-auto p-0 border border-border bg-popover text-popover-foreground rounded-xl shadow-lg overflow-hidden z-50 data-[side=top]:animate-slideDownAndFade data-[side=right]:animate-slideLeftAndFade data-[side=bottom]:animate-slideUpAndFade data-[side=left]:animate-slideRightAndFade"
                    sideOffset={5}
                    side="top"
                    align="start"
                    avoidCollisions={true}
                    collisionPadding={16}
                    onMouseLeave={(e: React.MouseEvent) => e.stopPropagation()}
                    onMouseEnter={(e: React.MouseEvent) => e.stopPropagation()}
                >
                    {isLoading ? (
                        <div className="p-4 text-center">Loading...</div>
                    ) : isError || !data ? (
                        <div className="p-4 text-center text-destructive-foreground bg-destructive">Error loading profile</div>
                    ) : (
                        <ProfilePreviewCard
                            username={username}
                            bio={data.bio}
                            delegationUrl={data.delegationUrl}
                            rationalesCount={data.rationalesCount}
                            createdAt={data.createdAt}
                        />
                    )}
                </HoverCardPrimitive.Content>
            </HoverCardPrimitive.Portal>
        </HoverCardPrimitive.Root>
    );
}
