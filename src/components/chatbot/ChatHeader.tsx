"use client";

import { Button } from "@/components/ui/button";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { AuthenticatedActionButton } from "@/components/AuthenticatedActionButton";
import {
    Loader2,
    ArrowLeft,
    CircleIcon,
    CircleDotIcon,
    Menu,
    RefreshCw,
    WifiOff,
    LinkIcon,
    FileText,
    EyeIcon,
    EyeOffIcon,
    NetworkIcon,
    ChevronDown,
    ChevronUp,
} from "lucide-react";
import { useDiscourseIntegration } from "@/hooks/useDiscourseIntegration";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import TopicSelector from "@/components/TopicSelector";

interface SyncStats {
    pulled: number;
    pushedUpdates: number;
    pushedCreates: number;
    errors: number;
}

interface ChatHeaderProps {
    isMobile: boolean;
    isAuthenticated: boolean;
    isInitializing: boolean;
    currentSpace: string | null;
    isSyncing: boolean;
    syncActivity: "idle" | "checking" | "pulling" | "saving" | "error";
    lastSyncTime: number | null;
    lastSyncStats: SyncStats | null;
    syncError: string | null;
    discourse: ReturnType<typeof useDiscourseIntegration>;
    isNonGlobalSpace: boolean;
    isGenerating: boolean;
    onShowMobileMenu: () => void;
    onBack: () => void;
    onTriggerSync: () => void;
    isPulling: boolean;
    isSaving: boolean;
    isOffline: boolean;
    mode: 'chat' | 'create_rationale';
    showGraph: boolean;
    setShowGraph: (show: boolean) => void;
    linkUrl: string;
    setLinkUrl: (url: string) => void;
    /** Rationale description text */
    description?: string;
    /** Called when rationale description changes */
    onDescriptionChange?: (desc: string) => void;
    /** Whether the description editor panel is visible */
    showDescEditor?: boolean;
    /** Toggle description editor panel */
    onToggleDescriptionEditor?: () => void;
    /** Back button handler when in rationale mode */
    onCloseRationaleCreator?: () => void;
    canvasEnabled: boolean;
    setCanvasEnabled: (enabled: boolean) => void;
    hasGraph: boolean;
    onOpenRationaleCreator: () => void;
    topic: string;
    onTopicChange: (topic: string) => void;
}

