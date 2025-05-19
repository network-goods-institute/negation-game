"use client";

import { Button } from "@/components/ui/button";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    LinkIcon,
    FileText,
    EyeIcon,
    EyeOffIcon,
    NetworkIcon,
    ChevronDown,
    ChevronUp,
} from "lucide-react";
import { useDiscourseIntegration } from "@/hooks/useDiscourseIntegration";
import { Input } from "@/components/ui/input";
import TopicSelector from "@/components/TopicSelector";
import { DiscourseStatus } from "./header/DiscourseStatus";
import { OfflineIndicator } from "./header/OfflineIndicator";
import { ChatHeaderTitle } from "./header/ChatHeaderTitle";
import { SyncStatusPopover } from "./header/SyncStatusPopover";

// Skeleton placeholder for ChatHeader
export const ChatHeaderSkeleton = () => (
    <div className="fixed top-[var(--header-height)] h-16 border-b bg-muted animate-pulse"></div>
);

interface SyncStats {
    pulled: number;
    pushedUpdates: number;
    pushedCreates: number;
    errors: number;
}

export interface ChatHeaderProps {
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
        <div className="fixed top-[var(--header-height)] h-16 border-b bg-background/95 backdrop-blur-sm flex items-center justify-between px-4 md:px-6 z-20 left-0 md:left-[var(--sidebar-width)] right-0">
            <ChatHeaderTitle
                mode={mode}
                isMobile={isMobile}
                isGenerating={isGenerating}
                onShowMobileMenu={onShowMobileMenu}
                onBack={onBack}
                onCloseRationaleCreator={onCloseRationaleCreator}
            />
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
                <OfflineIndicator isOffline={isOffline} />
                <SyncStatusPopover
                    isAuthenticated={isAuthenticated}
                    isSyncing={isSyncing}
                    syncActivity={syncActivity}
                    lastSyncTime={lastSyncTime}
                    lastSyncStats={lastSyncStats}
                    syncError={syncError}
                    onTriggerSync={onTriggerSync}
                    isPulling={isPulling}
                    isSaving={isSaving}
                />
                <DiscourseStatus
                    isNonGlobalSpace={isNonGlobalSpace}
                    isInitializing={isInitializing}
                    isMobile={isMobile}
                    discourse={discourse}
                />
            </div>
        </div>
    );
} 