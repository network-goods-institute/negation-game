"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Download,
  Copy,
  Edit,
  Save,
  X,
  FileText,
  Users,
  TrendingUp,
  Info
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { TopicJointProposalResult } from "@/actions/proposals/generateTopicJointProposal";

interface TopicProposalResultProps {
  isOpen: boolean;
  onClose: () => void;
  result: TopicJointProposalResult;
  generatedText: string;
}

export function TopicProposalResult({
  isOpen,
  onClose,
  result,
  generatedText,
}: TopicProposalResultProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedProposal, setEditedProposal] = useState(generatedText);
  const [copySuccess, setCopySuccess] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(isEditing ? editedProposal : generatedText);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleSave = () => {
    setIsEditing(false);
    // I'll implement this later
  };

  const handleExport = (format: 'markdown' | 'plain' | 'discourse') => {
    const text = isEditing ? editedProposal : generatedText;
    let content = text;
    let filename = `joint-proposal-${result.metadata.topicName.toLowerCase().replace(/\s+/g, '-')}`;

    switch (format) {
      case 'markdown':
        content = `# Joint Proposal: ${result.metadata.topicName}\n\n${text}\n\n---\n\n*Generated from ${result.metadata.contributingRationales.length} rationales by: ${result.metadata.contributingRationales.map(r => r.author).join(', ')}*`;
        filename += '.md';
        break;
      case 'discourse':
        content = `**Joint Proposal: ${result.metadata.topicName}**\n\n${text}\n\n---\n\n*Generated from ${result.metadata.contributingRationales.length} rationales by: ${result.metadata.contributingRationales.map(r => r.author).join(', ')}*`;
        filename += '.txt';
        break;
      default:
        filename += '.txt';
    }

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const alignmentPercentage = Math.round(result.alignment.overallAlignment * 100);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Joint Proposal: {result.metadata.topicName}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex gap-6 min-h-0">
          {/* Main Content */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Proposal Text */}
            <ScrollArea className="flex-1 mb-4">
              {isEditing ? (
                <Textarea
                  value={editedProposal}
                  onChange={(e) => setEditedProposal(e.target.value)}
                  className="min-h-[400px] resize-none text-sm font-mono"
                  placeholder="Edit your proposal..."
                />
              ) : (
                <div className="prose prose-sm max-w-none whitespace-pre-wrap p-4 border rounded-lg bg-muted/20">
                  {generatedText}
                </div>
              )}
            </ScrollArea>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(!isEditing)}
                >
                  {isEditing ? (
                    <>
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </>
                  ) : (
                    <>
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </>
                  )}
                </Button>
                {isEditing && (
                  <Button size="sm" onClick={handleSave}>
                    <Save className="w-4 h-4 mr-2" />
                    Save
                  </Button>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                  className={cn(copySuccess && "bg-green-50 border-green-200")}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  {copySuccess ? "Copied!" : "Copy"}
                </Button>

                <div className="relative group">
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                  <div className="absolute right-0 top-full mt-1 bg-background border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                    <div className="p-1">
                      <button
                        onClick={() => handleExport('plain')}
                        className="block w-full text-left px-3 py-2 text-sm hover:bg-accent rounded"
                      >
                        Plain Text
                      </button>
                      <button
                        onClick={() => handleExport('markdown')}
                        className="block w-full text-left px-3 py-2 text-sm hover:bg-accent rounded"
                      >
                        Markdown
                      </button>
                      <button
                        onClick={() => handleExport('discourse')}
                        className="block w-full text-left px-3 py-2 text-sm hover:bg-accent rounded"
                      >
                        Discourse Format
                      </button>
                    </div>
                  </div>
                </div>

                <Button onClick={onClose}>
                  Close
                </Button>
              </div>
            </div>
          </div>

          {/* Sidebar with metadata */}
          <div className="w-80 flex flex-col gap-4">
            {/* Alignment Info */}
            <div className="border rounded-lg p-4 bg-muted/20">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4" />
                <h3 className="font-medium">Alignment Analysis</h3>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Overall Alignment:</span>
                  <span className="font-medium">{alignmentPercentage}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Shared Points:</span>
                  <span>{result.alignment.sharedEndorsements.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Conflicting Points:</span>
                  <span>{result.alignment.conflictingPoints.length}</span>
                </div>
              </div>
            </div>

            {/* Contributing Rationales */}
            <div className="border rounded-lg p-4 bg-muted/20">
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-4 h-4" />
                <h3 className="font-medium">Contributing Rationales</h3>
              </div>
              <div className="space-y-2">
                {result.metadata.contributingRationales.map((rationale) => (
                  <div key={rationale.id} className="flex flex-col gap-1">
                    <div className="font-medium text-sm">{rationale.author}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {rationale.title}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Shared Endorsements */}
            {result.alignment.sharedEndorsements.length > 0 && (
              <div className="border rounded-lg p-4 bg-muted/20">
                <h3 className="font-medium mb-3">Shared Endorsed Points</h3>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {result.alignment.sharedEndorsements.map((point) => (
                    <div key={point.pointId} className="text-xs p-2 bg-green-50 dark:bg-green-950/30 rounded border">
                      {point.content}
                      <div className="text-green-600 dark:text-green-400 mt-1">
                        {point.cred} cred
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Conflicting Points */}
            {result.alignment.conflictingPoints.length > 0 && (
              <div className="border rounded-lg p-4 bg-muted/20">
                <h3 className="font-medium mb-3">Conflicting Points</h3>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {result.alignment.conflictingPoints.slice(0, 3).map((point) => (
                    <div key={point.pointId} className="text-xs p-2 bg-orange-50 dark:bg-orange-950/30 rounded border">
                      <div className="mb-1">{point.content}</div>
                      <div className="text-orange-600 dark:text-orange-400">
                        {point.delegatePositions.map(p => `${p.username}: ${p.cred || 0}`).join(", ")}
                      </div>
                    </div>
                  ))}
                  {result.alignment.conflictingPoints.length > 3 && (
                    <div className="text-xs text-muted-foreground">
                      +{result.alignment.conflictingPoints.length - 3} more conflicts
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Info */}
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs">
                This proposal synthesizes perspectives from {result.metadata.contributingRationales.length} rationales.
                You can edit, copy, or export it for use in forums, documents, or other platforms.
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}