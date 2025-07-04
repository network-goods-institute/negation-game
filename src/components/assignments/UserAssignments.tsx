"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, MessageSquare, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { encodeId } from "@/lib/negation-game/encodeId";
import { CollapsibleCardDeck, CardDeckControls } from "@/components/ui/collapsible-card-deck";
import { groupAssignmentsBySpace, groupAssignmentsByTopic } from "@/utils/notificationGrouping";

interface UserAssignment {
  id: string;
  topicId: number;
  topicName: string;
  spaceId: string;
  promptMessage: string | null;
  completed: boolean;
  createdAt: string;
}

async function fetchUserAssignments(): Promise<UserAssignment[]> {
  const response = await fetch("/api/user/assignments");
  if (!response.ok) throw new Error("Failed to fetch assignments");
  return response.json();
}

async function completeAssignment(assignmentId: string) {
  const response = await fetch(`/api/assignments/${assignmentId}/complete`, {
    method: "POST",
  });
  if (!response.ok) throw new Error("Failed to complete assignment");
  return response.json();
}

export function UserAssignments() {
  const [loadingAssignmentId, setLoadingAssignmentId] = useState<string | null>(null);
  const [groupingMode, setGroupingMode] = useState<'space' | 'topic' | 'status'>('space');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();

  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ["user-assignments"],
    queryFn: fetchUserAssignments,
  });

  const completeMutation = useMutation({
    mutationFn: completeAssignment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-assignments"] });
      toast.success("Assignment marked as completed!");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const getAssignmentGroups = () => {
    switch (groupingMode) {
      case 'space':
        return groupAssignmentsBySpace(assignments);
      case 'topic':
        return groupAssignmentsByTopic(assignments);
      case 'status':
      default:
        const pendingAssignments = assignments.filter(a => !a.completed);
        const completedAssignments = assignments.filter(a => a.completed);
        
        return [
          ...(pendingAssignments.length > 0 ? [{
            id: 'pending',
            title: 'Pending',
            description: 'Assignments you need to complete',
            count: pendingAssignments.length,
            spaceId: '',
            items: pendingAssignments,
            priority: 1,
          }] : []),
          ...(completedAssignments.length > 0 ? [{
            id: 'completed',
            title: 'Completed',
            description: 'Assignments you have finished',
            count: completedAssignments.length,
            spaceId: '',
            items: completedAssignments,
            priority: 2,
          }] : []),
        ];
    }
  };

  const assignmentGroups = getAssignmentGroups();
  
  const handleExpandAll = () => {
    setExpandedGroups(new Set(assignmentGroups.map(g => g.id)));
  };

  const handleCollapseAll = () => {
    setExpandedGroups(new Set());
  };

  const handleGroupingChange = (grouping: string) => {
    setGroupingMode(grouping as 'space' | 'topic' | 'status');
  };

  const groupingOptions = [
    { value: 'space', label: 'By Space' },
    { value: 'topic', label: 'By Topic' },
    { value: 'status', label: 'By Status' },
  ];

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            Loading assignments...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (assignments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MessageSquare className="h-5 w-5" />
            <span>Your Assignments</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-4">
            No assignments yet. Check back later!
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <MessageSquare className="h-5 w-5" />
          <span>Your Assignments ({assignments.length})</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <CardDeckControls
          groups={assignmentGroups}
          expandedGroups={expandedGroups}
          onExpandAll={handleExpandAll}
          onCollapseAll={handleCollapseAll}
          onGroupingChange={handleGroupingChange}
          currentGrouping={groupingMode}
          groupingOptions={groupingOptions}
        />
        
        <CollapsibleCardDeck
          groups={assignmentGroups}
          renderItem={(assignment) => (
            <AssignmentItem 
              assignment={assignment}
              onComplete={() => completeMutation.mutate(assignment.id)}
              isCompleting={completeMutation.isPending}
              loadingAssignmentId={loadingAssignmentId}
              setLoadingAssignmentId={setLoadingAssignmentId}
            />
          )}
          emptyMessage="No assignments to display"
          showGroupStats={false}
          expandedGroups={expandedGroups}
          onExpandedChange={setExpandedGroups}
        />
      </CardContent>
    </Card>
  );
}

interface AssignmentItemProps {
  assignment: UserAssignment;
  onComplete: () => void;
  isCompleting: boolean;
  loadingAssignmentId: string | null;
  setLoadingAssignmentId: (id: string | null) => void;
}

const AssignmentItem = ({ 
  assignment, 
  onComplete, 
  isCompleting, 
  loadingAssignmentId, 
  setLoadingAssignmentId 
}: AssignmentItemProps) => {
  return (
    <div className="p-3 border rounded-lg space-y-3 hover:bg-muted/50 transition-colors">
      <div className="flex items-center justify-between">
        <div className="font-medium text-sm">{assignment.topicName}</div>
        <Badge variant={assignment.completed ? "default" : "secondary"} className="text-xs">
          {assignment.completed ? "Completed" : "Pending"}
        </Badge>
      </div>

      {assignment.promptMessage && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-2">
          <div className="text-xs text-blue-800">
            <strong>Message:</strong> {assignment.promptMessage}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          Space: {assignment.spaceId} • Assigned: {new Date(assignment.createdAt).toLocaleDateString()}
        </div>

        <div className="flex items-center space-x-2">
          {!assignment.completed ? (
            <>
              <Link href={`/s/${assignment.spaceId}/rationale/new?topicId=${encodeId(assignment.topicId)}`}>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => setLoadingAssignmentId(assignment.id)}
                  disabled={loadingAssignmentId === assignment.id}
                  className="h-7 text-xs"
                >
                  {loadingAssignmentId === assignment.id ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <ArrowRight className="h-3 w-3 mr-1" />
                      Write Rationale
                    </>
                  )}
                </Button>
              </Link>
              <Button
                size="sm"
                onClick={onComplete}
                disabled={isCompleting}
                className="h-7 text-xs"
              >
                <CheckCircle className="h-3 w-3 mr-1" />
                Mark Complete
              </Button>
            </>
          ) : (
            <div className="text-xs text-green-600 font-medium">
              ✓ Completed
            </div>
          )}
        </div>
      </div>
    </div>
  );
};