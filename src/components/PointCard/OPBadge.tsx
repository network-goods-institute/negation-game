import React from "react";
import { useToggle } from "@uidotdev/usehooks";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Portal } from "@radix-ui/react-portal";
import { useUser } from "@/queries/useUser";
import { UsernameDisplay } from "@/components/UsernameDisplay";

export interface OPBadgeProps {
    opCred: number;
    originalPosterId?: string;
}

export const OPBadge: React.FC<OPBadgeProps> = ({ opCred, originalPosterId }) => {
    const [isTooltipOpen, toggleTooltip] = useToggle(false);
    const { data: poster } = useUser(originalPosterId);

    return (
        <Tooltip open={isTooltipOpen} onOpenChange={toggleTooltip} delayDuration={0}>
            <TooltipTrigger asChild>
                <Badge
                    className="absolute hover:bg-yellow-600 bottom-1.5 right-1.5 text-yellow-500 text-xs font-medium bg-yellow-500/80 text-background dark:font-bold leading-none px-1 py-0.5 rounded-[6px] align-middle"
                    onClick={() => toggleTooltip()}
                >
                    {opCred} cred
                </Badge>
            </TooltipTrigger>
            <Portal>
                <TooltipContent side="top" align="center" sideOffset={5} className="z-[100]">
                    <p>
                        Endorsed by <strong className="text-yellow-500">
                            <UsernameDisplay username={poster?.username || "poster"} userId={poster?.id} className="text-sm" />
                        </strong> with {opCred} cred
                    </p>
                </TooltipContent>
            </Portal>
        </Tooltip>
    );
};

export default OPBadge; 