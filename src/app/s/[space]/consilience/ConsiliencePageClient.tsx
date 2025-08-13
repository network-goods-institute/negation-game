"use client";

import React, { useState, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { decodeId } from "@/lib/negation-game/decodeId";
import { encodeId } from "@/lib/negation-game/encodeId";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  requiresManualOriginal: boolean;
  notice?: string;
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
    requiresManualOriginal: false,
    changes: null,
  });

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
    const loadOriginal = async () => {
      if (!topic?.discourseUrl) return;
      try {
        const res = await fetch(`/api/discourse/content?url=${encodeURIComponent(topic.discourseUrl)}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data?.content) {
          setState(prev => ({ ...prev, originalProposal: data.content }));
        }
      } catch { }
    };
    loadOriginal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topic?.discourseUrl]);

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
    setState((prev) => ({ ...prev, step: "generating", requiresManualOriginal: false }));
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
        try {
          const obj = JSON.parse(text);
          if (obj?.code === "manual_original_required") {
            setState((prev) => ({
              ...prev,
              step: "select",
              requiresManualOriginal: true,
              notice:
                obj?.message ||
                "We could not fetch the original discourse post. Paste the original proposal text below and click Generate again.",
            }));
            return;
          }
        } catch { }
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
        requiresManualOriginal: true,
        notice:
          "We could not fetch the original discourse post. Paste the original proposal text below and click Generate again.",
      }));
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
      <Dialog open={state.requiresManualOriginal} onOpenChange={(open) => {
        if (!open) setState(prev => ({ ...prev, requiresManualOriginal: false, notice: undefined }));
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Original Proposal Required</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{state.notice || 'We could not fetch the original discourse post due to forum rate limits.'}</p>
            <textarea
              value={state.manualOriginal}
              onChange={(e) => setState(prev => ({ ...prev, manualOriginal: e.target.value }))}
              placeholder="Paste the full original proposal text here to continue."
              className="w-full min-h-[160px] rounded-md border p-2 bg-background"
            />
            <div className="flex justify-end">
              <Button onClick={handleGenerateConsilience} disabled={!state.manualOriginal.trim()}>
                Continue
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" asChild className="flex items-center gap-2">
          <Link href={`/s/${spaceSlug}/topic/${encodeId(topic.id)}`}>
            <ArrowLeft className="w-4 h-4" />
            Back to Topic
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Consilience Generator</h1>
          <p className="text-muted-foreground">Topic: {topic.name}</p>
        </div>
      </div>

      {state.step === "select" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Select Delegates
              </CardTitle>
            </CardHeader>
            <CardContent>
              {state.requiresManualOriginal && (
                <Alert className="mb-4">
                  <AlertDescription>
                    {state.notice || 'We could not fetch the original discourse post due to forum rate limits. Paste the original proposal text below and click Generate again.'}
                  </AlertDescription>
                </Alert>
              )}
              <p className="text-sm text-muted-foreground mb-4">
                Choose delegates to generate consilience between their perspectives. Select at least one, up to as many as you want.
              </p>

              {/* Email-style Recipients Field */}
              <div className="space-y-4">
                <div className="flex items-start gap-2">
                  <label className="text-sm font-medium text-muted-foreground w-8 pt-3">To:</label>
                  <div className="flex-1 min-h-[50px] border rounded-md p-2 bg-background">
                    <div className="flex flex-wrap gap-2 min-h-[32px] items-center">
                      {state.selectedRationales.map((userId) => {
                        const delegate = uniqueRationaleAuthors.find(a => a.userId === userId);
                        if (!delegate) return null;
                        return (
                          <div key={userId} className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-3 py-1.5 rounded-full text-sm shadow-sm">
                            <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center text-xs font-bold">
                              {delegate.username.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-medium">{delegate.username}</span>
                            <button
                              onClick={() => {
                                setState(prev => ({
                                  ...prev,
                                  selectedRationales: prev.selectedRationales.filter(id => id !== userId)
                                }));
                              }}
                              className="ml-1 w-4 h-4 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white font-bold text-xs transition-colors"
                            >
                              ×
                            </button>
                          </div>
                        );
                      })}
                      {state.selectedRationales.length === 0 && (
                        <span className="text-muted-foreground text-sm italic">Select delegates to generate consilience...</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Available Delegates */}
                {uniqueRationaleAuthors.length > 0 && (
                  <div className="border rounded-lg">
                    <div className="p-3 border-b bg-muted/20">
                      <h4 className="text-sm font-medium">Available Delegates ({uniqueRationaleAuthors.length} found)</h4>
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      {isAuthorsLoading && (
                        <div className="p-3 text-sm text-muted-foreground">Loading collaborators…</div>
                      )}
                      {uniqueRationaleAuthors.map(author => (
                        <button
                          key={author.userId}
                          onClick={() => {
                            if (state.selectedRationales.includes(author.userId)) return;
                            setState(prev => ({
                              ...prev,
                              selectedRationales: Array.from(new Set([...prev.selectedRationales, author.userId]))
                            }));
                          }}
                          disabled={state.selectedRationales.includes(author.userId)}
                          className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 disabled:opacity-50 disabled:cursor-not-allowed text-left"
                        >
                          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-sm font-medium text-primary">
                            {author.username.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-sm">{author.username}</div>
                            <div className="text-xs text-muted-foreground">
                              {author.rationales.length} rationale{author.rationales.length !== 1 ? 's' : ''}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Manual Original Proposal Fallback */}
                <div className="space-y-2 mt-4">
                  <label className="text-sm font-medium text-muted-foreground">Original Proposal {state.requiresManualOriginal ? '(required now)' : '(optional manual paste)'} </label>
                  <textarea
                    value={state.manualOriginal}
                    onChange={(e) => setState(prev => ({ ...prev, manualOriginal: e.target.value }))}
                    placeholder="If the discourse content cannot be fetched, paste the full original proposal text here."
                    className="w-full min-h-[120px] rounded-md border p-2 bg-background"
                  />
                  <p className="text-xs text-muted-foreground">If provided, this will be used as the original proposal for diffs when the discourse URL is rate-limited or unavailable.</p>
                </div>
              </div>

              <Button
                onClick={handleGenerateConsilience}
                disabled={state.selectedRationales.length === 0}
                className="w-full mt-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                Generate Consilience ({state.selectedRationales.length} delegate{state.selectedRationales.length !== 1 ? 's' : ''})
              </Button>
            </CardContent>
          </Card>

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
            <h2 className="text-2xl font-semibold">Preparing Inputs…</h2>
            <div className="space-y-2 text-muted-foreground">
              <p>Fetching the original discourse post (first post only). This may be rate-limited by the forum.</p>
              <p>If it stalls, paste the original proposal text on the previous screen and click Generate again.</p>
              <p>Then we will generate the merged proposal and diffs.</p>
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