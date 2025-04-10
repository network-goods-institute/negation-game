import { CircleIcon, EyeIcon, TriangleIcon, PinIcon, DiscIcon } from "lucide-react";
import { cn } from "@/lib/cn";

interface IconProps {
    className?: string;
}

export const PointIcon = ({ className }: IconProps) => (
    <div className="relative flex items-center justify-center shrink-0">
        <DiscIcon className={cn("size-6 text-muted-foreground stroke-1", className)} />
    </div>
);

export const ViewpointIcon = ({ className }: IconProps) => (
    <div className="relative flex items-center justify-center w-5 h-5 shrink-0 mt-0.5">
        <CircleIcon className="size-5 stroke-1" />
        <EyeIcon className="size-3 absolute stroke-[1.5px]" />
    </div>
);

export const MakePointCommandIcon = ({ className }: IconProps) => (
    <div className={cn("relative flex items-center justify-center shrink-0", className)}>
        <CircleIcon className="size-full stroke-1" />
        <TriangleIcon className="size-[60%] absolute stroke-[1.5px]" />
    </div>
);

export const FeedCommandIcon = ({ className }: IconProps) => (
    <div className="relative flex items-center justify-center w-5 h-5 shrink-0 mt-0.5">
        <CircleIcon className="size-5 stroke-1" />
        <TriangleIcon className="size-3 absolute stroke-[1.5px]" />
    </div>
);

export const PinnedIcon = ({ className }: IconProps) => (
    <div className="relative flex items-center justify-center w-5 h-5 shrink-0 mt-0.5">
        <CircleIcon className="size-5 stroke-1" />
        <PinIcon className="size-3 absolute stroke-[1.5px]" />
    </div>
);

export const ThickCircleIcon = ({ className }: IconProps) => (
    <div className="relative flex items-center justify-center w-5 h-5 shrink-0">
        <CircleIcon className={cn("size-5 stroke-2", className)} />
    </div>
);

export const SlashedCircleIcon = ({ className }: IconProps) => (
    <div className="relative flex items-center justify-center w-5 h-5 shrink-0">
        <svg
            width="20" //  size-5
            height="20" // size-5
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2" // Match ThickCircleIcon border
            strokeLinecap="round"
            strokeLinejoin="round"
            className={cn(className)}
        >
            <circle cx="12" cy="12" r="10" />
            <line x1="2" y1="2" x2="22" y2="22" strokeWidth="2" />
        </svg>
    </div>
); 