import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeftIcon, NetworkIcon } from 'lucide-react';
import useIsMobile from '@/hooks/useIsMobile';


interface RationaleHeaderBarProps {
    title: React.ReactNode;
    onBack: () => void;
    isCanvasEnabled: boolean;
    toggleCanvas: () => void;
    children?: React.ReactNode;
}

export default function RationaleHeaderBar({
    title,
    onBack,
    isCanvasEnabled,
    toggleCanvas,
    children,
}: RationaleHeaderBarProps) {
    const isMobile = useIsMobile();

    return (
        <div className="sticky top-0 z-20 w-full flex items-center justify-between px-2 py-1.5 bg-background/70 backdrop-blur border-b">
            <div className="flex items-center gap-1.5">
                <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-1 px-1.5 rounded-md -ml-1 h-7"
                    onClick={onBack}
                >
                    <ArrowLeftIcon className="size-3.5" />
                    <span className="text-xs">Back</span>
                </Button>
                <h1 className="text-sm font-bold flex items-center gap-2">
                    {title}
                </h1>
                {isMobile && (
                    <Button
                        size="icon"
                        variant={isCanvasEnabled ? 'default' : 'outline'}
                        className="rounded-full p-1 size-7 ml-2"
                        onClick={toggleCanvas}
                    >
                        <NetworkIcon className="size-3.5" />
                    </Button>
                )}
            </div>
            {children && <div className="flex items-center gap-1">{children}</div>}
        </div>
    );
} 