export function ChatHeader({
    isMobile,
    isAuthenticated,
    isInitializing,
    currentSpace,
    isSyncing,
    syncActivity,
    lastSyncTime,
    lastSyncStats,
    syncError,
    discourse,
    isNonGlobalSpace,
    isGenerating,
    onShowMobileMenu,
    onBack,
    onTriggerSync,
    isPulling,
    isSaving,
    isOffline,
    mode,
    showGraph,
    setShowGraph,
    linkUrl,
    setLinkUrl,
    description = '',
    onDescriptionChange = () => { },
    showDescEditor = false,
    onToggleDescriptionEditor = () => { },
    onCloseRationaleCreator = () => { },
    canvasEnabled,
    setCanvasEnabled,
    hasGraph,
    onOpenRationaleCreator,
    topic,
    onTopicChange,
}: ChatHeaderProps) {
    return (
        <div className="fixed top-[var(--header-height)] h-16 border-b bg-background/95 backdrop-blur-sm flex items-center justify-between px-4 md:px-6 z-20 left-0 md:left-72 right-0">
            <div className="flex items-center gap-2 md:gap-3">
                {mode === 'create_rationale' ? (
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onCloseRationaleCreator}
                        className="text-primary hover:bg-primary/10 rounded-full h-9 w-9"
                        title="Back to Chat Options"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                ) : isMobile ? (
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onShowMobileMenu}
                        className="text-primary hover:bg-primary/10 rounded-full h-9 w-9"
                    >
                        <Menu className="h-5 w-5" />
                    </Button>
                ) : (
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onBack}
                        className="text-primary hover:bg-primary/10 rounded-full h-9 w-9"
                        title="Back to Dashboard"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                )}
                <div className="flex items-center gap-2">
                    <h2 className="text-base md:text-lg font-semibold">
                        {mode === 'create_rationale' ? 'Create Rationale' : 'AI Assistant'}
                    </h2>
                    {mode !== 'create_rationale' && (
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger>
                                    <span className="inline-flex items-center rounded-md bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive ring-1 ring-inset ring-destructive/20">
                                        Beta
                                    </span>
                                </TooltipTrigger>
                                <TooltipContent side="bottom">
                                    <p className="max-w-xs">
                                        This is a Beta version. Features and
                                        performance may change significantly.
                                    </p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    )}
                </div>
                {mode === 'chat' && isGenerating && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground" title="Assistant is generating a response for this chat...">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span>Generating...</span>
                    </div>
                )}
            </div>
            <div className="flex items-center gap-2 md:gap-3">
                {mode === 'create_rationale' && (
                    <>
                        <TopicSelector
                            currentSpace={currentSpace || ""}
                            value={topic}
                            onChange={onTopicChange}
                            showLabel={false}
                            wrapperClassName="hidden md:flex flex-col gap-1 mr-4"
                            triggerClassName="h-7 text-xs border-none focus-visible:ring-0 bg-transparent flex-1 w-48"
                        />
                        <div className="hidden md:flex items-center gap-2 bg-muted p-1.5 rounded-md border">
                            <LinkIcon className="h-4 w-4 text-muted-foreground" />
                            <Input
                                type="url"
                                placeholder="Paste Scroll or Discourse Link (optional)"
                                value={linkUrl}
                                onChange={(e) => setLinkUrl(e.target.value)}
                                className="h-7 text-xs border-none focus-visible:ring-0 bg-transparent flex-1 w-60 lg:w-80"
                            />
                        </div>
                        <div className="hidden md:flex items-center gap-2 bg-muted p-1.5 rounded-md border">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <Input
                                type="text"
                                placeholder="Add description (optional)"
                                value={description}
                                onChange={(e) => onDescriptionChange(e.target.value)}
                                className="h-7 text-xs border-none focus-visible:ring-0 bg-transparent flex-1 w-60 lg:w-80"
                            />
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onToggleDescriptionEditor}
                            title={showDescEditor ? "Hide description" : "Add description"}
                            className="hidden md:inline-flex text-muted-foreground hover:text-foreground"
                        >
                            {showDescEditor ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setShowGraph(!showGraph)}
                            title={showGraph ? "Hide Graph Pane" : "Show Graph Pane"}
                            className="hidden md:inline-flex text-muted-foreground hover:text-foreground"
                        >
                            {showGraph ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                        </Button>
                        {/* Mobile: toggle description editor */}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onToggleDescriptionEditor}
                            title={showDescEditor ? "Hide details" : "Show details"}
                            className="md:hidden rounded-full p-1 size-7 text-muted-foreground hover:text-foreground"
                        >
                            {showDescEditor ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                        </Button>
                        {/* Mobile: toggle chat/graph */}
                        <Button
                            variant={canvasEnabled ? "default" : "outline"}
                            size="icon"
                            onClick={() => setCanvasEnabled(!canvasEnabled)}
                            title={canvasEnabled ? "Show Chat" : "Show Graph"}
                            className="md:hidden rounded-full p-1 size-7 text-muted-foreground hover:text-foreground"
                        >
                            <NetworkIcon className="h-4 w-4" />
                        </Button>
                    </>
                )}
                {mode === 'chat' && hasGraph && (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={onOpenRationaleCreator}
                                    className="text-muted-foreground hover:text-foreground"
                                    title="Edit Rationale Graph"
                                >
                                    <NetworkIcon className="h-5 w-5" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom">Edit Rationale Graph</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                )}
                {isOffline && (
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
                )}
                {isAuthenticated && (
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant="ghost"
                                size="sm"
                                className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs h-auto ${isSyncing
                                    ? "text-blue-600 bg-blue-100/60 dark:text-blue-400 dark:bg-blue-900/30"
                                    : syncActivity === "error"
                                        ? "text-destructive bg-destructive/10"
                                        : "text-muted-foreground hover:bg-accent"
                                    }`}
                            >
                                <RefreshCw
                                    className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""
                                        }`}
                                />
                                <span>
                                    {syncActivity === "checking"
                                        ? "Checking..."
                                        : syncActivity === "pulling"
                                            ? "Pulling Chats"
                                            : syncActivity === "saving"
                                                ? "Saving Chats"
                                                : syncActivity === "error"
                                                    ? "Sync Error"
                                                    : "Up to date"}
                                </span>
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent
                            className="w-64 text-sm p-3"
                            side="bottom"
                            align="end"
                        >
                            <div className="font-medium mb-2 border-b pb-2">
                                Sync Status
                            </div>
                            <div className="space-y-1.5">
                                <p>
                                    Status:{" "}
                                    {syncActivity === "checking"
                                        ? "Checking for changes..."
                                        : syncActivity === "pulling"
                                            ? "Pulling changes..."
                                            : syncActivity === "saving"
                                                ? "Saving changes..."
                                                : syncActivity === "error"
                                                    ? <span className="text-destructive">Error</span>
                                                    : "Idle (Up to date)"}
                                </p>
                                <p>
                                    Space:{" "}
                                    <span className="font-medium">
                                        {currentSpace || "N/A"}
                                    </span>
                                </p>
                                <p>
                                    Last Sync:{" "}
                                    {lastSyncTime
                                        ? new Date(
                                            lastSyncTime
                                        ).toLocaleTimeString()
                                        : "Never"}
                                </p>
                                {lastSyncStats &&
                                    !isSyncing &&
                                    syncActivity !== "error" && (
                                        <div className="text-xs pt-1 text-muted-foreground">
                                            <p>
                                                Synced from server:{" "}
                                                {lastSyncStats.pulled}
                                            </p>
                                            <p>
                                                Saved to server (Update):{" "}
                                                {lastSyncStats.pushedUpdates}
                                            </p>
                                            <p>
                                                Saved to server (Create):{" "}
                                                {lastSyncStats.pushedCreates}
                                            </p>
                                            {lastSyncStats.errors > 0 && (
                                                <p className="text-destructive">
                                                    Errors:{" "}
                                                    {lastSyncStats.errors}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                {syncError && (
                                    <p className="text-xs text-destructive pt-1">
                                        Error: {syncError.substring(0, 200)}
                                    </p>
                                )}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 mt-3">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex-1 text-xs"
                                    onClick={() => {
                                        if (isSyncing) {
                                            toast.info("Sync already in progress. Please wait.");
                                        } else {
                                            onTriggerSync();
                                        }
                                    }}
                                    disabled={isSyncing}
                                    title="Check server for newer chats or deletions"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`mr-1.5 h-3.5 w-3.5 ${isPulling ? 'animate-spin' : ''}`}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
                                    {isPulling ? "Pulling..." : "Check for Pulls"}
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex-1 text-xs"
                                    onClick={() => {
                                        if (isSyncing) {
                                            toast.info("Sync already in progress. Please wait.");
                                        } else {
                                            onTriggerSync();
                                        }
                                    }}
                                    disabled={isSyncing}
                                    title="Ensure local updates are saved to the server"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`mr-1.5 h-3.5 w-3.5 ${isSaving ? 'animate-spin' : ''}`}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" /></svg>
                                    {isSaving ? "Saving..." : "Push Local Changes"}
                                </Button>
                            </div>
                        </PopoverContent>
                    </Popover>
                )}

                {isNonGlobalSpace && !isInitializing && (
                    <>
                        <TooltipProvider delayDuration={200}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <AuthenticatedActionButton
                                        variant="ghost"
                                        className={`flex items-center gap-1.5 cursor-pointer transition-colors p-1.5 rounded-full ${isMobile ? "" : "hover:bg-accent"
                                            }`}
                                        onClick={() =>
                                            discourse.setShowDiscourseDialog(true)
                                        }
                                        role="button"
                                    >
                                        {discourse.isCheckingDiscourse ? (
                                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                        ) : discourse.connectionStatus ===
                                            "connected" ? (
                                            <CircleDotIcon className="h-4 w-4 text-green-500" />
                                        ) : discourse.connectionStatus ===
                                            "partially_connected" ? (
                                            <CircleDotIcon className="h-4 w-4 text-yellow-500" />
                                        ) : discourse.connectionStatus ===
                                            "pending" ? (
                                            <CircleDotIcon className="h-4 w-4 text-blue-500" />
                                        ) : discourse.connectionStatus ===
                                            "unavailable_logged_out" ? (
                                            <CircleIcon className="h-4 w-4 text-gray-500" />
                                        ) : (
                                            <CircleIcon className="h-4 w-4 text-muted-foreground" />
                                        )}
                                        <span className="text-xs font-medium mr-1">
                                            {discourse.isCheckingDiscourse
                                                ? "Checking"
                                                : discourse.connectionStatus ===
                                                    "connected"
                                                    ? "Connected"
                                                    : discourse.connectionStatus ===
                                                        "partially_connected"
                                                        ? "Messages Stored"
                                                        : discourse.connectionStatus ===
                                                            "pending"
                                                            ? "Pending Fetch"
                                                            : discourse.connectionStatus ===
                                                                "unavailable_logged_out"
                                                                ? "Login Required"
                                                                : "Not Connected"}
                                        </span>
                                    </AuthenticatedActionButton>
                                </TooltipTrigger>
                                <TooltipContent side="bottom">
                                    {discourse.isCheckingDiscourse
                                        ? "Checking Discourse connection..."
                                        : discourse.connectionStatus ===
                                            "connected"
                                            ? `Connected as ${discourse.discourseUsername}`
                                            : discourse.connectionStatus ===
                                                "partially_connected"
                                                ? "Stored messages found. Connect to update."
                                                : discourse.connectionStatus ===
                                                    "pending"
                                                    ? "Ready to fetch messages. Click settings to connect."
                                                    : discourse.connectionStatus ===
                                                        "unavailable_logged_out"
                                                        ? "Login required to connect Discourse"
                                                        : "Connect to Discourse"}
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </>
                )}
            </div>
        </div>
    );
} 