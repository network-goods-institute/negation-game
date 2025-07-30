import React from "react";
import { cn } from "@/lib/utils/cn";
import { ObjectionPreview } from "./ObjectionPreview";
import { usePointDataById } from "@/queries/points/usePointDataById";

export interface ObjectionHeaderProps {
    id: number;
    parentId: number;
    space?: string;
}

export const ObjectionHeader: React.FC<ObjectionHeaderProps> = ({ id, parentId, space }) => {
    const { data: objectionPoint } = usePointDataById(id);
    const { data: parentPoint } = usePointDataById(parentId);

    return (
        <ObjectionPreview objectionId={id} targetId={parentId} space={space}>
            <div
                className={cn(
                    "inline-flex items-center px-3 py-1 rounded-full text-sm",
                    "bg-red-50 border border-red-300 text-red-600",
                    "dark:bg-red-950 dark:border-red-700 dark:text-red-400",
                    "cursor-pointer hover:bg-red-100 dark:hover:bg-red-900"
                )}
            >
                <span className="underline">
                    {parentPoint?.content ? parentPoint.content.substring(0, 25) + (parentPoint.content.length > 25 ? '...' : '') : 'Loading...'}
                </span>
                <span className="mx-2">/</span>
                <span className="underline">
                    {objectionPoint?.content ? objectionPoint.content.substring(0, 25) + (objectionPoint.content.length > 25 ? '...' : '') : 'Loading...'}
                </span>
            </div>
        </ObjectionPreview>
    );
}; 