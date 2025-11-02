"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Check,
  X,
  RefreshCw,
  Send,
  Wand2,
  Eye,
  GitCompare
} from "lucide-react";
import { ConsilienceEditor } from "./ConsilienceEditor";
import { DiffView } from "@/components/ui/DiffView";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";import { logger } from "@/lib/logger";

interface Diff {
  type: "addition" | "modification" | "removal";
  originalText?: string;
  newText?: string;
  explanation: string;
  decision: "approved" | "rejected" | "pending";
}

interface Changes {
  summary: string;
  reasoning: string;
  diffs: Diff[];
}

interface ConsilienceResultsProps {
  originalProposal: string;
  generatedProposal: string;
  changes: Changes;
  topicName: string;
  topicId?: number;
  selectedAuthors: Array<{
    userId: string;
    username: string;
    rationales: Array<{ id: string; title: string; hasEndorsements: boolean }>;
  }>;
  onStartOver: () => void;
}

export function ConsilienceResults({
  originalProposal,
  generatedProposal,
  changes,
  topicName,
  topicId,
  selectedAuthors,
  onStartOver,
}: ConsilienceResultsProps) {
  const [activeTab, setActiveTab] = useState("diff");
  const [chatMessage, setChatMessage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [localChanges, setLocalChanges] = useState(changes);
  const [currentProposal, setCurrentProposal] = useState(generatedProposal);
  const [decisionsRevision, setDecisionsRevision] = useState(0);
  const [lastApplyRevision, setLastApplyRevision] = useState(0);
  const [isExportConfirmOpen, setIsExportConfirmOpen] = useState(false);

  const typeLabel = (t: Diff["type"]) => t.charAt(0).toUpperCase() + t.slice(1);

  const handleApproveDiff = (index: number) => {
    setLocalChanges(prev => ({
      ...prev,
      diffs: prev.diffs.map((diff, i) =>
        i === index ? { ...diff, decision: diff.decision === "approved" ? "pending" : "approved" } : diff
      )
    }));
    setDecisionsRevision(r => r + 1);
  };

  const handleRejectDiff = (index: number) => {
    setLocalChanges(prev => ({
      ...prev,
      diffs: prev.diffs.map((diff, i) =>
        i === index ? { ...diff, decision: diff.decision === "rejected" ? "pending" : "rejected" } : diff
      )
    }));
    setDecisionsRevision(r => r + 1);
  };

  const handleChatSubmit = async () => {
    if (!chatMessage.trim()) return;

    setIsProcessing(true);
    try {
      const res = await fetch('/api/ai/improve-proposal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentText: currentProposal,
          instruction: chatMessage,
          originalText: originalProposal,
          topicId: topicId ?? null,
          selectedUserIds: selectedAuthors.map(a => a.userId),
        }),
      });
      if (!res.ok) throw new Error('Failed to refine proposal');
      const data = await res.json() as import("@/types/consilience").ConsilienceAIResponse;

      const normalizedDiffs = Array.isArray(data.diffs)
        ? data.diffs.map((d) => ({
          type:
            d.type === "Removal"
              ? "removal"
              : d.type === "Modification"
                ? "modification"
                : "addition",
          originalText: d.originalText || "",
          newText: d.newText || "",
          explanation: d.explanation || "",
          decision: "pending" as const,
        }))
        : [];

      setLocalChanges(prev => ({
        summary: data.summary || prev.summary,
        reasoning: data.reasoning || prev.reasoning,
        diffs: [...prev.diffs, ...normalizedDiffs] as typeof prev.diffs,
      }));
      setCurrentProposal(data.proposal || currentProposal);
      setChatMessage('');
    } catch (error) {
      logger.error("Error processing chat message:", error);
    }
    setIsProcessing(false);
  };

  const approvedDiffs = localChanges.diffs.filter(d => d.decision === "approved");
  const rejectedDiffs = localChanges.diffs.filter(d => d.decision === "rejected");
  const pendingDiffs = localChanges.diffs.filter(d => d.decision === "pending");

  const computeAppliedText = () => {
    let next = originalProposal || "";
    for (const d of approvedDiffs) {
      if (d.type === "modification") {
        if (d.originalText && typeof d.newText === "string") {
          next = next.replace(d.originalText, d.newText);
        }
      } else if (d.type === "removal") {
        if (d.originalText) {
          next = next.replace(d.originalText, "");
        }
      } else if (d.type === "addition") {
        if (typeof d.newText === "string" && d.newText.trim().length > 0) {
          next = next + (next.endsWith("\n") ? "" : "\n\n") + d.newText;
        }
      }
    }
    return next;
  };

  const applyApprovedDiffs = () => {
    const next = computeAppliedText();
    setCurrentProposal(next);
    setLastApplyRevision(decisionsRevision);
  };

  const approveAll = () => {
    setLocalChanges(prev => ({
      ...prev,
      diffs: prev.diffs.map(d => ({ ...d, decision: "approved" })),
    }));
    setDecisionsRevision(r => r + 1);
  };

  const rejectAll = () => {
    setLocalChanges(prev => ({
      ...prev,
      diffs: prev.diffs.map(d => ({ ...d, decision: "rejected" })),
    }));
    setDecisionsRevision(r => r + 1);
  };

  const resetToOriginal = () => {
    setCurrentProposal(originalProposal || "");
    setLocalChanges(prev => ({
      ...prev,
      diffs: prev.diffs.map(d => ({ ...d, decision: "pending" as const })),
    }));
    setDecisionsRevision(r => r + 1);
  };

  const needsApplyBeforeExport = pendingDiffs.length > 0;

  const exportText = (text?: string) => {
    const content = text ?? currentProposal;
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${topicName.replace(/\s+/g, '-')}-consilience.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 pb-24 sm:pb-0">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <GitCompare className="w-5 h-5" />
              Consilience Results
            </CardTitle>
            <Button variant="destructive" size="lg" onClick={onStartOver}>
              Start Over
            </Button>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Combined perspectives from:</span>
            {selectedAuthors.map((author, index) => (
              <React.Fragment key={author.userId}>
                <Badge variant="secondary">{author.username}</Badge>
                {index < selectedAuthors.length - 1 && <span>and</span>}
              </React.Fragment>
            ))}
          </div>
        </CardHeader>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="diff" className="flex items-center gap-2">
            <GitCompare className="w-4 h-4" />
            Changes ({localChanges.diffs.length})
          </TabsTrigger>
          <TabsTrigger value="preview" className="flex items-center gap-2">
            <Eye className="w-4 h-4" />
            Full Proposal
          </TabsTrigger>

        </TabsList>

        <TabsContent value="diff" className="space-y-6">
          {/* Full Document Diff */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Full Document Diff</CardTitle>
            </CardHeader>
            <CardContent>
              <DiffView original={originalProposal || ''} updated={currentProposal || ''} />
            </CardContent>
          </Card>

          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Summary of Changes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4">{localChanges.summary}</p>
              <div className="text-sm text-muted-foreground">
                <p><strong>Why these changes were made:</strong></p>
                <p>{localChanges.reasoning}</p>
              </div>
            </CardContent>
          </Card>

          {/* Individual Diffs */}
          {localChanges.diffs.length > 0 ? (
            localChanges.diffs.map((diff, index) => {
              const accent = diff.decision === 'approved' ? 'border-l-green-500' : diff.decision === 'rejected' ? 'border-l-red-500' : 'border-l-blue-500';
              return (
                <Card key={index} className={`border-l-4 ${accent}`}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={diff.type === "addition" ? "default" :
                            diff.type === "modification" ? "secondary" : "destructive"}
                        >
                          {typeLabel(diff.type)}
                        </Badge>
                        <span className="text-sm">Change {index + 1}</span>
                        {diff.decision === 'approved' && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">Approved</span>
                        )}
                        {diff.decision === 'rejected' && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">Rejected</span>
                        )}
                        {diff.decision === 'pending' && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">Pending</span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant={diff.decision === 'approved' ? "default" : "outline"}
                          onClick={() => handleApproveDiff(index)}
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant={diff.decision === 'rejected' ? "destructive" : "outline"}
                          onClick={() => handleRejectDiff(index)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <DiffView original={diff.originalText || ""} updated={diff.newText || ""} />

                    <div>
                      <p className="text-sm font-medium mb-2">Explanation:</p>
                      <p className="text-sm text-muted-foreground">{diff.explanation}</p>
                    </div>
                  </CardContent>
                </Card>
              )
            })
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <GitCompare className="w-12 h-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
                <h3 className="font-medium mb-2">No specific changes detected</h3>
                <p className="text-sm text-muted-foreground">
                  The AI created a new proposal but didn&apos;t break down specific changes.
                  You can view the full proposal in the Preview tab or use the Refine tab to request specific modifications.
                </p>
              </CardContent>
            </Card>
          )}

          <div className="z-20 fixed bottom-0 left-0 right-0 border-t bg-background/95 backdrop-blur p-2 sm:static sm:border sm:bg-background/50 sm:rounded-md sm:p-3 mt-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
              <div className="flex items-center gap-2 text-xs sm:text-sm">
                <Badge variant="secondary">{approvedDiffs.length} Approved</Badge>
                <Badge variant="outline">{rejectedDiffs.length} Rejected</Badge>
                <Badge variant="outline">{pendingDiffs.length} Pending</Badge>
              </div>
              <div className="flex items-center gap-2 flex-wrap justify-end">
                <div className="hidden sm:flex gap-1">
                  <Button size="sm" variant="outline" onClick={approveAll}>Approve All</Button>
                  <Button size="sm" variant="outline" onClick={rejectAll}>Reject All</Button>
                  <Button size="sm" variant="outline" onClick={resetToOriginal}>Reset</Button>
                </div>
                <Button className="sm:order-none order-1 flex-1 sm:flex-none" onClick={applyApprovedDiffs} disabled={approvedDiffs.length === 0}>Apply Approved</Button>
                <Button size="sm" variant="ghost" onClick={onStartOver}>Start Over</Button>
                <Button size="sm" onClick={() => {
                  if (needsApplyBeforeExport) {
                    setIsExportConfirmOpen(true);
                  } else {
                    exportText();
                  }
                }}>Export</Button>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="preview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Complete Proposal</CardTitle>
              <p className="text-sm text-muted-foreground">
                View the full proposal with all approved changes applied
              </p>
            </CardHeader>
            <CardContent>
              <ConsilienceEditor value={currentProposal} onChange={setCurrentProposal} />
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wand2 className="w-5 h-5" />
            Refine with AI
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Tell the AI how to further improve the consilience proposal
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={chatMessage}
            onChange={(e) => setChatMessage(e.target.value)}
            placeholder="E.g., 'Make the introduction more balanced between both perspectives' or 'Add more specific implementation details'"
            className="min-h-[100px]"
          />
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={async () => { try { await navigator.clipboard.writeText(currentProposal); } catch { } }}>Copy</Button>
            <Button variant="outline" onClick={() => {
              if (needsApplyBeforeExport) {
                setIsExportConfirmOpen(true);
              } else {
                exportText();
              }
            }}>Export</Button>
            <Button onClick={handleChatSubmit} disabled={!chatMessage.trim() || isProcessing}>
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Instruction
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={isExportConfirmOpen} onOpenChange={setIsExportConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Pending changes not applied</AlertDialogTitle>
            <AlertDialogDescription>
              Some changes are still marked Pending. You can export with only Approved changes applied, or go back to finish decisions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsExportConfirmOpen(false)}>
              Go back
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const next = computeAppliedText();
                setCurrentProposal(next);
                setIsExportConfirmOpen(false);
                exportText(next);
              }}
            >
              Apply approved anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}