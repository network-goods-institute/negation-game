"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Edit, Trash2, Search, UserPlus, MessageSquare, Loader2, Users, CheckCircle, XCircle, ChevronDown, ChevronUp, Filter } from "lucide-react";
import { toast } from "sonner";
import { useIsSpaceAdmin } from "@/hooks/admin/useAdminStatus";
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
  space: string;
  discourseUrl: string;
  restrictedRationaleCreation: boolean;
  createdAt: string;
}

interface User {
  id: string;
  username: string;
}

interface Assignment {
  id: string;
  topicId: number;
  topicName: string;
  userId: string;
  promptMessage: string | null;
  completed: boolean;
  completedAt: string | null;
  createdAt: string;
}

interface TopicRationaleStatus {
  topicId: number;
  topicName: string;
  users: {
    userId: string;
    username: string;
    hasPublishedRationale: boolean;
    rationaleCount: number;
  }[];
}

interface TopicPermission {
  userId: string;
  canCreateRationale: boolean;
}

async function fetchTopics(spaceId: string): Promise<Topic[]> {
  const response = await fetch(`/api/spaces/${spaceId}/topics`);
  if (!response.ok) throw new Error("Failed to fetch topics");
  return response.json();
}

async function createTopic(data: {
  name: string;
  space: string;
  discourseUrl: string;
  restrictedRationaleCreation: boolean;
  permissions?: { userId: string; canCreateRationale: boolean }[];
}) {
  const response = await fetch("/api/topics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Failed to create topic");
  return response.json();
}

