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
import { Plus, Search, UserPlus, MessageSquare, Loader2, Trash2, Filter } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
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
        userIds: [],
        promptMessage: "",
    });
    const [assignmentUserSearch, setAssignmentUserSearch] = useState("");
    const [showOnlyDelegates, setShowOnlyDelegates] = useState(true);
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
            setAssignmentForm({ topicId: "", userIds: [], promptMessage: "" });
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
        if (!assignmentForm.topicId || assignmentForm.userIds.length === 0) {
            toast.error("Please select both a topic and at least one user");
            return;
        }

        // Create assignments for all selected users
        assignmentForm.userIds.forEach(userId => {
            createAssignmentMutation.mutate({
                topicId: parseInt(assignmentForm.topicId),
                targetUserId: userId,
                promptMessage: assignmentForm.promptMessage || undefined,
            });
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
                            <Label htmlFor="assignmentUser">
                                Users {assignmentForm.userIds.length > 0 && `(${assignmentForm.userIds.length} selected)`}
                            </Label>
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
                                <div className="flex items-center justify-between px-1">
                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id="show-delegates"
                                            checked={showOnlyDelegates}
                                            onCheckedChange={(checked) => setShowOnlyDelegates(checked as boolean)}
                                        />
                                        <Label htmlFor="show-delegates" className="text-sm text-muted-foreground cursor-pointer">
                                            Show only active users
                                        </Label>
                                    </div>
                                    {assignmentForm.userIds.length > 0 && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setAssignmentForm({ ...assignmentForm, userIds: [] })}
                                            className="text-xs h-6 px-2"
                                        >
                                            Clear all
                                        </Button>
                                    )}
                                </div>
                                <div className="h-32 md:h-24 border rounded-lg overflow-hidden">
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
                                                .filter(user => {
                                                    const matchesSearch = user.username.toLowerCase().includes(assignmentUserSearch.toLowerCase());
                                                    if (!showOnlyDelegates) return matchesSearch;
                                                    
                                                    const delegateUser = user as any;
                                                    const hasActivity = delegateUser.pointsCreated > 0 || 
                                                                       delegateUser.rationalesCreated > 0 || 
                                                                       delegateUser.totalEndorsementsMade > 0;
                                                    return matchesSearch && hasActivity;
                                                })
                                                .map((user) => (
                                                    <div
                                                        key={user.id}
                                                        className={`flex items-center space-x-2 p-2 hover:bg-muted rounded cursor-pointer transition-colors ${assignmentForm.userIds.includes(user.id) ? "bg-muted border border-primary" : ""
                                                            }`}
                                                        onClick={() => {
                                                            const isSelected = assignmentForm.userIds.includes(user.id);
                                                            if (isSelected) {
                                                                setAssignmentForm({ 
                                                                    ...assignmentForm, 
                                                                    userIds: assignmentForm.userIds.filter(id => id !== user.id)
                                                                });
                                                            } else {
                                                                setAssignmentForm({ 
                                                                    ...assignmentForm, 
                                                                    userIds: [...assignmentForm.userIds, user.id]
                                                                });
                                                            }
                                                        }}
                                                    >
                                                        <div className={`w-3 h-3 rounded-sm border-2 flex items-center justify-center ${assignmentForm.userIds.includes(user.id) ? "bg-primary border-primary" : "border-muted-foreground"
                                                            }`}>
                                                            {assignmentForm.userIds.includes(user.id) && (
                                                                <div className="text-white text-xs font-bold">✓</div>
                                                            )}
                                                        </div>
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
                                    {assignmentForm.userIds.length > 1 
                                        ? `Assign to ${assignmentForm.userIds.length} Users`
                                        : 'Assign Rationale'
                                    }
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
                                    className="p-3 border rounded-lg space-y-3"
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium text-sm truncate">{assignment.topicName}</div>
                                            <div className="text-xs text-muted-foreground mt-1">
                                                User: {allUsers.find(u => u.id === assignment.userId)?.username || assignment.userId}
                                            </div>
                                        </div>
                                        <Badge
                                            variant={assignment.completed ? "default" : "secondary"}
                                            className="shrink-0"
                                        >
                                            {assignment.completed ? "Done" : "Pending"}
                                        </Badge>
                                    </div>
                                    {assignment.promptMessage && (
                                        <div className="text-xs bg-muted p-2 rounded">
                                            {assignment.promptMessage}
                                        </div>
                                    )}
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-xs text-muted-foreground">
                                            {new Date(assignment.createdAt).toLocaleDateString()}
                                        </span>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleRemoveAssignment(assignment)}
                                            disabled={removingAssignmentId === `${assignment.topicId}-${assignment.userId}`}
                                            className="text-red-600 hover:text-red-700 h-7 px-2 shrink-0"
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