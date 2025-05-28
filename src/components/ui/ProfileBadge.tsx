import * as React from "react";
import { AwardIcon, TrophyIcon, CrownIcon, StarIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { Portal } from "@radix-ui/react-portal";

export type RationaleRank = 1 | 5 | 10 | 25 | 50 | 100;

interface ProfileBadgeProps {
    threshold: RationaleRank;
}

const rankMeta: Record<RationaleRank, { label: string; Icon: React.FC<React.SVGProps<SVGSVGElement>>; className: string }> = {
    1: { label: "Rationale Rookie", Icon: AwardIcon, className: "bg-amber-100 text-amber-800" },
    5: { label: "Bronze Rationalizer", Icon: TrophyIcon, className: "bg-orange-100 text-orange-800" },
    10: { label: "Silver Rationalizer", Icon: StarIcon, className: "bg-gray-100 text-gray-800" },
    25: { label: "Gold Rationalizer", Icon: TrophyIcon, className: "bg-yellow-100 text-yellow-900" },
    50: { label: "Platinum Rationalizer", Icon: CrownIcon, className: "bg-slate-100 text-slate-900" },
    100: { label: "Diamond Rationalizer", Icon: StarIcon, className: "bg-blue-100 text-blue-800" },
};

export function ProfileBadge({ threshold }: ProfileBadgeProps) {
    const { label, Icon, className } = rankMeta[threshold];
    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div
                        className={cn(
                            "inline-flex items-center gap-1.5 px-3 py-1 rounded-md font-semibold shadow-sm cursor-pointer transition-transform hover:scale-105",
                            className
                        )}
                    >
                        <Icon className="w-4 h-4" />
                        <span className="text-sm">{label}</span>
                    </div>
                </TooltipTrigger>
                <Portal>
                    <TooltipContent side="top" className="text-xs z-[100]">
                        Awarded for publishing {threshold} rationale{threshold > 1 ? "s" : ""}.
                    </TooltipContent>
                </Portal>
            </Tooltip>
        </TooltipProvider>
    );
} 