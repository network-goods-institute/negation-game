"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { decodeId } from "@/lib/negation-game/decodeId";
import { encodeId } from "@/lib/negation-game/encodeId";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Loader } from "@/components/ui/loader";
import { ArrowLeft, Users, FileText, MessageSquare } from "lucide-react";
import { usePrivy } from "@privy-io/react-auth";
import { useSpace } from "@/queries/space/useSpace";
import { useConsilienceAuthors } from "@/queries/consilience/useConsilienceAuthors";
import { useUniqueRationaleAuthors } from "@/hooks/consilience/useUniqueRationaleAuthors";
import { useTopics } from "@/queries/topics/useTopics";
import { ConsilienceResults } from "./ConsilienceResults";

interface ConsilienceState {
  step: "select" | "generating" | "results";
  selectedRationales: string[];
  topicId: number;
  topicName: string;
  discourseContent: string;
  originalProposal: string;
  generatedProposal: string;
  manualOriginal: string;
  discourseLoading: boolean;
  discourseError: string | null;
  discourseSuccess: boolean;
  discourseRetryCount: number;
  discourseAutoRetrying: boolean;
  changes: {
    summary: string;
    reasoning: string;
    diffs: Array<{
      type: "addition" | "modification" | "removal";
      originalText?: string;
      newText?: string;
      explanation: string;
      decision: "approved" | "rejected" | "pending";
    }>;
  } | null;
}

