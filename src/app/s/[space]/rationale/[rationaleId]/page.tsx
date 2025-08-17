"use client";

import { viewpointGraphAtom } from "@/atoms/viewpointAtoms";
import { canvasEnabledAtom } from "@/atoms/canvasEnabledAtom";
import { feedEnabledAtom } from "@/atoms/feedEnabledAtom";
import { hoveredPointIdAtom } from "@/atoms/hoveredPointIdAtom";
import { AppNode } from "@/components/graph/nodes/AppNode";
import {
    OriginalPosterProvider,
} from "@/components/contexts/OriginalPosterContext";
import { NegateDialog } from "@/components/dialogs/NegateDialog";
import { Dynamic } from "@/components/utils/Dynamic";
import { useBasePath } from "@/hooks/utils/useBasePath";
import { cn } from "@/lib/utils/cn";
import { useSpace } from "@/queries/space/useSpace";
import { useUser } from "@/queries/users/useUser";
import { ReactFlowProvider, useReactFlow, } from "@xyflow/react";
import { useAtom, useSetAtom } from "jotai";
import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter, notFound, useSearchParams, useParams } from "next/navigation";
import Link from "next/link";
import { useTopics } from "@/queries/topics/useTopics";
import EnhancedRationalePointsList from "@/components/rationale/EnhancedRationalePointsList";
import ExistingRationaleHeader from "@/components/rationale/ExistingRationaleHeader";
import { useViewpoint } from "@/queries/viewpoints/useViewpoint";
import { Loader } from "@/components/ui/loader";
import RationaleMetaForm from "@/components/rationale/RationaleMetaForm";
import RationaleGraph from "@/components/rationale/RationaleGraph";
import { copyViewpointAndNavigate } from "@/lib/negation-game/copyViewpoint";
import { useCopyUrl } from "@/hooks/viewpoints/useCopyUrl";
import { useCopyConfirm } from "@/hooks/viewpoints/useCopyConfirm";
import { useShareLink } from "@/hooks/viewpoints/useShareLink";
import { ViewpointStatsBar } from "@/components/rationale/ViewpointStatsBar";
import { UsernameDisplay } from "@/components/ui/UsernameDisplay";
import { DeltaComparisonWidget } from "@/components/delta/DeltaComparisonWidget";
import useSaveViewpoint, { UseSaveViewpointParams } from '@/hooks/viewpoints/useSaveViewpoint';
import UnsavedChangesDialog from '@/components/dialogs/UnsavedChangesDialog';
import { useConfirmDiscard } from "@/hooks/graph/useConfirmDiscard";
import { useQueryClient } from '@tanstack/react-query';
import { PublishAcknowledgementDialog } from "@/components/dialogs/PublishAcknowledgementDialog";
import { useUserViewpoints } from "@/queries/users/useUserViewpoints";
import type { RationaleRank } from "@/components/ui/ProfileBadge";
import type { ViewpointGraph } from "@/atoms/viewpointAtoms";
import MobileSaveFooter from '@/components/rationale/MobileSaveFooter';
import PointsFeedContainer from "@/components/rationale/PointsFeedContainer";
import useIsMobile from "@/hooks/ui/useIsMobile";

function CopiedFromLink({ sourceId }: { sourceId: string }) {
    const { data: sourceViewpoint, isLoading } = useViewpoint(sourceId);
    const basePath = useBasePath();

    if (isLoading) return <div className="h-4 w-32 bg-muted animate-pulse rounded" />;
    if (!sourceViewpoint) return null;

    const linkPath = `${basePath}/rationale/${sourceId}`;

    return (
        <Link href={linkPath} className="text-xs text-muted-foreground hover:text-primary transition-colors">
            Copied from: <span className="font-medium">{sourceViewpoint.title || 'Untitled Rationale'}</span>
            {sourceViewpoint.author && (
                <span className="text-muted-foreground"> - {sourceViewpoint.author}</span>
            )}
        </Link>
    );
}

