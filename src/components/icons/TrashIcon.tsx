import { cn } from "@/lib/utils/cn";
import { TrashIcon as LucideTrashIcon } from "lucide-react";
import { HTMLAttributes } from "react";

interface TrashIconProps extends HTMLAttributes<HTMLDivElement> {
    className?: string;
    iconClassName?: string;
    disabled?: boolean;
}

export const TrashIcon = ({
    className,
    iconClassName,
    disabled,
    ...props
}: TrashIconProps) => {
    return (
        <div
            className={cn(
                "flex items-center",
                disabled && "opacity-50 cursor-not-allowed",
                className
            )}
            {...props}
        >
            <LucideTrashIcon
                className={cn(
                    "size-6 stroke-1",
                    "text-destructive",
                    disabled && "text-muted-foreground",
                    iconClassName
                )}
            />
        </div>
    );
}; 