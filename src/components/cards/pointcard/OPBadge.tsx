import React from "react";
import { Badge } from "@/components/ui/badge";
import { useUser } from "@/queries/users/useUser";
import type { EndorsementDetail } from "../../../queries/points/usePointEndorsementBreakdown";
import { UsernameDisplay } from "@/components/ui/UsernameDisplay";
import * as HoverCardPrimitive from "@radix-ui/react-hover-card";

export interface OPBadgeProps {
    opCred?: number;
    originalPosterId?: string;
    breakdown?: EndorsementDetail[];
}

export const OPBadge: React.FC<OPBadgeProps> = ({ opCred, originalPosterId, breakdown }) => {
    const { data: poster } = useUser(originalPosterId);

    const details: EndorsementDetail[] = breakdown
        ? breakdown
        : opCred !== undefined && originalPosterId
            ? [{ userId: originalPosterId, username: poster?.username || 'poster', cred: opCred }]
            : [];
    const totalCred = details.reduce((sum, d) => sum + d.cred, 0);
    const hasOp = details.some((d) => d.userId === originalPosterId);
    const baseClasses = "absolute bottom-1.5 right-1.5 leading-none align-middle px-1 py-0.5 text-xs font-medium rounded-[6px]";
    let badgeClasses = "";
    if (breakdown === undefined) {
        badgeClasses = `${baseClasses} bg-yellow-500/80 text-black hover:bg-yellow-600`;
    } else if (hasOp) {
        if (details.length > 1) {
            badgeClasses = `${baseClasses} bg-yellow-500 text-black border-l-4 border-black dark:border-white hover:bg-yellow-600`;
        } else {
            badgeClasses = `${baseClasses} bg-yellow-500 text-black hover:bg-yellow-600`;
        }
    } else {
        badgeClasses = `${baseClasses} bg-blue-500 text-white hover:bg-blue-600`;
    }

    return (
        <HoverCardPrimitive.Root openDelay={0} closeDelay={200}>
            <HoverCardPrimitive.Trigger asChild>
                <Badge className={badgeClasses}>
                    {totalCred} cred
                </Badge>
            </HoverCardPrimitive.Trigger>
            <HoverCardPrimitive.Portal>
                <HoverCardPrimitive.Content
                    side="top"
                    align="center"
                    sideOffset={5}
                    className="z-20 w-auto p-2 bg-popover text-popover-foreground rounded-md shadow-md"
                >
                    <div className="space-y-1">
                        {details.map((d) => (
                            <p key={d.userId} className="text-sm">
                                Endorsed by{' '}
                                <strong className={hasOp && d.userId === originalPosterId ? "text-yellow-500" : "text-primary-foreground"}>
                                    <UsernameDisplay username={d.username} userId={d.userId} className="text-sm" />
                                </strong>{' '}
                                with {d.cred} cred
                            </p>
                        ))}
                    </div>
                </HoverCardPrimitive.Content>
            </HoverCardPrimitive.Portal>
        </HoverCardPrimitive.Root>
    );
};

export default OPBadge;