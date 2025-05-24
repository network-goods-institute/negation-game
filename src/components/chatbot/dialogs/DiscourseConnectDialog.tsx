import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CircleIcon, CircleDotIcon } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { AuthenticatedActionButton } from "@/components/editor/AuthenticatedActionButton";
import { DiscourseConnectionStatus, DiscourseMessage } from '@/types/chat';

interface DiscourseConnectDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    isMobile: boolean;
    connectionStatus: DiscourseConnectionStatus;
    discourseUsername: string;
    setDiscourseUsername: (username: string) => void;
    storedMessages: DiscourseMessage[];
    isConnectingToDiscourse: boolean;
    fetchProgress: number;
    error: string | null;
    handleConnect: () => void;
    handleViewMessages: () => void;
    handleDeleteMessages: () => void;
}

export function DiscourseConnectDialog({
    isOpen,
    onOpenChange,
    isMobile,
    connectionStatus,
    discourseUsername,
    setDiscourseUsername,
    storedMessages,
    isConnectingToDiscourse,
    fetchProgress,
    error,
    handleConnect,
    handleViewMessages,
    handleDeleteMessages,
}: DiscourseConnectDialogProps) {
    const isUnavailable = connectionStatus === 'unavailable_logged_out';

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className={`${isMobile ? 'w-[95vw] rounded-lg' : 'sm:max-w-[500px]'}`}>
                <DialogHeader>
                    <DialogTitle>Connect Discourse Account</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <p className="text-sm text-muted-foreground">
                        Connect your Discourse account to enhance the AI&apos;s understanding of your writing style and arguments.
                        This is optional but recommended for better assistance.
                    </p>

                    {/* Unavailable State Message */}
                    {isUnavailable && (
                        <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4">
                            <div className="flex items-center gap-2">
                                <CircleIcon className="h-4 w-4 text-orange-500" />
                                <p className="text-sm font-medium text-orange-500">Login Required</p>
                            </div>
                            <p className="text-sm text-muted-foreground mt-2">
                                You need to be logged in to connect your Discourse account.
                            </p>
                        </div>
                    )}

                    {/* Connection Status Banner (Only if NOT unavailable) */}
                    {!isUnavailable && connectionStatus === 'partially_connected' && (
                        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                            <div className="flex items-center gap-2">
                                <CircleDotIcon className="h-4 w-4 text-yellow-500" />
                                <p className="text-sm font-medium text-yellow-500">Partially Connected</p>
                            </div>
                            <p className="text-sm text-muted-foreground mt-2">
                                You have stored messages but no active connection. Please enter your credentials to reconnect.
                            </p>
                        </div>
                    )}

                    {connectionStatus === 'pending' && (
                        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                            <div className="flex items-center gap-2">
                                <CircleDotIcon className="h-4 w-4 text-blue-500" />
                                <p className="text-sm font-medium text-blue-500">Connection Pending</p>
                            </div>
                            <p className="text-sm text-muted-foreground mt-2">
                                Credentials set but no messages fetched yet. Click connect to fetch your messages.
                            </p>
                        </div>
                    )}

                    {/* Username Input (Hide if unavailable) */}
                    {!isUnavailable && (
                        <div className="space-y-2">
                            <Label htmlFor="discourse-username">What&apos;s your Discourse username for Scroll?</Label>
                            <Input
                                id="discourse-username"
                                value={discourseUsername}
                                onChange={(e) => setDiscourseUsername(e.target.value)}
                                placeholder="Your Discourse username"
                                disabled={isConnectingToDiscourse}
                            />
                            {/* Add URL input if needed */}
                        </div>
                    )}

                    {/* Message count indicator (Show even if unavailable) */}
                    {storedMessages.length > 0 && (
                        <div className="bg-muted/50 rounded-lg p-4 border">
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="text-sm font-medium">
                                        {storedMessages.length} {storedMessages.length === 1 ? 'message' : 'messages'} stored
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {storedMessages.length > 0 ?
                                            new Date(Math.max(...storedMessages.map(m => new Date(m.created_at).getTime()))).toLocaleString()
                                            : 'N/A'}
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleViewMessages}
                                        className="text-xs"
                                    >
                                        View Messages
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleDeleteMessages}
                                        className="text-xs text-destructive hover:text-destructive"
                                    >
                                        Clear
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

                    {isConnectingToDiscourse && fetchProgress > 0 && (
                        <div className="space-y-2">
                            <Progress value={fetchProgress} className="w-full h-2" />
                            <p className="text-xs text-muted-foreground text-center">
                                {fetchProgress < 20 && "Initializing..."}
                                {fetchProgress >= 20 && fetchProgress < 90 && "Fetching messages..."}
                                {fetchProgress >= 90 && fetchProgress < 95 && "Processing data..."}
                                {fetchProgress >= 95 && "Finishing up..."}
                            </p>
                        </div>
                    )}
                    {error && (
                        <p className="text-sm text-destructive">{error}</p>
                    )}
                </div>
                <div className="flex justify-end gap-2">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isConnectingToDiscourse}
                    >
                        {isUnavailable ? 'Close' : 'Cancel'}
                    </Button>
                    {/* Connect Button (Hide if unavailable) */}
                    {!isUnavailable && (
                        <AuthenticatedActionButton
                            onClick={handleConnect}
                            disabled={isConnectingToDiscourse || !discourseUsername.trim()}
                            rightLoading={isConnectingToDiscourse}
                        >
                            Connect
                        </AuthenticatedActionButton>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
} 