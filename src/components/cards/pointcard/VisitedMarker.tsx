import React from "react";
import { CircleIcon } from "lucide-react";

export interface VisitedMarkerProps {
    isSharing: boolean;
    visited: boolean;
    privyUser: any;
    disableVisitedMarker: boolean;
    onMarkAsRead: React.MouseEventHandler<HTMLButtonElement>;
}

export const VisitedMarker: React.FC<VisitedMarkerProps> = ({
    isSharing,
    visited,
    privyUser,
    disableVisitedMarker,
    onMarkAsRead,
}) => {
    if (isSharing || visited || !privyUser || disableVisitedMarker) return null;

    return (
        <div className="absolute top-0.5 right-3 group flex items-center gap-2">
            <span className="text-sm text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                Tap to mark seen
            </span>
            <button
                onClick={onMarkAsRead}
                className="relative size-3 rounded-full flex items-center justify-center before:absolute before:content-[''] before:size-8 before:-left-2.5 before:-top-2.5"
            >
                <div className="absolute inset-0 bg-endorsed/20 rounded-full scale-0 group-hover:scale-150 transition-transform" />
                <CircleIcon className="size-full fill-endorsed text-endorsed relative" />
            </button>
        </div>
    );
};

export default VisitedMarker; 