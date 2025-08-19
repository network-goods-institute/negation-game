"use client";
import React, { useState, useMemo, useEffect } from "react";
import { ViewpointCardWrapper } from "@/components/cards/ViewpointCardWrapper";
import { Button } from "@/components/ui/button";
import { Check, ExternalLink, LayoutGrid, Lock, Info, Crown, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { encodeId } from "@/lib/negation-game/encodeId";
import { Loader } from "@/components/ui/loader";
import { DeltaComparisonWidget } from "@/components/delta/DeltaComparisonWidget";
import { usePrivy } from "@privy-io/react-auth";
import { useSpaceUsers } from "@/queries/users/useSpaceUsers";
import { UsernameDisplay } from "@/components/ui/UsernameDisplay";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCanCreateRationale } from "@/hooks/topics/useCanCreateRationale";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SpaceLayout } from "@/components/layouts/SpaceLayout";
import { SpaceChildHeader } from "@/components/layouts/headers/SpaceChildHeader";

interface Topic {
    id: number;
    name: string;
    discourseUrl?: string | null;
}

interface Viewpoint {
    id: string;
    title: string;
    description: string;
    authorId: string;
    authorUsername: string;
    createdAt: string;
    graph: any;
    space: string;
    statistics: {
        views: number;
        copies: number;
        totalCred: number;
        averageFavor: number;
    };
}

type SortKey = "recent" | "author" | "cred" | "favor" | "views" | "copies";

