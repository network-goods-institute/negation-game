"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { Badge } from "@/components/ui/badge";
import { Search, Users, ChevronDown, ChevronUp, Loader2, CheckCircle, XCircle, Filter } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Topic } from "@/types/admin";
import { fetchRationaleStatus, fetchDelegateStats } from "@/services/admin/statisticsService";

interface RationaleStatusSectionProps {
    spaceId: string;
    topics: Topic[];
    isLoadingTopics: boolean;
}

export function RationaleStatusSection({ spaceId, topics, isLoadingTopics }: RationaleStatusSectionProps) {
    const [statusExpanded, setStatusExpanded] = useState(false);
    const [selectedStatusTopic, setSelectedStatusTopic] = useState<string>("all");
    const [statusUserSearch, setStatusUserSearch] = useState("");
    const [showOnlyActive, setShowOnlyActive] = useState(true);
    const [showOnlyIncomplete, setShowOnlyIncomplete] = useState(false);

    const { data: rationaleStatus = [], isLoading: isLoadingStatus } = useQuery({
        queryKey: ["rationale-status", spaceId, selectedStatusTopic],
        queryFn: () => fetchRationaleStatus(spaceId),
        enabled: statusExpanded,
    });

    const { data: delegateStats = [] } = useQuery({
        queryKey: ["delegate-stats", spaceId],
        queryFn: () => fetchDelegateStats(spaceId),
        enabled: statusExpanded,
    });

    const filteredStatusData = rationaleStatus
        .filter(topic =>
            selectedStatusTopic === "all" || topic.topicId.toString() === selectedStatusTopic
        )
        .map(topic => ({
            ...topic,
            users: topic.users.filter(user => {
                const matchesSearch = user.username.toLowerCase().includes(statusUserSearch.toLowerCase());
                
                if (!matchesSearch) return false;
                
                // Filter by overall space activity if enabled
                if (showOnlyActive) {
                    const userDelegate = delegateStats.find(delegate => delegate.userId === user.userId);
                    if (userDelegate) {
                        const hasActivity = userDelegate.pointsCreated > 0 || 
                                           userDelegate.rationalesCreated > 0 || 
                                           userDelegate.totalEndorsementsMade > 0;
                        if (!hasActivity) return false;
                    } else {
                        // If no delegate stats available, fall back to rationale count
                        if (user.rationaleCount === 0) return false;
                    }
                }
                
                // Filter by incomplete status if enabled (users with no published rationale)
                if (showOnlyIncomplete && user.hasPublishedRationale) return false;
                
                return true;
            })
        }));

    return (
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
                    <div className="space-y-4">
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
                        
                        {/* Filter Options */}
                        <div className="flex flex-wrap gap-4 p-4 bg-muted/50 rounded-lg">
                            <div className="flex items-center space-x-2">
                                <Filter className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm font-medium text-muted-foreground">Filters:</span>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="show-active-rationale"
                                    checked={showOnlyActive}
                                    onCheckedChange={(checked) => setShowOnlyActive(checked as boolean)}
                                />
                                <Label htmlFor="show-active-rationale" className="text-sm cursor-pointer">
                                    Show only active users
                                </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="show-incomplete"
                                    checked={showOnlyIncomplete}
                                    onCheckedChange={(checked) => setShowOnlyIncomplete(checked as boolean)}
                                />
                                <Label htmlFor="show-incomplete" className="text-sm cursor-pointer">
                                    Show only incomplete assignments
                                </Label>
                            </div>
                            <div className="text-xs text-muted-foreground">
                                Showing {filteredStatusData.reduce((total, topic) => total + topic.users.length, 0)} users across {filteredStatusData.length} topics
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
    );
} 