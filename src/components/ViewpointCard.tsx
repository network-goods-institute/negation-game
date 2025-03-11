import { cn } from "@/lib/cn";
import React, { useState, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import dynamic from "next/dynamic";
import remarkGfm from "remark-gfm";
import {
    Popover,
    PopoverContent,
    PopoverTrigger
} from "@/components/ui/popover";
import { Portal } from "@radix-ui/react-portal";
import { ViewpointIcon } from "@/components/icons/AppIcons";
import { useRouter } from "next/navigation";
import Link from "next/link";

const DynamicMarkdown = dynamic(() => import('react-markdown'), {
    loading: () => <div className="animate-pulse h-32 bg-muted/30 rounded-md" />,
    ssr: false
});

export interface ViewpointCardProps extends Omit<React.HTMLAttributes<HTMLAnchorElement>, keyof React.AnchorHTMLAttributes<HTMLAnchorElement>> {
    id: string;
    title: string;
    description: string;
    author: string;
    createdAt: Date;
    className?: string;
    space: string;
    linkable?: boolean;
}

export const ViewpointCard: React.FC<ViewpointCardProps> = ({
    id,
    title,
    description,
    author,
    createdAt,
    className,
    space,
    linkable = true,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const router = useRouter();
    const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const handleHoverStart = () => {
        if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
            hoverTimeoutRef.current = null;
        }
        if (!isOpen) {
            setIsOpen(true);
        }
    };

    const handleHoverEnd = () => {
        if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
        }

        hoverTimeoutRef.current = setTimeout(() => {
            setIsOpen(false);
        }, 100); // Small delay to prevent flickering when moving between elements
    };

    const handleCardClick = () => {
        if (linkable) {
            setIsOpen(false);
            router.push(`/s/${space}/rationale/${id}`);
        }
    };

    const linkHref = `/s/${space}/rationale/${id}`;

    const cardContent = (
        <div className="@container/point flex gap-3 pt-4 pb-3 px-4 border-b cursor-pointer hover:bg-accent">
            <div className="flex flex-col flex-grow w-full min-w-0 pl-2.5">
                <div className="flex items-start gap-2">
                    <ViewpointIcon />
                    <h3 className="tracking-tight text-md @xs/point:text-md @sm/point:text-lg font-semibold -mt-1 mb-sm select-text flex-1 break-words whitespace-normal overflow-hidden">
                        {title}
                    </h3>
                </div>

                <div className="text-sm text-muted-foreground line-clamp-2 mb-2 h-10 overflow-hidden">
                    {description}
                </div>

                <div className="flex justify-between items-center text-xs text-muted-foreground mt-1">
                    <span>By <span className="font-bold text-yellow-500">{author}</span></span>
                    <Badge variant="secondary" className="text-xs">
                        {new Date(createdAt).toLocaleDateString()}
                    </Badge>
                </div>
            </div>
        </div>
    );

    const wrappedContent = linkable ? (
        <Link
            href={linkHref}
            className={cn("block focus:outline-none", className)}
            onMouseEnter={handleHoverStart}
            onMouseLeave={handleHoverEnd}
            onClick={() => setIsOpen(false)}
        >
            {cardContent}
        </Link>
    ) : (
        <div
            role="button"
            tabIndex={0}
            className={cn("block focus:outline-none", className)}
            onMouseEnter={handleHoverStart}
            onMouseLeave={handleHoverEnd}
            onClick={handleCardClick}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    handleCardClick();
                }
            }}
        >
            {cardContent}
        </div>
    );

    return (
        <Popover
            open={isOpen}
            onOpenChange={(open) => {
                if (!open) setIsOpen(false);
            }}
        >
            <PopoverTrigger asChild>
                {wrappedContent}
            </PopoverTrigger>
            <Portal>
                <PopoverContent
                    className="w-80 sm:w-96 max-h-80 overflow-auto"
                    onMouseEnter={handleHoverStart}
                    onMouseLeave={handleHoverEnd}
                    side="right"
                    align="start"
                    sideOffset={5}
                >
                    <div className="flex flex-col gap-3 pl-3">
                        <div className="flex items-start gap-2">
                            <ViewpointIcon />
                            <h3 className="text-lg font-semibold -mt-0.5">{title}</h3>
                        </div>

                        <div className="text-sm text-muted-foreground mb-1">
                            By <span className="font-bold text-yellow-500">{author}</span>
                        </div>

                        <div className="prose dark:prose-invert max-w-none text-sm [&>p]:mb-4 [&>p]:leading-7 [&>h1]:mt-8 [&>h1]:mb-4 [&>h2]:mt-6 [&>h2]:mb-4 [&>h3]:mt-4 [&>h3]:mb-2 [&>ul]:mb-4 [&>ul]:ml-6 [&>ol]:mb-4 [&>ol]:ml-6 [&>li]:mb-2 [&>blockquote]:border-l-4 [&>blockquote]:border-muted [&>blockquote]:pl-4 [&>blockquote]:italic">
                            <DynamicMarkdown remarkPlugins={[remarkGfm]}>
                                {description}
                            </DynamicMarkdown>
                        </div>
                    </div>
                </PopoverContent>
            </Portal>
        </Popover>
    );
}; 