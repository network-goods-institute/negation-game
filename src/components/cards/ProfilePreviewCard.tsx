"use client";

import { Button } from "@/components/ui/button";
import { ExternalLinkIcon, FileTextIcon, CalendarIcon } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from 'date-fns';
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import React, { useMemo } from "react";
import { ProfileBadge, RationaleRank } from "@/components/ui/ProfileBadge";

// invalid join date
// basically this is when i added the created_at column to the database
// i grabbed as many as i could from the privy db but not all of them joined through privy
// so this is the date i added the created_at column
const exactJoinDate = new Date("2025-05-01T02:36:13.081085Z");

interface ProfilePreviewCardProps {
    username: string;
    bio?: string | null;
    delegationUrl?: string | null;
    rationalesCount: number;
    createdAt?: Date;
}

export function ProfilePreviewCard({
    username,
    bio,
    delegationUrl,
    rationalesCount,
    createdAt,
}: ProfilePreviewCardProps) {

    let memberStatus: string;
    if (createdAt && createdAt.getTime() === exactJoinDate.getTime()) {
        memberStatus = "Exact Join Date Unavailable";
    } else if (createdAt) {
        memberStatus = `Member since ${formatDistanceToNow(createdAt, { addSuffix: true })}`;
    } else {
        memberStatus = "";
    }

    // Calculate earned badges based on rationales count
    const earnedBadges = useMemo(() => {
        const rationaleBadgeThresholds: RationaleRank[] = [1, 5, 10, 25, 50, 100];
        return rationaleBadgeThresholds.filter(threshold => rationalesCount >= threshold);
    }, [rationalesCount]);

    return (
        <div className="flex flex-col gap-4 p-4 max-w-xs w-full">
            <div>
                <h3 className="text-lg font-semibold">{username}</h3>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <CalendarIcon className="size-3" /> {memberStatus}
                </p>
            </div>

            {bio && (
                <p className="text-sm text-muted-foreground line-clamp-3">{bio}</p>
            )}

            {earnedBadges.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    {earnedBadges.slice(-2).map((threshold) => (
                        <div key={threshold} className="scale-75 origin-left">
                            <ProfileBadge threshold={threshold} />
                        </div>
                    ))}
                </div>
            )}

            <div className="flex flex-col gap-2 text-sm">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                    <FileTextIcon className="size-4" />
                    <span>{rationalesCount} Rationales</span>
                </div>
                {delegationUrl && (
                    <TooltipPrimitive.Provider delayDuration={100}>
                        <TooltipPrimitive.Root>
                            <TooltipPrimitive.Trigger asChild>
                                <Button variant="link" size="sm" asChild className="h-auto p-0 text-xs justify-start">
                                    <a href={delegationUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1">
                                        Delegate Power <ExternalLinkIcon className="size-3" />
                                    </a>
                                </Button>
                            </TooltipPrimitive.Trigger>
                            <TooltipPrimitive.Portal>
                                <TooltipPrimitive.Content
                                    sideOffset={5}
                                    className="z-50 max-w-[250px] overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-xs text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2"
                                >
                                    Support {username}&apos;s governance decisions by delegating your voting power
                                    <TooltipPrimitive.Arrow className="fill-border" />
                                </TooltipPrimitive.Content>
                            </TooltipPrimitive.Portal>
                        </TooltipPrimitive.Root>
                    </TooltipPrimitive.Provider>
                )}
            </div>

            <Button variant="outline" size="sm" asChild>
                <Link href={`/profile/${username}`}>View Full Profile</Link>
            </Button>
        </div>
    );
} 