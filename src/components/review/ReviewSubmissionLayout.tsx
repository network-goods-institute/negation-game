"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { LightbulbIcon, CircleCheckBigIcon, AlertTriangleIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface ReviewExistingItem<T> {
    key: string;
    item: T;
    onClick: () => void;
}

export interface ReviewSuggestionItem {
    text: string;
    reason?: string;
}

interface ReviewSubmissionLayoutProps<T> {
    title: string;
    existingHeader: string;
    existingItems?: ReviewExistingItem<T>[];
    renderExistingItem: (item: T) => React.ReactNode;

    suggestions?: ReviewSuggestionItem[];
    onSelectSuggestion?: (text: string) => void;
    onRetry?: () => void;
    retryLabel?: string;
    retryDisabled?: boolean;

    originalText: string;
    isGoodEnough: boolean;
    feedback?: string;
    originalPositiveLabel: string;
    onSelectOriginal: () => void;
}

export function ReviewSubmissionLayout<T>({
    title,
    existingHeader,
    existingItems = [],
    renderExistingItem,
    suggestions = [],
    onSelectSuggestion,
    onRetry,
    retryLabel = "Try again",
    retryDisabled,
    originalText,
    isGoodEnough,
    feedback,
    originalPositiveLabel,
    onSelectOriginal,
}: ReviewSubmissionLayoutProps<T>) {
    const hasExisting = existingItems.length > 0;
    const showSuggestions = !isGoodEnough && suggestions.length > 0;

    return (
        <div className="flex flex-col w-full h-full">
            <div className="p-6 overflow-y-auto max-h-[75vh]">
                {/* Title is provided by outer DialogTitle in parents to avoid duplicate headers */}

                {hasExisting && (
                    <div className="mb-8">
                        <h4 className="text-md font-medium mb-2">{existingHeader}</h4>
                        <p className="text-sm text-muted-foreground mb-3">
                            Do these mean the same thing as your text? Reusing points gets you the most influence.
                        </p>
                        <div className="space-y-3">
                            {existingItems.map(({ key, item, onClick }) => (
                                <div
                                    key={key}
                                    className="flex flex-col gap-3 p-4 w-full bg-background cursor-pointer border rounded-md transition-colors shadow-sm hover:border-primary hover:ring-1 hover:ring-primary"
                                    onClick={onClick}
                                >
                                    {renderExistingItem(item)}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {hasExisting && (showSuggestions || !isGoodEnough) && (
                    <div className="flex items-center gap-3 my-4">
                        <div className="h-px bg-border flex-grow" />
                        <span className="text-sm text-muted-foreground font-medium">OR</span>
                        <div className="h-px bg-border flex-grow" />
                    </div>
                )}

                {showSuggestions ? (
                    <div className="mb-8">
                        <div className="flex items-center gap-2 mb-3">
                            <LightbulbIcon className="text-yellow-500 size-5" />
                            <h4 className="text-md font-medium">AI Suggestions (Optional)</h4>
                        </div>
                        <div className="space-y-3">
                            {suggestions.map((s, i) => (
                                <div
                                    key={`ai-suggestion-${i}`}
                                    className="relative flex flex-col gap-2 p-4 w-full bg-background cursor-pointer border border-dashed rounded-md transition-colors shadow-sm hover:border-blue-500 hover:ring-1 hover:ring-blue-500"
                                    onClick={() => onSelectSuggestion?.(s.text)}
                                >
                                    <div className="flex flex-col items-end sm:flex-row sm:justify-between sm:items-start">
                                        <Badge className="bg-blue-500/15 text-blue-500 border-blue-500 hover:bg-blue-500/20 whitespace-nowrap mb-2 sm:mb-0 order-first sm:order-last">
                                            AI Suggestion
                                        </Badge>
                                        <span className="w-full text-sm">{s.text}</span>
                                    </div>
                                    {s.reason && (
                                        <div className="flex items-center mt-2">
                                            <span className="text-sm text-blue-500 font-medium">{s.reason}</span>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                        <p className="text-xs text-muted-foreground mt-2 text-center">
                            You can edit any suggestions after selecting them
                        </p>
                    </div>
                ) : (
                    <div className="p-3 border rounded-md bg-amber-50 dark:bg-amber-950/10 mb-6 flex items-center justify-between gap-3">
                        <p className="text-sm m-0">{isGoodEnough ? "Looks good. You can submit your original text." : "AI suggestions are temporarily unavailable. You can submit your original text or try again in a moment."}</p>
                        {!isGoodEnough && onRetry && (
                            <button
                                type="button"
                                className="text-xs px-3 py-1 rounded-md border bg-background hover:bg-muted disabled:opacity-50"
                                onClick={onRetry}
                                disabled={retryDisabled}
                            >
                                {retryLabel}
                            </button>
                        )}
                    </div>
                )}

                <div className="flex items-center gap-3 my-4">
                    <div className="h-px bg-border flex-grow" />
                    <span className="text-sm text-muted-foreground font-medium">OR</span>
                    <div className="h-px bg-border flex-grow" />
                </div>

                <div
                    onClick={onSelectOriginal}
                    className={cn(
                        "relative flex flex-col p-4 w-full shadow-sm bg-background cursor-pointer border rounded-md transition-colors",
                        isGoodEnough
                            ? "border-green-500 border-dashed hover:border-green-500 hover:ring-1 hover:ring-green-500"
                            : "border-yellow-500 border-dashed hover:border-yellow-500 hover:ring-1 hover:ring-yellow-500"
                    )}
                >
                    <div className="flex justify-between items-start">
                        <div className="flex-grow relative">
                            <div className="text-sm">{originalText}</div>
                        </div>
                        <Badge
                            className={cn(
                                "border whitespace-nowrap ml-2",
                                isGoodEnough
                                    ? "bg-green-500/15 text-green-500 border-green-500 hover:bg-green-500/20"
                                    : "bg-yellow-500/15 text-yellow-500 border-yellow-500 hover:bg-yellow-500/20"
                            )}
                        >
                            {isGoodEnough ? originalPositiveLabel : "Needs Work"}
                        </Badge>
                    </div>
                    <div className="mt-3 flex items-center">
                        {isGoodEnough ? (
                            <>
                                <CircleCheckBigIcon className="size-4 text-green-500 mr-2 flex-shrink-0" />
                                <span className="text-sm text-green-500">That looks good</span>
                            </>
                        ) : (
                            <>
                                <AlertTriangleIcon className="size-4 text-yellow-500 mr-2 flex-shrink-0" />
                                <span className="text-sm text-yellow-500">{feedback}</span>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ReviewSubmissionLayout;


