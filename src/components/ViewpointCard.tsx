import { cn } from "@/lib/cn";
import Link from "next/link";
import React from "react";
import { Badge } from "@/components/ui/badge";

export interface ViewpointCardProps extends Omit<React.HTMLAttributes<HTMLAnchorElement>, keyof React.AnchorHTMLAttributes<HTMLAnchorElement>> {
    id: string;
    title: string;
    description: string;
    author: string;
    createdAt: Date;
    className?: string;
    space: string;
}

export const ViewpointCard: React.FC<ViewpointCardProps> = ({
    id,
    title,
    description,
    author,
    createdAt,
    className,
    space,
}) => {
    return (
        <Link
            href={`/s/${space}/viewpoint/${id}`}
            tabIndex={0}
            className={cn("block focus:outline-none", className)}
        >
            <div className="p-4 border rounded-md hover:bg-accent transition-colors focus:ring-2 focus:ring-primary">
                <h3 className="text-lg font-semibold truncate">{title}</h3>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-3">
                    {description}
                </p>
                <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">By {author}</span>
                    <Badge variant="secondary" className="text-xs">
                        {new Date(createdAt).toLocaleDateString()}
                    </Badge>
                </div>
            </div>
        </Link>
    );
}; 