async function updateTopic(
  topicId: number,
  data: {
    name?: string;
    discourseUrl?: string;
    restrictedRationaleCreation?: boolean;
    permissions?: { userId: string; canCreateRationale: boolean }[];
  }
) {
  const response = await fetch(`/api/topics/${topicId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Failed to update topic");
  return response.json();
}

async function fetchTopicPermissions(topicId: number): Promise<TopicPermission[]> {
  const response = await fetch(`/api/topics/${topicId}/permissions`);
  if (!response.ok) throw new Error("Failed to fetch topic permissions");
  return response.json();
}

async function deleteTopic(topicId: number) {
  const response = await fetch(`/api/topics/${topicId}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Failed to delete topic");
  return response.json();
}

async function fetchAllUsers(spaceId: string): Promise<User[]> {
  const response = await fetch(`/api/spaces/${spaceId}/all-users`);
  if (!response.ok) throw new Error("Failed to fetch users");
  return response.json();
}

async function fetchAssignments(spaceId: string): Promise<Assignment[]> {
  const response = await fetch(`/api/spaces/${spaceId}/rationale-assignments`);
  if (!response.ok) throw new Error("Failed to fetch assignments");
  return response.json();
}

async function createAssignment(data: {
  topicId: number;
  targetUserId: string;
  promptMessage?: string;
}, spaceId: string) {
  const response = await fetch(`/api/spaces/${spaceId}/rationale-assignments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Failed to create assignment");
  return response.json();
}

async function removeAssignment(topicId: number, userId: string, spaceId: string) {
  const response = await fetch(`/api/spaces/${spaceId}/rationale-assignments?topicId=${topicId}&userId=${userId}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Failed to remove assignment");
  return response.json();
}

async function fetchRationaleStatus(spaceId: string): Promise<TopicRationaleStatus[]> {
  const response = await fetch(`/api/spaces/${spaceId}/rationale-status`);
  if (!response.ok) throw new Error("Failed to fetch rationale status");
  return response.json();
}

export function TopicsAdminClient({ spaceId }: { spaceId: string }) {
  const { isAdmin: isSpaceAdmin, isLoading: isAdminLoading } = useIsSpaceAdmin(spaceId);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [form, setForm] = useState({
    name: "",
    discourseUrl: "",
    access: "open" as "open" | "whitelist" | "blacklist",
    selectedUsers: [] as string[],
  });
  const [userSearch, setUserSearch] = useState("");

  // Assignment form state
  const [assignmentForm, setAssignmentForm] = useState({
    topicId: "",
    userId: "",
    promptMessage: "",
  });
  const [assignmentUserSearch, setAssignmentUserSearch] = useState("");

  // Status viewer state
  const [statusExpanded, setStatusExpanded] = useState(false);
  const [selectedStatusTopic, setSelectedStatusTopic] = useState<string>("all");
  const [statusUserSearch, setStatusUserSearch] = useState("");

  // Delete confirmation state
  const [topicToDelete, setTopicToDelete] = useState<Topic | null>(null);
  const [assignmentToDelete, setAssignmentToDelete] = useState<{ topicId: number; userId: string; topicName: string; username: string } | null>(null);
  const [deletingTopicId, setDeletingTopicId] = useState<number | null>(null);
  const [removingAssignmentId, setRemovingAssignmentId] = useState<string | null>(null);

  // Permissions state
  const [existingPermissions, setExistingPermissions] = useState<TopicPermission[]>([]);

  const queryClient = useQueryClient();

  const { data: topics = [], isLoading: isLoadingTopics } = useQuery({
    queryKey: ["admin-topics", spaceId],
    queryFn: () => fetchTopics(spaceId),
  });

  const { data: allUsers = [], isLoading: isLoadingUsers } = useQuery({
    queryKey: ["all-users", spaceId],
    queryFn: () => fetchAllUsers(spaceId),
  });

  const { data: assignments = [], isLoading: isLoadingAssignments } = useQuery({
    queryKey: ["assignments", spaceId],
    queryFn: () => fetchAssignments(spaceId),
  });

  const { data: rationaleStatus = [], isLoading: isLoadingStatus } = useQuery({
    queryKey: ["rationale-status", spaceId, selectedStatusTopic],
    queryFn: () => fetchRationaleStatus(spaceId),
    enabled: statusExpanded,
  });

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

  const resetForm = () => {
    setForm({ name: "", discourseUrl: "", access: "open", selectedUsers: [] });
    setSelectedTopic(null);
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
      // Whitelist: only selected users can create rationales
      permissions = form.selectedUsers.map(userId => ({
        userId,
        canCreateRationale: true,
      }));
    } else if (form.access === "blacklist") {
      // Blacklist: selected users cannot create rationales, everyone else can
      permissions = form.selectedUsers.map(userId => ({
        userId,
        canCreateRationale: false,
      }));
    }
    // Open: no permissions needed (restrictedRationaleCreation = false)

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

  const handleEdit = async (topic: Topic) => {
    setSelectedTopic(topic);

    let accessType: "open" | "whitelist" | "blacklist" = "open";
    let selectedUsers: string[] = [];

    if (topic.restrictedRationaleCreation) {
      try {
        const permissions = await fetchTopicPermissions(topic.id);
        setExistingPermissions(permissions);

        // Determine if this is a whitelist or blacklist based on permissions
        if (permissions.length > 0) {
          const hasAllowPermissions = permissions.some(p => p.canCreateRationale === true);
          const hasDenyPermissions = permissions.some(p => p.canCreateRationale === false);

          if (hasAllowPermissions && !hasDenyPermissions) {
            // Only allow permissions = whitelist
            accessType = "whitelist";
            selectedUsers = permissions.filter(p => p.canCreateRationale === true).map(p => p.userId);
          } else if (hasDenyPermissions && !hasAllowPermissions) {
            // Only deny permissions = blacklist
            accessType = "blacklist";
            selectedUsers = permissions.filter(p => p.canCreateRationale === false).map(p => p.userId);
          } else {
            // Mixed permissions - default to whitelist with allowed users
            accessType = "whitelist";
            selectedUsers = permissions.filter(p => p.canCreateRationale === true).map(p => p.userId);
          }
        } else {
          // Restricted but no specific permissions = whitelist with no users
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
  };

  const handleDelete = (topic: Topic) => {
    setTopicToDelete(topic);
  };

  const confirmDelete = () => {
    if (topicToDelete) {
      deleteMutation.mutate(topicToDelete.id);
      setTopicToDelete(null);
    }
  };

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

  const isMainLoading = isLoadingTopics || isLoadingUsers || isAdminLoading;

  if (isMainLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  if (isAdminLoading) {
    return (
      <div className="p-8 text-center">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <span className="ml-2">Loading...</span>
        </div>
      </div>
    );
  }

  if (!isSpaceAdmin) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-semibold mb-4">Access Denied</h2>
        <p className="text-muted-foreground">You need to be a space administrator to access this page.</p>
      </div>
    );
  }

  const filteredStatusData = rationaleStatus
    .filter(topic =>
      selectedStatusTopic === "all" || topic.topicId.toString() === selectedStatusTopic
    )
    .map(topic => ({
      ...topic,
      users: topic.users.filter(user =>
        user.username.toLowerCase().includes(statusUserSearch.toLowerCase())
      )
    }));

  return (
    <div className="w-full p-6 bg-background border rounded-lg shadow-sm">
      <div className="space-y-8">
        {/* Rationale Status Overview - Top Section */}
        <Card>
          <CardHeader>
            <div
              className="flex items-center justify-between cursor-pointer"
              onClick={() => setStatusExpanded(!statusExpanded)}
            >
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>Rationale Status Overview</span>
              </CardTitle>
              {statusExpanded ? (
                <ChevronUp className="h-5 w-5" />
              ) : (
                <ChevronDown className="h-5 w-5" />
              )}
            </div>
          </CardHeader>
          {statusExpanded && (
            <CardContent className="space-y-4">
              {/* Filters */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="statusTopic">Filter by Topic</Label>
                  <Select
                    value={selectedStatusTopic}
                    onValueChange={setSelectedStatusTopic}
                    disabled={isLoadingTopics}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={isLoadingTopics ? "Loading topics..." : "All topics"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All topics</SelectItem>
                      {topics.map((topic) => (
                        <SelectItem key={topic.id} value={topic.id.toString()}>
                          {topic.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="statusUserSearch">Search Users</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="statusUserSearch"
                      placeholder="Search users..."
                      value={statusUserSearch}
                      onChange={(e) => setStatusUserSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              {/* Status Display */}
              {isLoadingStatus ? (
                <div className="text-center py-8">
                  <Loader2 className="h-6 w-6 mx-auto animate-spin" />
                  <p className="text-sm text-muted-foreground mt-2">Loading rationale status...</p>
                </div>
              ) : filteredStatusData.length > 0 ? (
                <div className="space-y-6">
                  {filteredStatusData.map((topic) => (
                    <div key={topic.topicId} className="border rounded-lg p-4">
                      <h4 className="font-semibold mb-3">{topic.topicName}</h4>
                      {topic.users.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                          {topic.users.map((user) => (
                            <div
                              key={user.userId}
                              className={`flex items-center justify-between p-2 rounded text-sm ${user.hasPublishedRationale
                                ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200"
                                : "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200"
                                }`}
                            >
                              <span className="flex items-center space-x-2">
                                {user.hasPublishedRationale ? (
                                  <CheckCircle className="h-4 w-4" />
                                ) : (
                                  <XCircle className="h-4 w-4" />
                                )}
                                <span>{user.username}</span>
                              </span>
                              {user.hasPublishedRationale && (
                                <Badge variant="outline" className="text-xs">
                                  {user.rationaleCount}
                                </Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-center py-4">
                          No users match your search.
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  {selectedStatusTopic !== "all" ? "No data for selected topic." : "No topics found. Create a topic to see rationale status."}
                </p>
              )}
            </CardContent>
          )}
        </Card>

        {/* Main Admin Interface */}
        <div className="grid gap-8 w-full" style={{ gridTemplateColumns: "1fr 2fr 1fr" }}>
          {/* Form Panel */}
          <div className="lg:col-span-1">
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
          </div>

          {/* Topics List */}
          <div className="lg:col-span-1">
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
                                onClick={() => handleEdit(topic)}
                                disabled={updateMutation.isPending}
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
          </div>

          {/* Rationale Assignments Panel */}
          <div className="lg:col-span-1 space-y-6">
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
        </div>



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
      </div>
    </div>
  );
}