const sortFunctions: Record<SortKey, (a: Viewpoint, b: Viewpoint) => number> = {
    recent: (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    author: (a, b) => a.authorUsername.localeCompare(b.authorUsername),
    cred: (a, b) => b.statistics.totalCred - a.statistics.totalCred,
    favor: (a, b) => b.statistics.averageFavor - a.statistics.averageFavor,
    views: (a, b) => b.statistics.views - a.statistics.views,
    copies: (a, b) => b.statistics.copies - a.statistics.copies,
};

interface TopicPageClientProps {
    topic: Topic;
    viewpoints: Viewpoint[];
    space: string;
}

export default function TopicPageClient({ topic, viewpoints, space }: TopicPageClientProps) {
    const { user: privyUser } = usePrivy();
    const router = useRouter();
    const [viewpointsSortKey, setSortKey] = useState<SortKey>("recent");
    const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
    const [isGlobalGraphLoading, setIsGlobalGraphLoading] = useState(false);
    const [loadingCardId, setLoadingCardId] = useState<string | null>(null);
    const [isGeneratingProposal, setIsGeneratingProposal] = useState(false);

    const { data: spaceUsers, isLoading: isUsersLoading } = useSpaceUsers(space);
    const { data: permissionData, isLoading: isPermissionLoading } = useCanCreateRationale(topic?.id);


    const sortedDelegates = useMemo(() => {
        if (!spaceUsers) return [];

        const delegatesWithStatus = spaceUsers.map(user => {
            const hasPublished = viewpoints.some(vp => vp.authorId === user.id);
            const reputation = user.cred || 50;
            const isDelegate = !!(user.agoraLink || user.scrollDelegateLink || user.delegationUrl);
            return { ...user, hasPublished, reputation, isDelegate };
        });

        return delegatesWithStatus.sort((a, b) => {
            // First priority: delegates with agora/scroll links
            if (a.isDelegate !== b.isDelegate) {
                return a.isDelegate ? -1 : 1;
            }

            // Second priority: published vs not published
            if (a.hasPublished !== b.hasPublished) {
                return a.hasPublished ? -1 : 1;
            }

            // Third priority: alphabetical
            return a.username.localeCompare(b.username);
        });
    }, [spaceUsers, viewpoints]);

    const hasCurrentUserRationale = !!(privyUser && viewpoints.some(vp => vp.authorId === privyUser.id));

    const canGenerateJointProposal = viewpoints.length >= 1 && privyUser;

    const handleCardClick = (id: string) => {
        setLoadingCardId(id);
        const rationaleId = id.replace('rationale-', '');
        if (typeof window !== 'undefined') {
            window.location.href = `/s/${space}/rationale/${rationaleId}`;
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsGlobalGraphLoading(false);
        }, 100);

        return () => clearTimeout(timer);
    }, [topic.id]);

    const sorted = useMemo(() => {
        const arr = [...viewpoints].sort(sortFunctions[viewpointsSortKey]);
        return sortDirection === 'desc' ? arr : arr.reverse();
    }, [viewpoints, viewpointsSortKey, sortDirection]);


    const headerContent = (
        <SpaceChildHeader
            title={`Topic: ${topic.name}`}
            subtitle={`${viewpoints.length} rationale${viewpoints.length !== 1 ? 's' : ''}`}
            onBack={() => router.push(`/s/${space}`)}
        />
    );

    // Right sidebar content with delegate status
    const rightSidebarContent = (
        <div className="space-y-4 h-full flex flex-col">
            {/* Delta Comparison Widget */}
            <DeltaComparisonWidget
                comparison={{ type: "topic", topicId: topic.id }}
                title="Topic Alignment"
                description="Find aligned users"
                currentUserId={privyUser?.id}
                spaceId={space}
            />

            {/* Delegate Status Section */}
            <div className="space-y-3 flex-1 min-h-0 flex flex-col" data-testid="delegate-status-section">
                <div className="flex items-center justify-between flex-shrink-0">
                    <h3 className="text-lg font-semibold">Delegate Status</h3>
                    <span className="text-sm text-muted-foreground">By Status</span>
                </div>
                <div className="space-y-2 flex-1 min-h-0 overflow-y-auto">
                    {isUsersLoading ? (
                        <div className="p-4 bg-muted/30 border rounded-lg text-center">
                            <Loader className="h-5 w-5 mx-auto mb-2" />
                            <p className="text-sm text-muted-foreground">Loading delegates...</p>
                        </div>
                    ) : sortedDelegates.map((user) => (
                        <div key={user.id} className="flex items-center justify-between p-3 bg-background border rounded-lg hover:bg-accent/50 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className={user.hasPublished ? "flex items-center justify-center w-6 h-6 bg-green-100 dark:bg-green-900/30 border-2 border-green-500 rounded-full" : "w-6 h-6 border-2 border-muted-foreground/30 rounded-full"} title={user.hasPublished ? "This delegate published a rationale for this topic" : "This delegate has not published a rationale for this topic yet"}>
                                    {user.hasPublished && <Check className="w-3 h-3 text-green-600 dark:text-green-400" />}
                                </div>
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-1">
                                        <UsernameDisplay
                                            username={user.username}
                                            userId={user.id}
                                            className="text-sm font-medium"
                                        />
                                        {user.isDelegate && (
                                            <Crown className="h-3 w-3 text-amber-500" />
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-muted-foreground">{Math.round(user.reputation)} cred</span>
                                        {user.scrollDelegateLink && (
                                            <a
                                                href={user.scrollDelegateLink}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-primary text-xs hover:underline"
                                                title="Scroll Delegate"
                                            >
                                                Scroll
                                            </a>
                                        )}
                                        {user.agoraLink && (
                                            <a
                                                href={user.agoraLink}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-primary text-xs hover:underline"
                                                title="Agora Profile"
                                            >
                                                Agora
                                            </a>
                                        )}
                                        {user.delegationUrl && !user.scrollDelegateLink && !user.agoraLink && (
                                            <a
                                                href={user.delegationUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-primary text-xs hover:underline"
                                                title="Delegate"
                                            >
                                                Delegate
                                            </a>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                <span className={`text-xs font-medium ${user.hasPublished ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
                                    {user.hasPublished ? 'Published' : 'Pending'}
                                </span>
                            </div>
                        </div>
                    ))}
                    {!isUsersLoading && (!sortedDelegates || sortedDelegates.length === 0) && (
                        <div className="p-4 bg-muted/30 border rounded-lg text-center">
                            <p className="text-sm text-muted-foreground">
                                No delegates found in this space
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    return (
        <SpaceLayout
            space={space}
            header={headerContent}
            rightSidebarContent={rightSidebarContent}
            showUserProfilePreview={true}
            isHomePage={false}
        >
            <div className="bg-background border rounded-lg shadow-sm p-6">
                {/* Topic Actions */}
                <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-3">
                    {hasCurrentUserRationale && (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 rounded-lg text-sm font-medium">
                            <Check className="w-4 h-4" />
                            <span>You already published a rationale for this topic</span>
                        </div>
                    )}
                    <div className="flex items-center gap-3 ml-auto">
                        <Link href={`/s/${space}/topics`}>
                            <Button variant="outline" size="sm" className="inline-flex items-center gap-2">
                                <LayoutGrid className="w-4 h-4" />
                                <span>All Topics</span>
                            </Button>
                        </Link>
                        {topic.discourseUrl && (
                            <a
                                href={topic.discourseUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/30 dark:hover:bg-blue-950/50 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-200 rounded-lg text-sm font-medium transition-colors"
                            >
                                <ExternalLink className="w-4 h-4" />
                                <span>View Forum Discussion</span>
                            </a>
                        )}
                    </div>
                </div>

                {/* Global Graph Preview */}
                <div className="mb-6">
                    <div className="border rounded-lg overflow-hidden">
                        <div className="flex items-center justify-between p-4 border-b bg-muted/20">
                            <div>
                                <h2 className="font-semibold">Global Graph</h2>
                                <p className="text-sm text-muted-foreground">
                                    {viewpoints.length} rationales connected
                                </p>
                            </div>
                            <Link href={`/s/${space}/topic/${encodeId(topic.id)}/graph`}>
                                <Button
                                    variant="default"
                                    size="sm"
                                    disabled={isGlobalGraphLoading}
                                    onClick={() => setIsGlobalGraphLoading(true)}
                                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
                                >
                                    {isGlobalGraphLoading ? (
                                        <>
                                            Opening...
                                        </>
                                    ) : (
                                        <>
                                            <ExternalLink className="size-4" />
                                            Open Graph
                                        </>
                                    )}
                                </Button>
                            </Link>
                        </div>
                        <Link href={`/s/${space}/topic/${encodeId(topic.id)}/graph`}>
                            <div
                                className="relative h-32 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-950/50 dark:to-indigo-950/50 cursor-pointer hover:from-blue-100 hover:to-indigo-200 dark:hover:from-blue-900/50 dark:hover:to-indigo-900/50 transition-colors flex items-center justify-center overflow-hidden"
                                onClick={() => setIsGlobalGraphLoading(true)}
                            >
                                {isGlobalGraphLoading && (
                                    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-10">
                                        <Loader className="w-8 h-8 text-primary" />
                                    </div>
                                )}
                                <div className="text-center text-muted-foreground">
                                    <LayoutGrid className="size-8 mx-auto mb-2" />
                                    <p className="text-sm">See how rationales in {topic.name} interact with each other</p>
                                </div>
                            </div>
                        </Link>
                    </div>
                </div>

                {/* Consilience Generation Section */}
                {canGenerateJointProposal && (
                    <div className="mb-6">
                        <div className="border rounded-lg p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30">
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <h2 className="text-lg font-semibold mb-2 text-blue-900 dark:text-blue-100 flex items-center gap-2">
                                        <Users className="w-5 h-5" />
                                        Generate Proposal
                                    </h2>
                                    <p className="text-blue-700 dark:text-blue-200 text-sm mb-4">
                                        Create a synthesis proposal by combining two delegate perspectives with the original discourse content.
                                        Shows what changed and why through interactive diff review.
                                    </p>
                                    <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-300 mb-4">
                                        <span>{viewpoints.length} rationale{viewpoints.length !== 1 ? 's' : ''} available</span>
                                        {topic.discourseUrl && (
                                            <span>• Has discourse link</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <Button
                                onClick={() => {
                                    setIsGeneratingProposal(true);
                                    router.push(`/s/${space}/consilience?topicId=${encodeId(topic.id)}`);
                                }}
                                disabled={isGeneratingProposal}
                                className="bg-blue-600 hover:bg-blue-700 text-white font-medium"
                            >
                                {isGeneratingProposal ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                                        Loading...
                                    </>
                                ) : (
                                    <>
                                        <Users className="w-4 h-4 mr-2" />
                                        Generate Proposal
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                )}

                {/* Create Rationale Section */}
                {!hasCurrentUserRationale && privyUser && (
                    <div className="mb-6">
                        {isPermissionLoading ? (
                            <div className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-6 text-center">
                                <Loader className="h-5 w-5 mx-auto mb-2" />
                                <p className="text-sm text-muted-foreground">Checking permissions...</p>
                            </div>
                        ) : permissionData?.canCreate ? (
                            <div className="border-2 border-dashed border-blue-300 dark:border-blue-600 rounded-lg p-6 text-left bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30">
                                <h2 className="text-lg font-semibold mb-2 text-blue-900 dark:text-blue-100">Create Your Rationale</h2>
                                <p className="text-blue-700 dark:text-blue-200 text-sm mb-4">
                                    Share your perspective on {topic.name}. Build connected arguments with points and evidence.
                                </p>
                                <Link href={`/s/${space}/rationale/new?topicId=${encodeId(topic.id)}`}>
                                    <Button
                                        variant="default"
                                        size="lg"
                                        className="w-full sm:w-auto bg-blue-500 hover:bg-blue-600"
                                    >
                                        Create Rationale for {topic.name}
                                    </Button>
                                </Link>
                            </div>
                        ) : permissionData?.isRestricted ? (
                            <Alert className="border-2 border-dashed border-amber-300 dark:border-amber-600 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30">
                                <Lock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                                <AlertDescription className="text-amber-800 dark:text-amber-200">
                                    <div className="space-y-2">
                                        <p className="font-semibold">Rationale Creation Restricted</p>
                                        <p className="text-sm">
                                            This topic has restricted rationale creation. You don&apos;t have permission to create rationales for &quot;{topic.name}&quot;.
                                            Contact a space administrator if you believe this is an error.
                                        </p>
                                    </div>
                                </AlertDescription>
                            </Alert>
                        ) : (
                            <Alert className="border-2 border-dashed border-blue-300 dark:border-blue-600 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30">
                                <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                <AlertDescription className="text-blue-800 dark:text-blue-200">
                                    <div className="space-y-2">
                                        <p className="font-semibold">Ready to Share Your Perspective?</p>
                                        <p className="text-sm mb-3">
                                            Create a rationale to share your thoughts on {topic.name}. Build connected arguments with points and evidence.
                                        </p>
                                        <Link href={`/s/${space}/rationale/new?topicId=${encodeId(topic.id)}`}>
                                            <Button
                                                variant="default"
                                                size="lg"
                                                className="w-full sm:w-auto bg-blue-500 hover:bg-blue-600"
                                            >
                                                Create Rationale for {topic.name}
                                            </Button>
                                        </Link>
                                    </div>
                                </AlertDescription>
                            </Alert>
                        )}
                    </div>
                )}

                {/* Sort Controls */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6 pb-4 border-b border-border">
                    <h2 className="text-lg font-semibold">Rationales ({viewpoints.length})</h2>
                    <div className="flex items-center gap-3">
                        <span className="font-medium text-sm">Sort by:</span>
                        <Select defaultValue="recent" onValueChange={(value) => setSortKey(value as SortKey)}>
                            <SelectTrigger className="w-36">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="recent">Recent</SelectItem>
                                <SelectItem value="author">Alphabetic</SelectItem>
                                <SelectItem value="cred">Cred</SelectItem>
                                <SelectItem value="favor">Favor</SelectItem>
                                <SelectItem value="views">Views</SelectItem>
                                <SelectItem value="copies">Copies</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button variant="outline" size="sm" onClick={() => setSortDirection(d => d === 'desc' ? 'asc' : 'desc')}>
                            {sortDirection === 'desc' ? '↓' : '↑'}
                        </Button>
                    </div>
                </div>

                {/* Rationales List */}
                <div className="space-y-3">
                    {sorted.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <p className="text-lg mb-2">No rationales yet</p>
                            <p className="text-sm">Be the first to create a rationale for this topic!</p>
                        </div>
                    ) : (
                        sorted.map((vp) => (
                            <ViewpointCardWrapper
                                key={vp.id}
                                id={vp.id}
                                title={vp.title}
                                description={vp.description}
                                authorId={vp.authorId}
                                author={vp.authorUsername}
                                createdAt={new Date(vp.createdAt)}
                                space={space}
                                statistics={vp.statistics}
                                topic={topic.name}
                                topicId={topic.id}
                                loadingCardId={loadingCardId}
                                handleCardClick={handleCardClick}
                            />
                        ))
                    )}
                </div>
            </div>
        </SpaceLayout>
    );
}