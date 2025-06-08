import React from "react";
import { encodeId } from "@/lib/negation-game/encodeId";
import { cn } from "@/lib/utils/cn";
import { ObjectionPreview } from "./ObjectionPreview";

export interface ObjectionHeaderProps {
    id: number;
    parentId: number;
    space?: string;
}

export const ObjectionHeader: React.FC<ObjectionHeaderProps> = ({ id, parentId, space }) => {
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
                <span>{encodeId(parentId)}</span>
                <span className="mx-2">/</span>
                <span>{encodeId(id)}</span>
            </div>
        </ObjectionPreview>
    );
}; 