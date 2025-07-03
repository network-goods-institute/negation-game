"use client";

import { useState, useEffect, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Topic, User, TopicFormData, TopicPermission } from "@/types/admin";
import { createTopic, updateTopic, fetchTopicPermissions } from "@/services/admin/topicService";

interface TopicFormProps {
    spaceId: string;
    selectedTopic: Topic | null;
    onTopicChange: (topic: Topic | null) => void;
    allUsers: User[];
    isLoadingUsers: boolean;
}

export function TopicForm({
    spaceId,
    selectedTopic,
    onTopicChange,
    allUsers,
    isLoadingUsers
}: TopicFormProps) {
    const [form, setForm] = useState<TopicFormData>({
        name: "",
        discourseUrl: "",
        access: "open",
        selectedUsers: [],
    });
    const [userSearch, setUserSearch] = useState("");
    const [existingPermissions, setExistingPermissions] = useState<TopicPermission[]>([]);

    const queryClient = useQueryClient();

    const createMutation = useMutation({
        mutationFn: createTopic,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-topics", spaceId] });
            resetForm();
            toast.success("Topic created successfully");
        },
        onError: (error) => {
            toast.error(error.message);
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ topicId, data }: { topicId: number; data: any }) =>
            updateTopic(topicId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-topics", spaceId] });
            resetForm();
            toast.success("Topic updated successfully");
        },
        onError: (error) => {
            toast.error(error.message);
        },
    });

    const resetForm = () => {
        setForm({ name: "", discourseUrl: "", access: "open", selectedUsers: [] });
        onTopicChange(null);
        setUserSearch("");
        setExistingPermissions([]);
    };

    const handleSubmit = () => {
        if (!form.name.trim()) {
            toast.error("Topic name is required");
            return;
        }

        // Build permissions array based on access control setting
        let permissions: { userId: string; canCreateRationale: boolean }[] = [];

        if (form.access === "whitelist") {
            permissions = form.selectedUsers.map(userId => ({
                userId,
                canCreateRationale: true,
            }));
        } else if (form.access === "blacklist") {
            permissions = form.selectedUsers.map(userId => ({
                userId,
                canCreateRationale: false,
            }));
        }

        const data = {
            name: form.name,
            space: spaceId,
            discourseUrl: form.discourseUrl,
            restrictedRationaleCreation: form.access !== "open",
            permissions: form.access !== "open" ? permissions : undefined,
        };

        if (selectedTopic) {
            updateMutation.mutate({
                topicId: selectedTopic.id,
                data: {
                    name: form.name,
                    discourseUrl: form.discourseUrl,
                    restrictedRationaleCreation: form.access !== "open",
                    permissions: form.access !== "open" ? permissions : undefined,
                },
            });
        } else {
            createMutation.mutate(data);
        }
    };

    const handleEdit = useCallback(async (topic: Topic) => {
        onTopicChange(topic);

        let accessType: "open" | "whitelist" | "blacklist" = "open";
        let selectedUsers: string[] = [];

        if (topic.restrictedRationaleCreation) {
            try {
                const permissions = await fetchTopicPermissions(topic.id);
                setExistingPermissions(permissions);

                if (permissions.length > 0) {
                    const hasAllowPermissions = permissions.some(p => p.canCreateRationale === true);
                    const hasDenyPermissions = permissions.some(p => p.canCreateRationale === false);

                    if (hasAllowPermissions && !hasDenyPermissions) {
                        accessType = "whitelist";
                        selectedUsers = permissions.filter(p => p.canCreateRationale === true).map(p => p.userId);
                    } else if (hasDenyPermissions && !hasAllowPermissions) {
                        accessType = "blacklist";
                        selectedUsers = permissions.filter(p => p.canCreateRationale === false).map(p => p.userId);
                    } else {
                        accessType = "whitelist";
                        selectedUsers = permissions.filter(p => p.canCreateRationale === true).map(p => p.userId);
                    }
                } else {
                    accessType = "whitelist";
                }
            } catch (error) {
                console.error("Failed to load topic permissions:", error);
                toast.error("Failed to load topic permissions");
            }
        }

        setForm({
            name: topic.name,
            discourseUrl: topic.discourseUrl,
            access: accessType,
            selectedUsers,
        });
    }, [onTopicChange]);

    useEffect(() => {
        if (selectedTopic) {
            handleEdit(selectedTopic);
        }
    }, [selectedTopic, handleEdit]);

    return (
        <Card>
            <CardHeader>
                <CardTitle>
                    {selectedTopic ? "Edit Topic" : "Create Topic"}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div>
                    <Label htmlFor="name">Topic Name</Label>
                    <Input
                        id="name"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        placeholder="Enter topic name"
                    />
                </div>

                <div>
                    <Label htmlFor="discourseUrl">Discourse URL</Label>
                    <Input
                        id="discourseUrl"
                        value={form.discourseUrl}
                        onChange={(e) => setForm({ ...form, discourseUrl: e.target.value })}
                        placeholder="https://discourse.example.com/topic/123"
                    />
                </div>

                <div>
                    <Label htmlFor="access">Access Control</Label>
                    <Select
                        value={form.access}
                        onValueChange={(value: "open" | "whitelist" | "blacklist") =>
                            setForm({ ...form, access: value, selectedUsers: [] })
                        }
                    >
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="open" className="text-left">Open - Everyone can create rationales</SelectItem>
                            <SelectItem value="whitelist" className="text-left">Whitelist - Only selected users</SelectItem>
                            <SelectItem value="blacklist" className="text-left">Blacklist - Everyone except selected users</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {form.access !== "open" && (
                    <div className="space-y-3">
                        <Label>
                            {form.access === "whitelist" ? "Users who CAN create rationales:" : "Users who CANNOT create rationales:"}
                        </Label>

                        {selectedTopic && existingPermissions.length > 0 && (
                            <div className="text-sm text-muted-foreground mb-2">
                                <span className="font-medium">Current permissions:</span>
                                <div className="mt-1 space-y-1">
                                    {existingPermissions.map(permission => {
                                        const user = allUsers.find(u => u.id === permission.userId);
                                        return (
                                            <div key={permission.userId} className="flex items-center space-x-2">
                                                <div className={`w-2 h-2 rounded-full ${permission.canCreateRationale ? 'bg-green-500' : 'bg-red-500'}`} />
                                                <span>{user?.username || permission.userId}</span>
                                                <span className="text-xs">({permission.canCreateRationale ? 'allowed' : 'denied'})</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        <div className="relative">
                            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search users..."
                                value={userSearch}
                                onChange={(e) => setUserSearch(e.target.value)}
                                className="pl-10"
                            />
                        </div>

                        <div className="h-32 border rounded-lg overflow-hidden">
                            <div className="h-full overflow-y-auto p-2 space-y-1">
                                {isLoadingUsers ? (
                                    <div className="flex items-center justify-center h-full">
                                        <div className="flex flex-col items-center space-y-2">
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            <span className="text-xs text-muted-foreground">Loading users...</span>
                                        </div>
                                    </div>
                                ) : (
                                    allUsers
                                        .filter(user =>
                                            user.username.toLowerCase().includes(userSearch.toLowerCase())
                                        )
                                        .map((user) => (
                                            <div
                                                key={user.id}
                                                className="flex items-center space-x-2 p-1 hover:bg-muted rounded cursor-pointer"
                                                onClick={() => {
                                                    const isSelected = form.selectedUsers.includes(user.id);
                                                    if (isSelected) {
                                                        setForm({
                                                            ...form,
                                                            selectedUsers: form.selectedUsers.filter(id => id !== user.id),
                                                        });
                                                    } else {
                                                        setForm({
                                                            ...form,
                                                            selectedUsers: [...form.selectedUsers, user.id],
                                                        });
                                                    }
                                                }}
                                            >
                                                <Checkbox
                                                    checked={form.selectedUsers.includes(user.id)}
                                                />
                                                <span className="text-sm">{user.username}</span>
                                            </div>
                                        ))
                                )}
                            </div>
                        </div>

                        {form.selectedUsers.length > 0 && (
                            <div className="text-sm text-muted-foreground">
                                {form.selectedUsers.length} user{form.selectedUsers.length !== 1 ? 's' : ''} selected
                            </div>
                        )}
                    </div>
                )}

                <div className="flex space-x-2">
                    <Button
                        onClick={handleSubmit}
                        disabled={createMutation.isPending || updateMutation.isPending}
                        className="flex-1"
                    >
                        {createMutation.isPending || updateMutation.isPending ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                {selectedTopic ? "Updating..." : "Creating..."}
                            </>
                        ) : (
                            selectedTopic ? "Update" : "Create"
                        )}
                    </Button>
                    {selectedTopic && (
                        <Button variant="outline" onClick={resetForm}>
                            Cancel
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    );
} 