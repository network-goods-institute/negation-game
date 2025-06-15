"use client";

import Link from "next/link";
import { ArrowLeftIcon, UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ConversationHeaderProps {
    otherUserId: string;
    otherUsername?: string;
    otherUserImage?: string;
}

export const ConversationHeader = ({
    otherUserId,
    otherUsername,
    otherUserImage
}: ConversationHeaderProps) => {
    const displayName = otherUsername || `User ${otherUserId}`;

    return (
        <div className="sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border/80 p-6 shadow-sm z-10">
            <div className="flex items-center gap-4 max-w-4xl mx-auto">
                <Button variant="ghost" size="sm" asChild className="shrink-0">
                    <Link href="/messages" className="flex items-center gap-2">
                        <ArrowLeftIcon className="size-4" />
                        <span className="hidden sm:inline">Back</span>
                    </Link>
                </Button>

                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Avatar className="size-10 shrink-0 border-2 border-border/20">
                        <AvatarImage src={otherUserImage} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                            {otherUsername?.[0]?.toUpperCase() || <UserIcon className="size-5" />}
                        </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                        <h1 className="font-semibold text-lg truncate">
                            {displayName}
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Conversation
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}; 