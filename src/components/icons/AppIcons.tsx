import { CircleIcon, DotIcon, EyeIcon, TriangleIcon, PinIcon } from "lucide-react";
import { cn } from "@/lib/cn";

interface IconProps {
    className?: string;
}

export const PointIcon = ({ className }: IconProps) => (
    <div className="relative flex items-center justify-center w-5 h-5 shrink-0 mt-0.5">
        <CircleIcon className="size-5 stroke-1" />
        <DotIcon className="size-3 absolute stroke-[1.5px]" />
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