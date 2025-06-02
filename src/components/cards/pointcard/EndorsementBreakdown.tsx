"use client";

import React from "react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Users as UsersIcon } from "lucide-react";
import { usePointEndorsementBreakdown } from "../../../queries/points/usePointEndorsementBreakdown";

export interface EndorsementDetail {
    userId: string;
    username: string;
    cred: number;
}

export const EndorsementBreakdown: React.FC<{ pointId: number }> = ({ pointId }) => {
    const { data, isLoading } = usePointEndorsementBreakdown(pointId);

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="mt-1">
                    <UsersIcon className="size-4" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 max-h-60 overflow-auto">
                {isLoading ? (
                    <div className="p-2">Loading endorsements...</div>
                ) : data && data.length > 0 ? (
                    <ul className="p-2 space-y-1">
                        {data.map((e: EndorsementDetail) => (
                            <li key={e.userId} className="flex justify-between text-sm">
                                <span>{e.username}</span>
                                <span className="font-medium">{e.cred} cred</span>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div className="p-2 text-sm text-muted-foreground">No endorsements</div>
                )}
            </PopoverContent>
        </Popover>
    );
}; 