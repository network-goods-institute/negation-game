import React from 'react';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { WifiOff } from 'lucide-react';

interface OfflineIndicatorProps {
    isOffline: boolean;
}

export function OfflineIndicator({ isOffline }: OfflineIndicatorProps) {
    if (!isOffline) {
        return null;
    }
    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger>
                    <WifiOff className="h-4 w-4 text-destructive" />
                </TooltipTrigger>
                <TooltipContent side="bottom">
                    <p>Offline. Sync paused.</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
} 