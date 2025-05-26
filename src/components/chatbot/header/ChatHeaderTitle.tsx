import React from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ArrowLeft, Menu, Loader2 } from 'lucide-react';

interface ChatHeaderTitleProps {
    mode: 'chat' | 'create_rationale';
    isMobile: boolean;
    isGenerating: boolean;
    onShowMobileMenu: () => void;
    onBack: () => void;
    onCloseRationaleCreator: () => void;
}

export function ChatHeaderTitle({
    mode,
    isMobile,
    isGenerating,
    onShowMobileMenu,
    onBack,
    onCloseRationaleCreator,
}: ChatHeaderTitleProps) {
    return (
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
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={onBack}
                                className="text-primary hover:bg-primary/10 rounded-full h-9 w-9"
                            >
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                            Back to Dashboard
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
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
                                    This is a Beta version. Features and performance may change significantly.
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
    );
} 