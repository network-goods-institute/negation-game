"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, UserPlus, MessageSquare, Loader2, Trash2 } from "lucide-react";
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
import { toast } from "sonner";
import { Topic, User, Assignment, AssignmentFormData } from "@/types/admin";
import { createAssignment, removeAssignment } from "@/services/admin/assignmentService";

interface AssignmentsPanelProps {
    spaceId: string;
    topics: Topic[];
    allUsers: User[];
    assignments: Assignment[];
    isLoadingUsers: boolean;
    isLoadingAssignments: boolean;
}

export function AssignmentsPanel({
    spaceId,
    topics,
    allUsers,
    assignments,
    isLoadingUsers,
    isLoadingAssignments,
}: AssignmentsPanelProps) {
    const [assignmentForm, setAssignmentForm] = useState<AssignmentFormData>({
        topicId: "",
        userId: "",
        promptMessage: "",
    });
    const [assignmentUserSearch, setAssignmentUserSearch] = useState("");
    const [assignmentToDelete, setAssignmentToDelete] = useState<{
        topicId: number;
        userId: string;
        topicName: string;
        username: string;
    } | null>(null);
    const [removingAssignmentId, setRemovingAssignmentId] = useState<string | null>(null);

    const queryClient = useQueryClient();

    const createAssignmentMutation = useMutation({
        mutationFn: (data: { topicId: number; targetUserId: string; promptMessage?: string }) =>
            createAssignment(data, spaceId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["assignments", spaceId] });
            setAssignmentForm({ topicId: "", userId: "", promptMessage: "" });
            toast.success("Assignment created successfully");
        },
        onError: (error) => {
            toast.error(error.message);
        },
    });

    const removeAssignmentMutation = useMutation({
        mutationFn: ({ topicId, userId }: { topicId: number; userId: string }) =>
            removeAssignment(topicId, userId, spaceId),
        onMutate: ({ topicId, userId }) => {
            setRemovingAssignmentId(`${topicId}-${userId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["assignments", spaceId] });
            queryClient.invalidateQueries({ queryKey: ["rationale-status", spaceId] });
            toast.success("Assignment removed successfully");
            setRemovingAssignmentId(null);
        },
        onError: (error) => {
            toast.error(error.message);
            setRemovingAssignmentId(null);
        },
    });

    const handleAssignmentSubmit = () => {
        if (!assignmentForm.topicId || !assignmentForm.userId) {
            toast.error("Please select both a topic and a user");
            return;
        }

        createAssignmentMutation.mutate({
            topicId: parseInt(assignmentForm.topicId),
            targetUserId: assignmentForm.userId,
            promptMessage: assignmentForm.promptMessage || undefined,
        });
    };

    const handleRemoveAssignment = (assignment: Assignment) => {
        setAssignmentToDelete({
            topicId: assignment.topicId,
            userId: assignment.userId,
            topicName: assignment.topicName,
            username: allUsers.find(u => u.id === assignment.userId)?.username || assignment.userId
        });
    };

    const confirmRemoveAssignment = () => {
        if (assignmentToDelete) {
            removeAssignmentMutation.mutate({
                topicId: assignmentToDelete.topicId,
                userId: assignmentToDelete.userId
            });
            setAssignmentToDelete(null);
        }
    };

    return (
        <>
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                            <UserPlus className="h-5 w-5" />
                            <span>Assign Rationales</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label htmlFor="assignmentTopic">Topic</Label>
                            <Select
                                value={assignmentForm.topicId}
                                onValueChange={(value) => setAssignmentForm({ ...assignmentForm, topicId: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a topic" />
                                </SelectTrigger>
                                <SelectContent>
                                    {topics.map((topic) => (
                                        <SelectItem key={topic.id} value={topic.id.toString()}>
                                            {topic.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label htmlFor="assignmentUser">User</Label>
                            <div className="space-y-2">
                                <div className="relative">
                                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search users..."
                                        value={assignmentUserSearch}
                                        onChange={(e) => setAssignmentUserSearch(e.target.value)}
                                        className="pl-10"
                                    />
                                </div>
                                <div className="h-24 border rounded-lg overflow-hidden">
                                    <div className="h-full overflow-y-auto p-2 space-y-1">
                                        {isLoadingUsers ? (
                                            <div className="flex items-center justify-center h-full">
                                                <div className="flex flex-col items-center space-y-1">
                                                    <Loader2 className="h-3 w-3 animate-spin" />
                                                    <span className="text-xs text-muted-foreground">Loading...</span>
                                                </div>
                                            </div>
                                        ) : (
                                            allUsers
                                                .filter(user =>
                                                    user.username.toLowerCase().includes(assignmentUserSearch.toLowerCase())
                                                )
                                                .map((user) => (
                                                    <div
                                                        key={user.id}
                                                        className={`flex items-center space-x-2 p-1 hover:bg-muted rounded cursor-pointer ${assignmentForm.userId === user.id ? "bg-muted" : ""
                                                            }`}
                                                        onClick={() => {
                                                            setAssignmentForm({ ...assignmentForm, userId: user.id });
                                                        }}
                                                    >
                                                        <div className={`w-2 h-2 rounded-full ${assignmentForm.userId === user.id ? "bg-primary" : "bg-muted-foreground"
                                                            }`} />
                                                        <span className="text-sm">{user.username}</span>
                                                    </div>
                                                ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div>
                            <Label htmlFor="promptMessage">Prompt Message (Optional)</Label>
                            <Textarea
                                id="promptMessage"
                                value={assignmentForm.promptMessage}
                                onChange={(e) => setAssignmentForm({ ...assignmentForm, promptMessage: e.target.value })}
                                placeholder="Custom message to show on login (e.g., 'Please write a rationale about your thoughts on this topic')"
                                rows={3}
                            />
                        </div>

                        <Button
                            onClick={handleAssignmentSubmit}
                            disabled={createAssignmentMutation.isPending}
                            className="w-full"
                        >
                            {createAssignmentMutation.isPending ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Assigning...
                                </>
                            ) : (
                                <>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Assign Rationale
                                </>
                            )}
                        </Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                            <MessageSquare className="h-5 w-5" />
                            <span>Assignments ({assignments.length})</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {assignments.map((assignment) => (
                                <div
                                    key={assignment.id}
                                    className="p-3 border rounded-lg space-y-2"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="font-medium text-sm">{assignment.topicName}</div>
                                        <Badge
                                            variant={assignment.completed ? "default" : "secondary"}
                                        >
                                            {assignment.completed ? "Done" : "Pending"}
                                        </Badge>
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        User: {allUsers.find(u => u.id === assignment.userId)?.username || assignment.userId}
                                    </div>
                                    {assignment.promptMessage && (
                                        <div className="text-xs bg-muted p-2 rounded">
                                            {assignment.promptMessage}
                                        </div>
                                    )}
                                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                                        <span>{new Date(assignment.createdAt).toLocaleDateString()}</span>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleRemoveAssignment(assignment)}
                                            disabled={removingAssignmentId === `${assignment.topicId}-${assignment.userId}`}
                                            className="text-red-600 hover:text-red-700 h-6 px-2"
                                        >
                                            {removingAssignmentId === `${assignment.topicId}-${assignment.userId}` ? (
                                                <Loader2 className="h-3 w-3 animate-spin" />
                                            ) : (
                                                <Trash2 className="h-3 w-3" />
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            ))}
                            {isLoadingAssignments ? (
                                <div className="text-center py-4">
                                    <Loader2 className="h-4 w-4 mx-auto animate-spin" />
                                    <p className="text-sm text-muted-foreground mt-2">Loading assignments...</p>
                                </div>
                            ) : assignments.length === 0 ? (
                                <div className="text-center text-muted-foreground text-sm py-4">
                                    No assignments yet. Create assignments to prompt users to write rationales on specific topics.
                                </div>
                            ) : null}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Remove Assignment Confirmation Dialog */}
            <AlertDialog open={!!assignmentToDelete} onOpenChange={() => setAssignmentToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Remove Assignment</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to remove the assignment for &quot;{assignmentToDelete?.username}&quot; on topic &quot;{assignmentToDelete?.topicName}&quot;? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={!!removingAssignmentId}>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmRemoveAssignment}
                            disabled={!!removingAssignmentId}
                            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                        >
                            {removingAssignmentId ? (
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
        </>
    );
} 