function ViewpointPageContent({ viewpointId, spaceSlug }: { viewpointId: string; spaceSlug: string }) {
    const searchParams = useSearchParams();
    const justPublished = searchParams.get('published') === 'true';
    const embedParam = searchParams.get('embed');
    const isEmbedMode = embedParam === 'mobile' || embedParam === 'embed';
    const isMobileEmbed = embedParam === 'mobile';
    const isEmbedEmbed = embedParam === 'embed';
    const isDesktopEmbed = embedParam === 'desktop';

    // Send height updates to parent when in embed mode
    useEffect(() => {
        if (isEmbedMode || isDesktopEmbed) {
            const sendHeight = () => {
                const height = document.documentElement.scrollHeight;
                console.log('Rationale page sending height:', height);
                window.parent.postMessage({
                    source: 'negation-game-rationale',
                    type: 'resize',
                    height: height
                }, '*');
            };

            // Send height whenever it might change
            const timer = setTimeout(() => {
                console.log('Initial height calculation for embed mode');
                sendHeight();
            }, 1000);

            // Send height on resize
            const resizeObserver = new ResizeObserver(() => {
                console.log('ResizeObserver triggered');
                setTimeout(sendHeight, 100); // Small delay for DOM updates
            });
            resizeObserver.observe(document.body);

            return () => {
                clearTimeout(timer);
                resizeObserver.disconnect();
            };
        }
    }, [isEmbedMode, isDesktopEmbed]);

    const [showPublishDialog, setShowPublishDialog] = useState(justPublished);
    const { data: currentUser } = useUser();
    const { data: currentUserViewpoints } = useUserViewpoints(currentUser?.username);
    const rationaleCount = currentUserViewpoints?.length || 0;
    const thresholds: RationaleRank[] = [1, 5, 10, 25, 50, 100];
    const newBadgeThreshold = thresholds.find((t) => t === rationaleCount);

    useEffect(() => {
        if (justPublished) {
            setShowPublishDialog(true);
            const newUrl = window.location.pathname;
            window.history.replaceState({ ...window.history.state, as: newUrl, url: newUrl }, '', newUrl);
        }
    }, [justPublished]);

    const queryClient = useQueryClient();
    const router = useRouter();
    const basePath = useBasePath();
    const space = useSpace();
    const [canvasEnabled, setCanvasEnabled] = useAtom(canvasEnabledAtom);

    useEffect(() => {
        if (isEmbedMode || isDesktopEmbed) {
            console.log('Canvas state changed in embed mode:', canvasEnabled);
            const timer = setTimeout(() => {
                const height = document.documentElement.scrollHeight;
                console.log('Sending height after canvas toggle:', height);
                window.parent.postMessage({
                    source: 'negation-game-rationale',
                    type: 'resize',
                    height: height
                }, '*');
            }, 500); // Longer delay for graph rendering

            return () => clearTimeout(timer);
        }
    }, [canvasEnabled, isEmbedMode, isDesktopEmbed]);

    // Enable canvas by default in embed mode (mobile view shows graph)
    useEffect(() => {
        if (isEmbedMode || isDesktopEmbed) {
            setCanvasEnabled(true);
        }
    }, [isEmbedMode, isDesktopEmbed, setCanvasEnabled]);
    const [feedEnabled, setFeedEnabled] = useAtom(feedEnabledAtom);
    useEffect(() => {
        setFeedEnabled(false);
    }, [setFeedEnabled]);

    const showFeed = feedEnabled && !isEmbedMode && !isDesktopEmbed; // Disable feed in embed mode
    const isMobile = useIsMobile(768) || isEmbedMode; // Force mobile layout in embed mode (but not desktop embed)

    const { isCopyingUrl, handleCopyUrl } = useCopyUrl();
    const { data: viewpoint } = useViewpoint(viewpointId);

    const [editableTitle, setEditableTitle] = useState("");
    const [editableDescription, setEditableDescription] = useState("");
    const [editableTopic, setEditableTopic] = useState<string>("");
    const [isTitleEditing, setIsTitleEditing] = useState(false);
    const [isDescriptionEditing, setIsDescriptionEditing] = useState(false);
    const [isTopicEditing, setIsTopicEditing] = useState(false);

    const [isGraphModified, setIsGraphModified] = useState(false);

    const { data: user } = useUser();
    const isOwner = viewpoint && user ? user.id === viewpoint.createdBy : false;
    const canEdit = isOwner && !isEmbedMode && !isDesktopEmbed; // Disable editing in embed mode
    const { isSharing, selectedPointIds, toggleSharingMode, handleGenerateAndCopyShareLink } = useShareLink(user?.username);

    const reactFlow = useReactFlow<AppNode>();
    const originalGraph = useMemo(() => viewpoint?.graph, [viewpoint]);
    const [localGraph, setLocalGraph] = useState(originalGraph);
    // Derive points from the localGraph so new points appear immediately in the sidebar
    const points = (localGraph?.nodes ?? [])
        .filter((node: any) => node.type === 'point')
        .map((node: any) => ({
            pointId: node.data.pointId,
            parentId: node.data.parentId,
            initialPointData: node.data.initialPointData,
        }));

    const { isCopying, isPageCopyConfirmOpen, setIsPageCopyConfirmOpen, handleCopy } = useCopyConfirm(
        async (publishCopy: boolean = true) => {
            let currentGraph;
            if (reactFlow) {
                currentGraph = { nodes: reactFlow.getNodes(), edges: reactFlow.getEdges() };
            } else {
                currentGraph = localGraph!;
            }

            // Use viewpointId from URL instead of waiting for viewpoint data to load
            // This allows copying even before full data loads
            const sourceId = viewpointId;
            const copyTitle = viewpoint?.title || editableTitle || "Untitled Rationale";
            const copyDescription = viewpoint?.description || editableDescription || "";
            const copyTopic = viewpoint?.topic ?? editableTopic;
            const copyTopicId = viewpoint?.topicId ?? editableTopicId;

            await copyViewpointAndNavigate(
                currentGraph,
                copyTitle,
                copyDescription,
                sourceId,
                publishCopy,
                copyTopic,
                copyTopicId
            );
        }
    );

    const spaceId = space?.data?.id!;
    const { data: topicsData } = useTopics(spaceId);
    // Compute numeric topicId early for callbacks
    const topicsList = (topicsData ?? []) as { id: number; name: string }[];
    const selectedTopicObj = topicsList.find((t) => t.name === editableTopic);
    const editableTopicId = selectedTopicObj?.id;

    const setGraph = useSetAtom(viewpointGraphAtom);

    const [hoveredPointId, setHoveredPointId] = useAtom(hoveredPointIdAtom);

    // When global graph (from the loaded viewpoint) updates, sync the localGraph
    useEffect(() => {
        if (originalGraph) {
            setLocalGraph(originalGraph);
        }
    }, [originalGraph]);

    useEffect(() => {
        if (viewpoint) {
            setEditableTitle(viewpoint.title);
            setEditableDescription(viewpoint.description);
            setEditableTopic(viewpoint.topic ?? "");
        }
    }, [viewpoint]);

    const [isContentModified, setIsContentModified] = useState(false);

    const originalTitleRef = useRef<string>("");
    const originalDescriptionRef = useRef<string>("");
    const originalTopicRef = useRef<string>("");

    useEffect(() => {
        if (viewpoint) {
            originalTitleRef.current = viewpoint.title;
            originalDescriptionRef.current = viewpoint.description;
            originalTopicRef.current = viewpoint.topic ?? "";
        }
    }, [viewpoint?.id, viewpoint]);

    const handleEditingBlur = useCallback(() => {
        const titleChanged = originalTitleRef.current !== editableTitle;
        const descriptionChanged = originalDescriptionRef.current !== editableDescription;
        const topicChanged = originalTopicRef.current !== editableTopic;
        if (titleChanged || descriptionChanged || topicChanged) {
            setIsContentModified(true);
        }

        setIsTitleEditing(false);
        setIsDescriptionEditing(false);
        setIsTopicEditing(false);
    }, [editableTitle, editableDescription, editableTopic, setIsContentModified]);

    const handleTitleEdit = useCallback(() => {
        setIsTitleEditing(true);
    }, []);

    const handleDescriptionEdit = useCallback(() => {
        setIsDescriptionEditing(true);
    }, []);

    // Reset content modifications back to the original fetched data
    const resetContentModifications = useCallback(() => {
        if (viewpoint) {
            setEditableTitle(originalTitleRef.current);
            setEditableDescription(originalDescriptionRef.current);
            setEditableTopic(originalTopicRef.current);

            setIsContentModified(false);

            const originalViewpoint = {
                ...viewpoint,
                title: originalTitleRef.current,
                description: originalDescriptionRef.current,
                topic: originalTopicRef.current,
                _pendingChanges: false,
                _reverted: Date.now(),
            };

            queryClient.setQueryData<typeof viewpoint>(["viewpoint", viewpoint.id], originalViewpoint);

            if (originalGraph) {
                setLocalGraph(originalGraph);
            }
        }
    }, [viewpoint, queryClient, originalGraph, setLocalGraph]);

    // Hook for saving existing rationale; on save, update refs so future discards use saved state
    const { onSaveChanges: saveChanges, isSaving } = useSaveViewpoint({
        viewpointId,
        createdBy: viewpoint?.createdBy || '',
        isOwner,
        basePath,
        getCurrentTitle: () => editableTitle,
        getCurrentDescription: () => editableDescription,
        getCurrentTopic: () => editableTopic,
        getCurrentTopicId: () => editableTopicId,
        originalGraph: originalGraph!,
    } as UseSaveViewpointParams);

    const commitSaveChanges = useCallback(async (graph: ViewpointGraph) => {
        const result = await saveChanges(graph);
        if (result) {
            // Set refs to current values so discard resets to this state
            originalTitleRef.current = editableTitle;
            originalDescriptionRef.current = editableDescription;
            originalTopicRef.current = editableTopic;
            setIsContentModified(false);
        }
        return result;
    }, [saveChanges, editableTitle, editableDescription, editableTopic]);

    const { isDiscardDialogOpen, setIsDiscardDialogOpen, handleBackClick, handleDiscard } = useConfirmDiscard(
        basePath,
        isGraphModified,
        isContentModified,
        resetContentModifications
    );

    if (!viewpoint)
        return (
            <div className="flex-grow flex items-center justify-center h-[calc(100vh-var(--header-height))]">
                <Loader className="size-12" />
            </div>
        );

    // Use the most up-to-date data from query cache
    const latestViewpoint = queryClient.getQueryData<typeof viewpoint>(["viewpoint", viewpoint.id]) || viewpoint;
    const { title, author, statistics, createdBy } = latestViewpoint;

    return (
        <>
            {!isEmbedMode && !isDesktopEmbed && (
                <PublishAcknowledgementDialog
                    open={showPublishDialog}
                    onOpenChange={setShowPublishDialog}
                    badgeThreshold={newBadgeThreshold}
                />
            )}
            <main className={cn(
                "relative flex-grow bg-background h-full overflow-hidden",
                (isEmbedMode || isDesktopEmbed)
                    ? "flex flex-col"
                    : "md:grid h-[calc(100vh-var(--header-height))]",
                !isEmbedMode && !isDesktopEmbed && showFeed
                    ? "md:grid-cols-[0_minmax(200px,400px)_1fr_minmax(200px,400px)]"
                    : (!isEmbedMode && !isDesktopEmbed) && "md:grid-cols-[0_minmax(200px,400px)_1fr]"
            )}>
                {!isEmbedMode && !isDesktopEmbed && <div className="hidden md:block"></div>}
                <div className={cn(
                    "flex flex-col h-full min-h-0 overflow-hidden",
                    !isEmbedMode && !isDesktopEmbed && "md:col-start-2 border-x",
                    (isEmbedMode || isDesktopEmbed) && "border-0 max-w-full"
                )}>
                    {!isEmbedMode && !isDesktopEmbed && (
                        <ExistingRationaleHeader
                            isSharing={isSharing}
                            isCopying={isCopying}
                            isCopyingUrl={isCopyingUrl}
                            toggleSharingMode={toggleSharingMode}
                            handleCopyUrl={handleCopyUrl}
                            isPageCopyConfirmOpen={isPageCopyConfirmOpen}
                            setIsPageCopyConfirmOpen={setIsPageCopyConfirmOpen}
                            handleCopy={handleCopy}
                            handleBackClick={handleBackClick}
                            canvasEnabled={canvasEnabled}
                            toggleCanvas={() => setCanvasEnabled(!canvasEnabled)}
                            isOwner={isOwner}
                        />
                    )}

                    {(isEmbedMode || isDesktopEmbed) && (
                        <div className="flex justify-between items-center p-3 border-b bg-gray-50">
                            <h3 className="text-sm font-medium text-gray-700">Rationale View</h3>
                            <button
                                onClick={() => setCanvasEnabled(!canvasEnabled)}
                                className={cn(
                                    "px-3 py-1 text-xs rounded-md transition-colors",
                                    canvasEnabled
                                        ? "bg-blue-100 text-blue-700 border border-blue-200"
                                        : "bg-gray-100 text-gray-600 border border-gray-200"
                                )}
                            >
                                {canvasEnabled ? "📊 Graph" : "📄 Text"}
                            </button>
                        </div>
                    )}

                    {/* --- Scrollable Content START*/}
                    <div className={cn(
                        "flex flex-col flex-grow min-h-0 overflow-y-auto",
                        (isEmbedMode || isDesktopEmbed) ? "pb-4 px-4" : "pb-10",
                        !isEmbedMode && !isDesktopEmbed && showFeed && isMobile && "hidden",
                        !isEmbedMode && !isDesktopEmbed && canvasEnabled && "hidden md:block",
                        !isEmbedMode && !isDesktopEmbed && !canvasEnabled && (isGraphModified || isContentModified) && isOwner && "pb-24 md:pb-10",
                        !isEmbedMode && !isDesktopEmbed && isSharing && "pb-24 md:pb-24",
                        (isEmbedMode || isDesktopEmbed) && canvasEnabled && "hidden",
                        (isEmbedMode || isDesktopEmbed) && !canvasEnabled && "flex flex-col"
                    )}>
                        {/* Content: Title, Meta, Description, Points */}
                        <RationaleMetaForm
                            title={editableTitle}
                            onTitleChange={setEditableTitle}
                            isTitleEditing={isTitleEditing}
                            onTitleEdit={handleTitleEdit}
                            onTitleBlur={handleEditingBlur}
                            description={editableDescription}
                            onDescriptionChange={setEditableDescription}
                            isDescriptionEditing={isDescriptionEditing}
                            onDescriptionEdit={handleDescriptionEdit}
                            onDescriptionBlur={handleEditingBlur}
                            topic={editableTopic}
                            onTopicChange={(val) => { /* topic editing disabled */ }}
                            topics={topicsData || []}
                            currentSpace={space?.data?.id!}
                            isNew={false}
                            canEdit={canEdit}
                            showEditButtons={canEdit}
                            allowTitleEdit={false}
                            hideTopicSelector
                            showTopicHeader
                            spaceSlug={spaceSlug}
                            enableTopicNavigation={true}
                            titleModified={isContentModified}
                            descriptionModified={isContentModified}
                            renderCopiedFromLink={latestViewpoint?.copiedFromId ? <CopiedFromLink sourceId={latestViewpoint.copiedFromId} /> : null}
                            renderHeader={
                                <>
                                    <div className="text-sm text-muted-foreground mb-1">
                                        By{" "}
                                        <UsernameDisplay username={author} userId={createdBy} className="font-bold text-yellow-500" />
                                    </div>
                                    <ViewpointStatsBar
                                        views={statistics.views}
                                        copies={statistics.copies}
                                        totalCred={statistics.totalCred}
                                        averageFavor={statistics.averageFavor}
                                        className="mt-1"
                                    />
                                    {/* Delta Comparison Widget */}
                                    <div className="mt-3">
                                        <DeltaComparisonWidget
                                            comparison={{ type: "rationale", rationaleId: viewpointId }}
                                            title="Rationale Alignment Discovery"
                                            description="Find users who agree or disagree with you on this rationale's topic clusters"
                                            currentUserId={user?.id}
                                        />
                                    </div>
                                </>
                            }
                        />

                        <EnhancedRationalePointsList
                            points={points}
                            hoveredPointId={hoveredPointId}
                            selectedPointIds={selectedPointIds}
                            editMode={true}
                            isSharing={isSharing}
                            containerClassName="relative flex flex-col flex-1 min-h-0 md:pr-2"
                        />
                    </div>
                    {/* --- Scrollable Content END --- */}
                    {!isEmbedMode && !isDesktopEmbed && (!showFeed || !isMobile) ? (
                        <MobileSaveFooter
                            isOwner={canEdit}
                            isGraphModified={isGraphModified}
                            isContentModified={isContentModified}
                            isSaving={isSaving}
                            commitSaveChanges={() => commitSaveChanges(localGraph!)}
                            resetContentModifications={resetContentModifications}
                            clearGraphModifications={() => setIsGraphModified(false)}
                            canvasEnabled={canvasEnabled}
                        />
                    ) : null}
                </div>

                {/* Embed Mode Graph View */}
                {(isEmbedMode || isDesktopEmbed) && canvasEnabled && (
                    <div className="flex-grow h-full min-h-[600px] bg-white">
                        <Dynamic>
                            <RationaleGraph
                                graph={localGraph!}
                                setGraph={setGraph}
                                setLocalGraph={setLocalGraph}
                                statement={title}
                                description={editableDescription}
                                canModify={canEdit}
                                canvasEnabled={canvasEnabled}
                                className="w-full h-full min-h-[600px] relative"
                                isSaving={isSaving}
                                isContentModified={isContentModified}
                                isSharing={isSharing}
                                toggleSharingMode={toggleSharingMode}
                                handleGenerateAndCopyShareLink={handleGenerateAndCopyShareLink}
                                originalGraphData={originalGraph!}
                                onSave={commitSaveChanges}
                                onResetContent={resetContentModifications}
                                onModifiedChange={setIsGraphModified}
                            />
                        </Dynamic>
                    </div>
                )}

                {/* Column 3 (Graph View) using shared RationaleGraph - Hidden in embed mode */}
                {!isEmbedMode && !isDesktopEmbed && (
                    <Dynamic>
                        <RationaleGraph
                            graph={localGraph!}
                            setGraph={setGraph}
                            setLocalGraph={setLocalGraph}
                            statement={title}
                            description={editableDescription}
                            canModify={canEdit}
                            canvasEnabled={canvasEnabled}
                            className={cn(
                                "!fixed md:!sticky inset-0 top-[var(--header-height)] md:inset-[reset] !h-[calc(100vh-var(--header-height))] md:top-[var(--header-height)] md:col-start-3 md:z-auto",
                                !canvasEnabled && "hidden md:block",
                                showFeed && isMobile && "hidden"
                            )}
                            isSaving={isSaving}
                            isContentModified={isContentModified}
                            isSharing={isSharing}
                            toggleSharingMode={toggleSharingMode}
                            handleGenerateAndCopyShareLink={handleGenerateAndCopyShareLink}
                            originalGraphData={originalGraph!}
                            onSave={commitSaveChanges}
                            onResetContent={resetContentModifications}
                            onModifiedChange={setIsGraphModified}
                        />
                    </Dynamic>
                )}

                {/* Column 4 (Points Feed) - Hidden in embed mode */}
                {!isEmbedMode && !isDesktopEmbed && <PointsFeedContainer />}

                {!isEmbedMode && !isDesktopEmbed && <NegateDialog />}

                {!isEmbedMode && !isDesktopEmbed && (
                    <UnsavedChangesDialog
                        open={isDiscardDialogOpen}
                        onOpenChange={setIsDiscardDialogOpen}
                        onDiscard={handleDiscard}
                        onCancel={() => setIsDiscardDialogOpen(false)}
                    />
                )}
            </main>
        </>
    );
}

export default function NewViewpointPage() {
    const { rationaleId } = useParams<{ rationaleId: string; space: string }>();
    return <ViewpointPageWrapper rationaleId={rationaleId!} />;
}

function ViewpointPageWrapper({ rationaleId }: { rationaleId: string }) {
    const { rationaleId: routeRationaleId, space: spaceSlug } = useParams<{ rationaleId: string; space: string }>();
    const { data: viewpoint, isLoading, isError } = useViewpoint(rationaleId);

    if (isLoading) {
        return (
            <div className="flex-grow flex items-center justify-center h-[calc(100vh-var(--header-height))]">
                <Loader className="size-12" />
            </div>
        );
    }
    if (!viewpoint || isError) {
        notFound();
        return (
            <div className="flex-grow flex items-center justify-center h-[calc(100vh-var(--header-height))]">
                <Loader className="size-12" />
            </div>
        );
    }

    const creatorId = viewpoint?.createdBy;

    return (
        <OriginalPosterProvider originalPosterId={creatorId}>
            <ReactFlowProvider>
                <ViewpointPageContent viewpointId={rationaleId} spaceSlug={spaceSlug} />
            </ReactFlowProvider>
        </OriginalPosterProvider>
    );
}
