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
        {assignments.map((assignment) => (
          <div
            key={assignment.id}
            className="p-4 border rounded-lg space-y-3 hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="font-medium">{assignment.topicName}</div>
              <Badge variant={assignment.completed ? "default" : "secondary"}>
                {assignment.completed ? "Completed" : "Pending"}
              </Badge>
            </div>

            {assignment.promptMessage && (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                <div className="text-sm text-blue-800">
                  <strong>Message:</strong> {assignment.promptMessage}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
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
                      >
                        {loadingAssignmentId === assignment.id ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                            Loading...
                          </>
                        ) : (
                          <>
                            <ArrowRight className="h-4 w-4 mr-1" />
                            Write Rationale
                          </>
                        )}
                      </Button>
                    </Link>
                    <Button
                      size="sm"
                      onClick={() => completeMutation.mutate(assignment.id)}
                      disabled={completeMutation.isPending}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Mark Complete
                    </Button>
                  </>
                ) : (
                  <div className="text-sm text-green-600 font-medium">
                    ✓ Completed
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}