export function ConsiliencePageClient() {
  const params = useParams();
  const searchParams = useSearchParams();
  const spaceSlug = params.space as string;
  const { user: privyUser, ready: privyReady } = usePrivy();
  const router = useRouter();

  const { data: space } = useSpace(spaceSlug);
  const spaceId = space?.id;
  const { data: topics } = useTopics(spaceId || "");

  const [state, setState] = useState<ConsilienceState>({
    step: "select",
    selectedRationales: [],
    topicId: 0,
    topicName: "",
    discourseContent: "",
    originalProposal: "",
    generatedProposal: "",
    manualOriginal: "",
    discourseLoading: false,
    discourseError: null,
    discourseSuccess: false,
    discourseRetryCount: 0,
    discourseAutoRetrying: false,
    changes: null,
  });

  const [isNavigatingBack, setIsNavigatingBack] = useState(false);

  const topicIdParam = searchParams.get("topicId");
  const decodedTopicId = React.useMemo(() => {
    if (!topicIdParam) return undefined;
    try {
      return decodeId(topicIdParam);
    } catch {
      return undefined;
    }
  }, [topicIdParam]);
  const topic = topics?.find(t => t.id === decodedTopicId);

  const { data: authors, isLoading: isAuthorsLoading } = useConsilienceAuthors(topic?.id);

  useEffect(() => {
    if (topic) {
      setState(prev => ({
        ...prev,
        topicId: topic.id,
        topicName: topic.name,
        discourseContent: topic.discourseUrl || "",
      }));
    }
  }, [topic]);

  useEffect(() => {
    if (topic?.id) {
      const href = `/s/${spaceSlug}/topic/${encodeId(topic.id)}`;
      try { router.prefetch(href); } catch { }
    }
  }, [router, spaceSlug, topic?.id]);

  const MAX_DISCOURSE_RETRIES = 5;
  const RETRY_DELAY_MS = 3000;
  const abortRef = useRef<AbortController | null>(null);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shouldAutoRetryRef = useRef<boolean>(true);

  const clearPendingRetry = () => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  };

  const fetchOriginal = useCallback(async (manualRetry?: boolean) => {
    if (!topic?.discourseUrl) {
      setState(prev => ({
        ...prev,
        discourseError: null,
        discourseLoading: false,
        discourseSuccess: false
      }));
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    clearPendingRetry();
    if (manualRetry) {
      // Re-enable auto-retry after a manual retry
      shouldAutoRetryRef.current = true;
    }

    setState(prev => ({
      ...prev,
      discourseLoading: true,
      discourseError: null,
      discourseSuccess: false,
      discourseAutoRetrying: !manualRetry && Boolean(prev.discourseRetryCount),
      discourseRetryCount: manualRetry ? 0 : prev.discourseRetryCount,
    }));

    try {
      const res = await fetch(`/api/discourse/content?url=${encodeURIComponent(topic.discourseUrl)}`, { signal: controller.signal });

      if (!res.ok) throw new Error(String(res.status));

      const data = await res.json();

      if (data?.content) {
        setState(prev => ({
          ...prev,
          originalProposal: data.content,
          discourseLoading: false,
          discourseError: null,
          discourseSuccess: true,
          discourseRetryCount: 0,
          discourseAutoRetrying: false
        }));
      } else {
        throw new Error("no_content");
      }
    } catch (error) {
      if ((error as any)?.name === 'AbortError' || (abortRef.current && abortRef.current.signal.aborted)) return;
      setState(prev => {
        const nextCount = prev.discourseRetryCount + 1;
        const shouldRetry = shouldAutoRetryRef.current && nextCount < MAX_DISCOURSE_RETRIES;
        if (shouldRetry) {
          retryTimeoutRef.current = setTimeout(() => {
            if (shouldAutoRetryRef.current) {
              fetchOriginal(false);
            }
          }, RETRY_DELAY_MS);
        }
        return {
          ...prev,
          discourseLoading: shouldRetry,
          discourseError: "Unable to fetch discourse content - network or rate limit error",
          discourseSuccess: false,
          discourseRetryCount: nextCount,
          discourseAutoRetrying: shouldRetry
        };
      });
    }
  }, [topic?.discourseUrl]);

  useEffect(() => {
    shouldAutoRetryRef.current = true;
    fetchOriginal();
  }, [fetchOriginal]);

  useEffect(() => {
    return () => {
      clearPendingRetry();
      abortRef.current?.abort();
    };
  }, []);

  const handleCancelFetch = useCallback(() => {
    shouldAutoRetryRef.current = false;
    clearPendingRetry();
    abortRef.current?.abort();
    setState(prev => ({
      ...prev,
      discourseLoading: false,
      discourseAutoRetrying: false
    }));
  }, []);

  const uniqueRationaleAuthors = useUniqueRationaleAuthors(authors);

  const decodeStreamToJson = async (res: Response) => {
    const reader = res.body?.getReader();
    if (!reader) throw new Error("No response stream");
    let accumulatedText = "";
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      accumulatedText += decoder.decode(value, { stream: true });
    }
    let cleanText = accumulatedText
      .split("\n")
      .filter((line) => {
        try {
          const obj = JSON.parse(line);
          return !(obj && obj.status && !obj.proposal);
        } catch {
          return true;
        }
      })
      .join("\n")
      .trim();
    if (cleanText.startsWith("```json")) {
      cleanText = cleanText.replace(/^```json\s*/, "").replace(/\s*```$/, "");
    } else if (cleanText.startsWith("```")) {
      cleanText = cleanText.replace(/^```\s*/, "").replace(/\s*```$/, "");
    }
    try {
      return JSON.parse(cleanText);
    } catch {
      return {
        proposal: accumulatedText,
        summary: "Generated proposal (could not parse AI response structure)",
        reasoning: "The AI provided a proposal but not in the expected structured format",
        diffs: [],
      };
    }
  };

  const handleGenerateConsilience = async () => {
    setState((prev) => ({ ...prev, step: "generating" }));
    try {
      const response = await fetch("/api/consilience/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topicId: state.topicId,
          selectedUserIds: state.selectedRationales,
          manualOriginal: state.manualOriginal?.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Failed to generate consilience");
      }

      const parsed = await decodeStreamToJson(response);
      const proposalText = parsed.proposal || "";

      setState((prev) => ({
        ...prev,
        step: "results",
        generatedProposal: proposalText,
        originalProposal:
          (state.manualOriginal?.trim() || state.originalProposal) ||
          "Original proposal not available",
        changes: {
          summary:
            parsed.summary || "Combined perspectives from selected delegates",
          reasoning:
            parsed.reasoning ||
            "The proposal has been updated to incorporate insights from both delegate perspectives",
          diffs:
            Array.isArray(parsed.diffs) && parsed.diffs.length > 0
              ? parsed.diffs.map((d: any) => {
                const t = String(d.type || "").toLowerCase();
                return {
                  type:
                    t === "removal"
                      ? "removal"
                      : t === "modification"
                        ? "modification"
                        : "addition",
                  originalText: d.originalText || undefined,
                  newText: d.newText || undefined,
                  explanation: d.explanation || "No explanation provided",
                  decision: "pending" as const,
                };
              })
              : [],
        },
      }));
    } catch (error) {
      console.error("Error generating consilience:", error);
      setState((prev) => ({
        ...prev,
        step: "select",
      }));
      // TODO: Show error toast or alert
    }
  };

  useEffect(() => {
    if (state.step === 'results') {
      try {
        const savedOriginal = (state.manualOriginal?.trim() || state.originalProposal || '').trim();
        const savedGenerated = (state.generatedProposal || '').trim();
        const payload = {
          topicId: state.topicId,
          generatedProposal: savedGenerated,
          originalProposal: savedOriginal === 'Original proposal not available' ? '' : savedOriginal,
          changes: state.changes,
          selectedRationales: state.selectedRationales,
        } as const;
        localStorage.setItem('consilience:last', JSON.stringify(payload));
      } catch { }
    }
  }, [state.step, state.generatedProposal, state.originalProposal, state.changes, state.selectedRationales, state.topicId, state.manualOriginal]);

  useEffect(() => {
    if (state.step === 'select' && topic?.id) {
      try {
        const saved = localStorage.getItem('consilience:last');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.topicId === topic.id) {
            const validOriginal = typeof parsed.originalProposal === 'string' && parsed.originalProposal.trim().length > 0 && parsed.originalProposal.trim() !== 'Original proposal not available';
            const validGenerated = typeof parsed.generatedProposal === 'string' && parsed.generatedProposal.trim().length > 0;
            const nextSelected = Array.isArray(parsed.selectedRationales) ? parsed.selectedRationales : [];
            if (validOriginal && validGenerated && parsed.changes) {
              setState(prev => ({
                ...prev,
                step: 'results',
                generatedProposal: parsed.generatedProposal,
                originalProposal: parsed.originalProposal,
                changes: parsed.changes,
                selectedRationales: nextSelected,
                manualOriginal: '',
              }));
            } else {
              setState(prev => ({
                ...prev,
                selectedRationales: nextSelected,
                manualOriginal: validOriginal ? parsed.originalProposal : '',
              }));
            }
          }
        }
      } catch { }
    }
  }, [topic?.id, state.step]);

  const isLoadingCriticalData = !privyReady || !space || (spaceId && !topics);

  if (isLoadingCriticalData) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-lg w-full space-y-8">
          {/* Header skeleton */}
          <div className="text-center space-y-4">
            <div className="w-12 h-12 bg-muted animate-pulse rounded-full mx-auto" />
            <div className="w-64 h-8 bg-muted animate-pulse rounded mx-auto" />
            <div className="w-48 h-4 bg-muted animate-pulse rounded mx-auto" />
          </div>

          {/* Card skeleton */}
          <div className="border border-muted rounded-lg p-6 space-y-6">
            <div className="space-y-3">
              <div className="w-32 h-6 bg-muted animate-pulse rounded" />
              <div className="w-full h-4 bg-muted animate-pulse rounded" />
              <div className="w-3/4 h-4 bg-muted animate-pulse rounded" />
            </div>

            {/* Recipients field skeleton */}
            <div className="space-y-3">
              <div className="w-6 h-4 bg-muted animate-pulse rounded" />
              <div className="min-h-[50px] border border-muted rounded-md p-3">
                <div className="w-64 h-4 bg-muted animate-pulse rounded" />
              </div>
            </div>

            {/* Available delegates skeleton */}
            <div className="border border-muted rounded-lg">
              <div className="p-3 border-b bg-muted/10">
                <div className="w-40 h-4 bg-muted animate-pulse rounded" />
              </div>
              <div className="space-y-2 p-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex items-center gap-3 p-2">
                    <div className="w-8 h-8 bg-muted animate-pulse rounded-full" />
                    <div className="flex-1 space-y-1">
                      <div className="w-24 h-4 bg-muted animate-pulse rounded" />
                      <div className="w-16 h-3 bg-muted animate-pulse rounded" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Button skeleton */}
            <div className="w-full h-12 bg-muted animate-pulse rounded" />
          </div>

          {/* Loading indicator */}
          <div className="flex items-center justify-center gap-3 text-muted-foreground">
            <Loader className="w-5 h-5" />
            <span>Loading consilience interface...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!topic) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" asChild className="flex items-center gap-2">
            <Link href={`/s/${spaceSlug}`}>
              <ArrowLeft className="w-4 h-4" />
              Back to Space
            </Link>
          </Button>
        </div>
        <Alert>
          <AlertDescription>
            Topic not found or not specified. Please select a topic to generate consilience.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center gap-4 mb-8">
        <Button
          variant="ghost"
          className="flex items-center gap-2"
          onClick={() => {
            if (isNavigatingBack) return;
            setIsNavigatingBack(true);
            router.push(`/s/${spaceSlug}/topic/${encodeId(topic.id)}`);
          }}
          disabled={isNavigatingBack}
        >
          {isNavigatingBack ? (
            <>
              <Loader className="w-4 h-4" />
              Loading…
            </>
          ) : (
            <>
              <ArrowLeft className="w-4 h-4" />
              Back to Topic
            </>
          )}
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Consilience Generator</h1>
          <p className="text-muted-foreground">Topic: {topic.name}</p>
        </div>
      </div>

      {state.step === "select" && (
        <div className="space-y-6">
          {/* Select Delegates Section - First Step */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Select Delegates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 mb-6">
                <p className="text-sm text-muted-foreground">
                  Choose delegates whose perspectives you want to synthesize into a joint proposal. The AI will combine their viewpoints with the original discourse content.
                </p>
                <div className="flex items-center gap-2 text-xs bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                  <div className="w-4 h-4 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs">
                    i
                  </div>
                  <span className="text-blue-700 dark:text-blue-300">
                    Select at least 1 delegate. You can add or remove delegates by clicking them.
                  </span>
                </div>
              </div>

              {/* Selected Delegates */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-foreground">Selected Delegates</h4>
                <div className="flex items-start gap-2">
                  <label className="text-sm font-medium text-muted-foreground w-8 pt-3">To:</label>
                  <div className="flex-1 min-h-[50px] border-2 border-dashed border-border dark:border-border rounded-md p-2 bg-background dark:bg-muted/5 relative">
                    <div className="flex flex-wrap gap-2 min-h-[32px] items-center">
                      {state.selectedRationales.map((userId) => {
                        const delegate = uniqueRationaleAuthors.find(a => a.userId === userId);
                        if (!delegate) return null;
                        return (
                          <button
                            key={userId}
                            onClick={() => {
                              setState(prev => ({
                                ...prev,
                                selectedRationales: prev.selectedRationales.filter(id => id !== userId)
                              }));
                            }}
                            className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-3 py-1.5 rounded-full text-sm shadow-sm transition-all cursor-pointer"
                            title={`Click to remove ${delegate.username}`}
                          >
                            <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center text-xs font-bold">
                              {delegate.username.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-medium">{delegate.username}</span>
                            <div className="ml-1 w-4 h-4 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white font-bold text-xs transition-colors">
                              ×
                            </div>
                          </button>
                        );
                      })}
                      {state.selectedRationales.length === 0 && (
                        <div className="flex items-center gap-2 text-muted-foreground text-sm italic">
                          <Users className="w-4 h-4" />
                          <span>Click delegates below to add them here...</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Available Delegates */}
                {(isAuthorsLoading || uniqueRationaleAuthors.length > 0) && (
                  <div className="border-2 border-border dark:border-border rounded-lg">
                    <div className="p-3 border-b border-border dark:border-border bg-muted/20 dark:bg-muted/10">
                      <h4 className="text-sm font-medium">
                        {isAuthorsLoading ? 'Loading delegates…' : `Available Delegates (${uniqueRationaleAuthors.length} found)`}
                      </h4>
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      {isAuthorsLoading
                        ? (
                          <div className="p-3 space-y-2">
                            {[1, 2, 3, 4, 5, 6].map((i) => (
                              <div key={i} className="flex items-center gap-3 p-2">
                                <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
                                <div className="flex-1 space-y-1">
                                  <div className="w-24 h-4 bg-muted animate-pulse rounded" />
                                  <div className="w-16 h-3 bg-muted animate-pulse rounded" />
                                </div>
                              </div>
                            ))}
                          </div>
                        )
                        : (
                          uniqueRationaleAuthors.map(author => (
                            <button
                              key={author.userId}
                              onClick={() => {
                                const isSelected = state.selectedRationales.includes(author.userId);
                                if (isSelected) {
                                  setState(prev => ({
                                    ...prev,
                                    selectedRationales: prev.selectedRationales.filter(id => id !== author.userId)
                                  }));
                                } else {
                                  setState(prev => ({
                                    ...prev,
                                    selectedRationales: Array.from(new Set([...prev.selectedRationales, author.userId]))
                                  }));
                                }
                              }}
                              className={`w-full flex items-center gap-3 p-3 hover:bg-muted/50 dark:hover:bg-muted/30 text-left border-b border-border/30 dark:border-border/20 last:border-b-0 transition-colors ${state.selectedRationales.includes(author.userId)
                                ? 'bg-primary/10 dark:bg-primary/20 border-primary/20'
                                : ''
                                }`}
                            >
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${state.selectedRationales.includes(author.userId)
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-primary/10 text-primary'
                                }`}>
                                {state.selectedRationales.includes(author.userId) ? '✓' : author.username.charAt(0).toUpperCase()}
                              </div>
                              <div className="flex-1">
                                <div className="font-medium text-sm">{author.username}</div>
                                {/* Hide counts for leaner list */}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {state.selectedRationales.includes(author.userId) ? 'Click to remove' : 'Click to select'}
                              </div>
                            </button>
                          ))
                        )}
                    </div>
                  </div>
                )}
              </div>

              {/* Proposal Content moved to its own card below */}
            </CardContent>
          </Card>

          {/* Discourse Load Card (loading/error/success + manual override) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Proposal Content
              </CardTitle>
            </CardHeader>
            <CardContent>
              {state.discourseLoading && (
                <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Loader className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="text-sm font-medium text-blue-900 dark:text-blue-100">Preparing inputs…</p>
                      <p className="text-xs text-blue-700 dark:text-blue-300">
                        {state.discourseAutoRetrying
                          ? `Fetching original discourse post (retry ${state.discourseRetryCount} of ${MAX_DISCOURSE_RETRIES})`
                          : 'Fetching original discourse post'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {state.discourseAutoRetrying && (
                      <Badge variant="outline" className="text-[10px]">Auto-retrying</Badge>
                    )}
                    <Button size="sm" variant="outline" onClick={handleCancelFetch}>Cancel</Button>
                  </div>
                </div>
              )}

              {state.discourseError && !state.discourseLoading && (
                <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg">
                  <div className="flex items-start gap-2">
                    <div className="w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center text-xs mt-0.5">!</div>
                    <div>
                      <p className="text-sm font-medium text-red-900 dark:text-red-100 mb-1">Failed to load discourse content</p>
                      <p className="text-xs text-red-700 dark:text-red-300">{state.discourseError}</p>
                      {state.discourseRetryCount > 0 && (
                        <p className="text-xs text-red-700 dark:text-red-300 mt-1">Tried {Math.min(state.discourseRetryCount, MAX_DISCOURSE_RETRIES)} of {MAX_DISCOURSE_RETRIES}</p>
                      )}
                      <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                        This can fail due to forum rate limits, network issues, missing permissions, or the post being unavailable. If it keeps failing, paste the original proposal below.
                      </p>
                      <div className="mt-3">
                        <Button size="sm" variant="outline" onClick={() => fetchOriginal(true)}>
                          Retry fetch
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {state.discourseSuccess && state.originalProposal && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
                    <div className="w-4 h-4 rounded-full bg-green-500 text-white flex items-center justify-center text-xs">✓</div>
                    <span className="text-sm font-medium text-green-900 dark:text-green-100">
                      Successfully loaded original proposal ({state.originalProposal.length} characters)
                    </span>
                  </div>
                  <div className="max-h-48 overflow-y-auto bg-muted/20 rounded-lg p-3 border">
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{state.originalProposal}</p>
                  </div>
                </div>
              )}

              {/* Manual Override Section */}
              <div className="mt-6 pt-4 border-t border-border/50">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-foreground">Manual Override</h4>
                    <Badge variant="outline" className="text-xs">
                      {state.discourseError || !topic.discourseUrl ? 'Required' : 'Optional'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {state.discourseSuccess ? 'Override the automatically loaded content if needed:' : 'Paste the complete original proposal text:'}
                  </p>
                  <textarea
                    value={state.manualOriginal}
                    onChange={(e) => setState(prev => ({ ...prev, manualOriginal: e.target.value }))}
                    placeholder={state.discourseSuccess ? "Override: paste different proposal content here..." : "Paste the complete original proposal text here..."}
                    className="w-full min-h-[120px] rounded-md border-2 border-dashed border-border p-3 bg-background dark:bg-muted/5 resize-y text-sm"
                  />
                  {state.manualOriginal.trim() && (
                    <p className="text-xs text-green-600 dark:text-green-400">✓ Manual content will be used ({state.manualOriginal.trim().length} characters)</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Link Card (discourse URL) */}
          {topic.discourseUrl && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Discourse Content
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  This is the original proposal from the discourse link that will be modified.
                </p>
                <div className="bg-muted/20 p-4 rounded-lg">
                  <p className="text-sm">
                    <a href={topic.discourseUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      {topic.discourseUrl}
                    </a>
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Generate Button */}
          <div className="mt-8 pt-6 border-t border-border/50">
            <Button
              onClick={handleGenerateConsilience}
              disabled={
                state.selectedRationales.length === 0 ||
                state.discourseLoading ||
                (!state.discourseSuccess && !state.manualOriginal.trim())
              }
              size="lg"
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500"
            >
              <Users className="w-5 h-5 mr-2" />
              {state.discourseLoading
                ? 'Loading proposal content...'
                : state.selectedRationales.length === 0
                  ? 'Select delegates to continue'
                  : (!state.discourseSuccess && !state.manualOriginal.trim())
                    ? 'Provide proposal content above'
                    : `Generate Proposal with ${state.selectedRationales.length} delegate${state.selectedRationales.length !== 1 ? 's' : ''}`}
            </Button>
          </div>

        </div>
      )}

      {state.step === "generating" && (
        <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-8">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <FileText className="w-6 h-6 text-primary/60" />
            </div>
          </div>

          <div className="text-center space-y-4 max-w-lg">
            <h2 className="text-2xl font-semibold">Generating proposal…</h2>
            <div className="space-y-2 text-muted-foreground">
              <p>Combining the selected delegates&apos; perspectives into a single proposal.</p>
              <p>Highlighting endorsement differences where points are the same.</p>
              <p>This step runs the AI and may take a moment.</p>
            </div>
            <div className="flex flex-wrap justify-center gap-2 pt-2">
              {uniqueRationaleAuthors
                .filter(a => state.selectedRationales.includes(a.userId))
                .map(author => (
                  <Badge key={author.userId} variant="outline" className="text-sm">
                    {author.username}
                  </Badge>
                ))}
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 pt-4">
            <div className="flex gap-1">
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  className="w-2 h-2 bg-primary/60 rounded-full animate-pulse"
                  style={{ animationDelay: `${i * 0.2}s` }}
                />
              ))}
            </div>
            <span className="text-sm text-muted-foreground ml-2">This may take a moment</span>
          </div>
        </div>
      )}

      {state.step === "results" && state.changes && (
        <ConsilienceResults
          originalProposal={state.originalProposal}
          generatedProposal={state.generatedProposal}
          changes={state.changes}
          topicName={state.topicName}
          topicId={state.topicId}
          selectedAuthors={uniqueRationaleAuthors.map(a => ({
            userId: a.userId,
            username: a.username,
            rationales: a.rationales.map(r => ({ id: r.id, title: r.title, hasEndorsements: Boolean(r.hasEndorsements) })),
          })).filter(a =>
            state.selectedRationales.includes(a.userId)
          )}
          onStartOver={() => {
            try { localStorage.removeItem('consilience:last'); } catch { }
            setState(prev => ({ ...prev, step: "select" }));
          }}
        />
      )}
    </div>
  );
}