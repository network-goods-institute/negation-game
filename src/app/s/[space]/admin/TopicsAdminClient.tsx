"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useIsSpaceAdmin } from "@/hooks/admin/useAdminStatus";
import { Topic } from "@/types/admin";
import { fetchTopics } from "@/services/admin/topicService";
import { fetchAllUsers } from "@/services/admin/userService";
import { fetchAssignments } from "@/services/admin/assignmentService";
import { DelegateStatsSection } from "@/components/admin/DelegateStatsSection";
import { RationaleStatusSection } from "@/components/admin/RationaleStatusSection";
import { TopicForm } from "@/components/admin/TopicForm";
import { TopicsList } from "@/components/admin/TopicsList";
import { AssignmentsPanel } from "@/components/admin/AssignmentsPanel";
import { SpaceSettingsSection } from "@/components/admin/SpaceSettingsSection";

export function TopicsAdminClient({ spaceId }: { spaceId: string }) {
    const { isAdmin: isSpaceAdmin, isLoading: isAdminLoading } = useIsSpaceAdmin(spaceId);
    const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);

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

    return (
        <div className="w-full p-6 bg-background border rounded-lg shadow-sm">
            <div className="space-y-8">
                {/* Space Settings - Top Section */}
                <SpaceSettingsSection spaceId={spaceId} />

                {/* Delegate Statistics - Second Section */}
                <DelegateStatsSection spaceId={spaceId} />

                {/* Rationale Status Overview - Third Section */}
                <RationaleStatusSection
                    spaceId={spaceId}
                    topics={topics}
                    isLoadingTopics={isLoadingTopics}
                />

                {/* Topics List - Full Width Section */}
                <div className="w-full">
                    <TopicsList
                        spaceId={spaceId}
                        topics={topics}
                        isLoadingTopics={isLoadingTopics}
                        selectedTopic={selectedTopic}
                        onEditTopic={setSelectedTopic}
                    />
                </div>

                {/* Main Admin Interface */}
                <div className="grid gap-6 w-full lg:grid-cols-2 md:grid-cols-2">
                    {/* Form Panel */}
                    <div className="order-1 lg:order-1">
                        <TopicForm
                            spaceId={spaceId}
                            selectedTopic={selectedTopic}
                            onTopicChange={setSelectedTopic}
                            allUsers={allUsers}
                            isLoadingUsers={isLoadingUsers}
                            isSpaceAdmin={isSpaceAdmin}
                        />
                    </div>

                    {/* Assignments Panel */}
                    <div className="order-2 lg:order-2">
                        <AssignmentsPanel
                            spaceId={spaceId}
                            topics={topics}
                            allUsers={allUsers}
                            assignments={assignments}
                            isLoadingUsers={isLoadingUsers}
                            isLoadingAssignments={isLoadingAssignments}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
} 