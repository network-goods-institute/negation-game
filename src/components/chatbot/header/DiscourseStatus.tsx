import React from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AuthenticatedActionButton } from '@/components/editor/AuthenticatedActionButton';
import { Loader2, CircleDotIcon, CircleIcon } from 'lucide-react';
import { useDiscourseIntegration } from '@/hooks/data/useDiscourseIntegration';

interface DiscourseStatusProps {
    isNonGlobalSpace: boolean;
    isInitializing: boolean;
    isMobile: boolean;
    discourse: ReturnType<typeof useDiscourseIntegration>;
}

export function DiscourseStatus({ isNonGlobalSpace, isInitializing, isMobile, discourse }: DiscourseStatusProps) {
    if (!isNonGlobalSpace || isInitializing) {
        return null;
    }
    return (
        <TooltipProvider delayDuration={200}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <AuthenticatedActionButton
                        variant="ghost"
                        className={`flex items-center gap-1.5 cursor-pointer transition-colors p-1.5 rounded-full ${isMobile ? '' : 'hover:bg-accent'}`}
                        onClick={() => discourse.setShowDiscourseDialog(true)}
                        role="button"
                    >
                        {discourse.isCheckingDiscourse ? (
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        ) : discourse.connectionStatus === 'connected' ? (
                            <CircleDotIcon className="h-4 w-4 text-green-500" />
                        ) : discourse.connectionStatus === 'partially_connected' ? (
                            <CircleDotIcon className="h-4 w-4 text-yellow-500" />
                        ) : discourse.connectionStatus === 'pending' ? (
                            <CircleDotIcon className="h-4 w-4 text-blue-500" />
                        ) : discourse.connectionStatus === 'unavailable_logged_out' ? (
                            <CircleIcon className="h-4 w-4 text-gray-500" />
                        ) : (
                            <CircleIcon className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="text-xs font-medium mr-1">
                            {discourse.isCheckingDiscourse
                                ? 'Checking'
                                : discourse.connectionStatus === 'connected'
                                    ? 'Connected'
                                    : discourse.connectionStatus === 'partially_connected'
                                        ? 'Messages Stored'
                                        : discourse.connectionStatus === 'pending'
                                            ? 'Pending Fetch'
                                            : discourse.connectionStatus === 'unavailable_logged_out'
                                                ? 'Login Required'
                                                : 'Not Connected'}
                        </span>
                    </AuthenticatedActionButton>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                    {discourse.isCheckingDiscourse
                        ? 'Checking Discourse connection...'
                        : discourse.connectionStatus === 'connected'
                            ? `Connected as ${discourse.discourseUsername}`
                            : discourse.connectionStatus === 'partially_connected'
                                ? 'Stored messages found. Connect to update.'
                                : discourse.connectionStatus === 'pending'
                                    ? 'Ready to fetch messages. Click settings to connect.'
                                    : discourse.connectionStatus === 'unavailable_logged_out'
                                        ? 'Login required to connect Discourse'
                                        : 'Connect to Discourse'}
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
} 