"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Topic {
  id: number;
  name: string;
}

interface User {
  id: string;
  username: string;
  isAssigned: boolean;
  hasRationale: boolean;
}

interface Assignment {
  userId: string;
  username: string;
  required: boolean;
  hasRationale: boolean;
}

async function fetchTopics(spaceId: string): Promise<Topic[]> {
  const response = await fetch(`/api/spaces/${spaceId}/topics`);
  if (!response.ok) throw new Error("Failed to fetch topics");
  return response.json();
}

async function fetchTopicAssignments(
  spaceId: string,
  topicId: number
): Promise<Assignment[]> {
  const response = await fetch(
    `/api/spaces/${spaceId}/topics/${topicId}/assignments`
  );
  if (!response.ok) throw new Error("Failed to fetch assignments");
  return response.json();
}

async function fetchSpaceUsers(spaceId: string, topicId: number): Promise<User[]> {
  const response = await fetch(
    `/api/spaces/${spaceId}/users?topicId=${topicId}`
  );
  if (!response.ok) throw new Error("Failed to fetch users");
  return response.json();
}

async function assignUser(
  spaceId: string,
  topicId: number,
  userId: string,
  required: boolean
) {
  const response = await fetch(
    `/api/spaces/${spaceId}/topics/${topicId}/assignments`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, required }),
    }
  );
  if (!response.ok) throw new Error("Failed to assign user");
  return response.json();
}

async function removeAssignment(
  spaceId: string,
  topicId: number,
  userId: string
) {
  const response = await fetch(
    `/api/spaces/${spaceId}/topics/${topicId}/assignments/${userId}`,
    {
      method: "DELETE",
    }
  );
  if (!response.ok) throw new Error("Failed to remove assignment");
  return response.json();
}

export function AssignmentsAdminClient({ spaceId }: { spaceId: string }) {
  const [selectedTopicId, setSelectedTopicId] = useState<number | null>(null);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [assignForm, setAssignForm] = useState({
    userId: "",
    required: false,
  });
  const [assignmentToRemove, setAssignmentToRemove] = useState<{ userId: string; username: string; topicName: string } | null>(null);
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);

  const queryClient = useQueryClient();

  const { data: topics = [], isLoading: topicsLoading } = useQuery({
    queryKey: ["admin-topics", spaceId],
    queryFn: () => fetchTopics(spaceId),
  });

  const { data: assignments = [], isLoading: assignmentsLoading } = useQuery({
    queryKey: ["topic-assignments", spaceId, selectedTopicId],
    queryFn: () => fetchTopicAssignments(spaceId, selectedTopicId!),
    enabled: !!selectedTopicId,
  });

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ["space-users", spaceId, selectedTopicId],
    queryFn: () => fetchSpaceUsers(spaceId, selectedTopicId!),
    enabled: !!selectedTopicId,
  });

  const assignMutation = useMutation({
    mutationFn: ({ userId, required }: { userId: string; required: boolean }) =>
      assignUser(spaceId, selectedTopicId!, userId, required),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["topic-assignments", spaceId, selectedTopicId],
      });
      queryClient.invalidateQueries({
        queryKey: ["space-users", spaceId, selectedTopicId],
      });
      setIsAssignDialogOpen(false);
      setAssignForm({ userId: "", required: false });
      toast.success("User assigned successfully");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const removeMutation = useMutation({
    mutationFn: (userId: string) =>
      removeAssignment(spaceId, selectedTopicId!, userId),
    onMutate: (userId) => {
      setRemovingUserId(userId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["topic-assignments", spaceId, selectedTopicId],
      });
      queryClient.invalidateQueries({
        queryKey: ["space-users", spaceId, selectedTopicId],
      });
      toast.success("Assignment removed successfully");
      setRemovingUserId(null);
    },
    onError: (error) => {
      toast.error(error.message);
      setRemovingUserId(null);
    },
  });

  const handleAssign = () => {
    if (!assignForm.userId) {
      toast.error("Please select a user");
      return;
    }
    assignMutation.mutate(assignForm);
  };

  const handleRemove = (assignment: Assignment) => {
    const topicName = topics.find((t) => t.id === selectedTopicId)?.name || "Unknown Topic";
    setAssignmentToRemove({
      userId: assignment.userId,
      username: assignment.username,
      topicName: topicName
    });
  };

  const confirmRemove = () => {
    if (assignmentToRemove) {
      removeMutation.mutate(assignmentToRemove.userId);
      setAssignmentToRemove(null);
    }
  };

  const availableUsers = users.filter((user) => !user.isAssigned);

  if (topicsLoading) {
    return <div>Loading topics...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">User Assignments</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select Topic</CardTitle>
        </CardHeader>
        <CardContent>
          <Select
            value={selectedTopicId?.toString() || ""}
            onValueChange={(value) => setSelectedTopicId(parseInt(value))}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a topic to manage assignments" />
            </SelectTrigger>
            <SelectContent>
              {topics.map((topic) => (
                <SelectItem key={topic.id} value={topic.id.toString()}>
                  {topic.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedTopicId && (
        <Card>
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              <span>
                Assignments for{" "}
                {topics.find((t) => t.id === selectedTopicId)?.name}
              </span>
              <Dialog
                open={isAssignDialogOpen}
                onOpenChange={setIsAssignDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button disabled={availableUsers.length === 0}>
                    <Plus className="h-4 w-4 mr-2" />
                    Assign User
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Assign User to Topic</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="user">User</Label>
                      <Select
                        value={assignForm.userId}
                        onValueChange={(value) =>
                          setAssignForm({ ...assignForm, userId: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a user" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableUsers.map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.username}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="required"
                        checked={assignForm.required}
                        onCheckedChange={(checked) =>
                          setAssignForm({ ...assignForm, required: checked })
                        }
                      />
                      <Label htmlFor="required">Required assignment</Label>
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        onClick={() => setIsAssignDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleAssign}
                        disabled={assignMutation.isPending}
                      >
                        Assign User
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {assignmentsLoading ? (
              <div>Loading assignments...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Assignment Type</TableHead>
                    <TableHead>Rationale Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignments.map((assignment) => (
                    <TableRow key={assignment.userId}>
                      <TableCell className="font-medium">
                        {assignment.username}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={assignment.required ? "default" : "secondary"}
                        >
                          {assignment.required ? "Required" : "Optional"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {assignment.hasRationale ? (
                            <>
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              <span className="text-green-600">Published</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="h-4 w-4 text-red-600" />
                              <span className="text-red-600">Pending</span>
                            </>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemove(assignment)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {assignments.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        No users assigned to this topic
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Remove Assignment Confirmation Dialog */}
      <AlertDialog open={!!assignmentToRemove} onOpenChange={() => setAssignmentToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Assignment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove the assignment for &quot;{assignmentToRemove?.username}&quot; from topic &quot;{assignmentToRemove?.topicName}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!removingUserId}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRemove}
              disabled={!!removingUserId}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {removingUserId ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Removing...
                </>
              ) : (
                "Remove Assignment"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}