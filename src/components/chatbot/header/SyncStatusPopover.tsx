import React from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface SyncStatusPopoverProps {
    isAuthenticated: boolean;
    isSyncing: boolean;
    syncActivity: 'idle' | 'checking' | 'pulling' | 'saving' | 'error';
    lastSyncTime: number | null;
    lastSyncStats: { pulled: number; pushedUpdates: number; pushedCreates: number; errors: number } | null;
    syncError: string | null;
    onTriggerSync: () => void;
    isPulling: boolean;
    isSaving: boolean;
}

export function SyncStatusPopover({
    isAuthenticated,
    isSyncing,
    syncActivity,
    lastSyncTime,
    lastSyncStats,
    syncError,
    onTriggerSync,
    isPulling,
    isSaving,
}: SyncStatusPopoverProps) {
    if (!isAuthenticated) {
        return null;
    }

    const triggerClass = isSyncing
        ? 'text-blue-600 bg-blue-100/60 dark:text-blue-400 dark:bg-blue-900/30'
        : syncActivity === 'error'
            ? 'text-destructive bg-destructive/10'
            : 'text-muted-foreground hover:bg-accent';

    const activityLabel =
        syncActivity === 'checking'
            ? 'Checking...'
            : syncActivity === 'pulling'
                ? 'Pulling Chats'
                : syncActivity === 'saving'
                    ? 'Saving Chats'
                    : syncActivity === 'error'
                        ? 'Sync Error'
                        : 'Up to date';

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs h-auto ${triggerClass}`}>
                    <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>{activityLabel}</span>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 text-sm p-3" side="bottom" align="end">
                <div className="font-medium mb-2 border-b pb-2">Sync Status</div>
                <div className="space-y-1.5">
                    <p>
                        Status: {' '}
                        {syncActivity === 'checking'
                            ? 'Checking for changes...'
                            : syncActivity === 'pulling'
                                ? 'Pulling changes...'
                                : syncActivity === 'saving'
                                    ? 'Saving changes...'
                                    : syncActivity === 'error'
                                        ? <span className="text-destructive">Error</span>
                                        : 'Idle (Up to date)'}
                    </p>
                    <p>
                        Space: {' '}
                        <span className="font-medium">{lastSyncTime !== null ? new Date(lastSyncTime).toLocaleTimeString() : 'Never'}</span>
                    </p>
                    {lastSyncStats && !isSyncing && syncActivity !== 'error' && (
                        <div className="text-xs pt-1 text-muted-foreground">
                            <p>Synced from server: {lastSyncStats.pulled}</p>
                            <p>Saved to server (Update): {lastSyncStats.pushedUpdates}</p>
                            <p>Saved to server (Create): {lastSyncStats.pushedCreates}</p>
                            {lastSyncStats.errors > 0 && <p className="text-destructive">Errors: {lastSyncStats.errors}</p>}
                        </div>
                    )}
                    {syncError && <p className="text-xs text-destructive pt-1">Error: {syncError.substring(0, 200)}</p>}
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-3">
                    <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-xs"
                        onClick={() => {
                            if (isSyncing) {
                                toast.info('Sync already in progress. Please wait.');
                            } else {
                                onTriggerSync();
                            }
                        }}
                        disabled={isSyncing}
                        title="Check server for newer chats or deletions"
                    >
                        {isPulling ? 'Pulling...' : 'Check for Pulls'}
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-xs"
                        onClick={() => {
                            if (isSyncing) {
                                toast.info('Sync already in progress. Please wait.');
                            } else {
                                onTriggerSync();
                            }
                        }}
                        disabled={isSyncing}
                        title="Ensure local updates are saved to the server"
                    >
                        {isSaving ? 'Saving...' : 'Push Local Changes'}
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    );
} 