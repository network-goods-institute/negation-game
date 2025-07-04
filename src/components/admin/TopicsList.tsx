"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, Loader2 } from "lucide-react";
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
import { Topic } from "@/types/admin";
import { deleteTopic } from "@/services/admin/topicService";

interface TopicsListProps {
    spaceId: string;
    topics: Topic[];
    isLoadingTopics: boolean;
    selectedTopic: Topic | null;
    onEditTopic: (topic: Topic) => void;
}

export function TopicsList({
    spaceId,
    topics,
    isLoadingTopics,
    selectedTopic,
    onEditTopic
}: TopicsListProps) {
    const [topicToDelete, setTopicToDelete] = useState<Topic | null>(null);
    const [deletingTopicId, setDeletingTopicId] = useState<number | null>(null);

    const queryClient = useQueryClient();

    const deleteMutation = useMutation({
        mutationFn: deleteTopic,
        onMutate: (topicId) => {
            setDeletingTopicId(topicId);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-topics", spaceId] });
            toast.success("Topic deleted successfully");
            setDeletingTopicId(null);
        },
        onError: (error) => {
            toast.error(error.message);
            setDeletingTopicId(null);
        },
    });

    const handleDelete = (topic: Topic) => {
        setTopicToDelete(topic);
    };

    const confirmDelete = () => {
        if (topicToDelete) {
            deleteMutation.mutate(topicToDelete.id);
            setTopicToDelete(null);
        }
    };

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle>Topics ({topics.length})</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="w-full">
                        <Table className="w-full table-fixed">
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-2/5">Name</TableHead>
                                    <TableHead className="w-1/5">Access</TableHead>
                                    <TableHead className="w-1/5">Created</TableHead>
                                    <TableHead className="w-1/5">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {topics.map((topic) => (
                                    <TableRow
                                        key={topic.id}
                                        className={selectedTopic?.id === topic.id ? "bg-muted" : ""}
                                    >
                                        <TableCell>
                                            <div>
                                                <div className="font-medium">{topic.name}</div>
                                                {topic.discourseUrl && (
                                                    <a
                                                        href={topic.discourseUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-xs text-blue-600 hover:underline"
                                                    >
                                                        Discourse
                                                    </a>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant={topic.restrictedRationaleCreation ? "secondary" : "outline"}
                                            >
                                                {topic.restrictedRationaleCreation ? "Restricted" : "Open"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {topic.createdAt
                                                ? new Date(topic.createdAt).toLocaleDateString()
                                                : "N/A"
                                            }
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center space-x-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => onEditTopic(topic)}
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleDelete(topic)}
                                                    disabled={deletingTopicId === topic.id}
                                                    className="text-red-600 hover:text-red-700"
                                                >
                                                    {deletingTopicId === topic.id ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <Trash2 className="h-4 w-4" />
                                                    )}
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {isLoadingTopics ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-8">
                                            <div className="flex flex-col items-center space-y-2">
                                                <Loader2 className="h-5 w-5 animate-spin" />
                                                <span className="text-muted-foreground">Loading topics...</span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : topics.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                                            No topics created yet. Create your first topic to get started.
                                        </TableCell>
                                    </TableRow>
                                ) : null}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Delete Topic Confirmation Dialog */}
            <AlertDialog open={!!topicToDelete} onOpenChange={() => setTopicToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Topic</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete &quot;{topicToDelete?.name}&quot;? This action cannot be undone and will remove all associated data.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={!!deletingTopicId}>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDelete}
                            disabled={!!deletingTopicId}
                            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                        >
                            {deletingTopicId ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Deleting...
                                </>
                            ) : (
                                "Delete Topic"
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
} 