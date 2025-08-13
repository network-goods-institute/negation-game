"use client";

import React, { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  X,
  Search,
  Users,
  FileText,
  Loader,
  Info,
  TrendingUp,
} from "lucide-react";

interface RationaleAuthor {
  userId: string;
  username: string;
  rationaleId: string;
  rationaleTitle: string;
  isCurrentUser: boolean;
}

interface TopicJointProposalDialogProps {
  isOpen: boolean;
  onClose: () => void;
  topicId: number;
  topicName: string;
  availableAuthors: RationaleAuthor[];
  onGenerateProposal: (selectedDelegates: RationaleAuthor[]) => void;
  isGenerating?: boolean;
}

export function TopicJointProposalDialog({
  isOpen,
  onClose,
  topicId,
  topicName,
  availableAuthors,
  onGenerateProposal,
  isGenerating = false,
}: TopicJointProposalDialogProps) {
  const [selectedDelegates, setSelectedDelegates] = useState<RationaleAuthor[]>(() => {
    const currentUser = availableAuthors.find(a => a.isCurrentUser);
    return currentUser ? [currentUser] : [];
  });
  const [searchQuery, setSearchQuery] = useState("");

  const filteredAuthors = useMemo(() => {
    if (!searchQuery.trim()) return availableAuthors;
    const query = searchQuery.toLowerCase();
    return availableAuthors.filter(
      author =>
        author.username.toLowerCase().includes(query) ||
        author.rationaleTitle.toLowerCase().includes(query)
    );
  }, [availableAuthors, searchQuery]);

  const unselectedAuthors = useMemo(() => {
    const selectedIds = new Set(selectedDelegates.map(d => d.userId));
    return filteredAuthors.filter(author => !selectedIds.has(author.userId));
  }, [filteredAuthors, selectedDelegates]);

  const handleAddDelegate = (author: RationaleAuthor) => {
    setSelectedDelegates(prev => [...prev, author]);
  };

  const handleRemoveDelegate = (userId: string) => {
    setSelectedDelegates(prev => prev.filter(d => d.userId !== userId));
  };

  const handleGenerate = () => {
    if (selectedDelegates.length < 1) return;
    onGenerateProposal(selectedDelegates);
  };

  const canGenerate = selectedDelegates.length >= 1 && !isGenerating;
  const alignmentPreview = selectedDelegates.length > 1 ? "Multi-perspective synthesis" : "Single rationale basis";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Generate Joint Proposal for {topicName}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col gap-4 min-h-0">
          {/* Info Alert */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Select delegates who have rationales on this topic. The AI will synthesize their
              endorsed points into a collaborative proposal, regardless of alignment level.
            </AlertDescription>
          </Alert>

          {/* Selected Delegates */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Selected Delegates ({selectedDelegates.length})</h3>
              {selectedDelegates.length > 1 && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <TrendingUp className="w-4 h-4" />
                  {alignmentPreview}
                </div>
              )}
            </div>

            {selectedDelegates.length === 0 ? (
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center text-muted-foreground">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No delegates selected</p>
                <p className="text-sm">Select at least one delegate below to generate a proposal</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {selectedDelegates.map((delegate) => (
                  <div
                    key={delegate.userId}
                    className="flex items-center justify-between p-3 bg-primary/5 border border-primary/20 rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{delegate.username}</span>
                        {delegate.isCurrentUser && (
                          <Badge variant="secondary" className="text-xs">You</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {delegate.rationaleTitle}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveDelegate(delegate.userId)}
                      className="ml-2 h-8 w-8 p-0"
                      disabled={isGenerating}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Search */}
          <div className="space-y-2">
            <h3 className="font-medium">Available Delegates</h3>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search by username or rationale title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                disabled={isGenerating}
              />
            </div>
          </div>

          {/* Available Delegates */}
          <ScrollArea className="flex-1 min-h-0">
            <div className="space-y-2 pr-4">
              {unselectedAuthors.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>
                    {searchQuery.trim()
                      ? "No delegates found matching your search"
                      : "All available delegates have been selected"
                    }
                  </p>
                </div>
              ) : (
                unselectedAuthors.map((author) => (
                  <div
                    key={author.userId}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                    onClick={() => handleAddDelegate(author)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{author.username}</span>
                        {author.isCurrentUser && (
                          <Badge variant="secondary" className="text-xs">You</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {author.rationaleTitle}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isGenerating}
                      className="ml-2"
                    >
                      Add
                    </Button>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              {selectedDelegates.length === 0 && "Select at least 1 delegate"}
              {selectedDelegates.length === 1 && "Ready to generate single-perspective proposal"}
              {selectedDelegates.length > 1 && `Ready to synthesize ${selectedDelegates.length} perspectives`}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} disabled={isGenerating}>
                Cancel
              </Button>
              <Button
                onClick={handleGenerate}
                disabled={!canGenerate}
                className="min-w-[120px]"
              >
                {isGenerating ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4 mr-2" />
                    Generate Proposal
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}