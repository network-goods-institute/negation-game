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
import RationalePointsList from "@/components/rationale/RationalePointsList";
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
        </Link>
    );
}

function ViewpointPageContent({ viewpointId, spaceSlug }: { viewpointId: string; spaceSlug: string }) {
    const searchParams = useSearchParams();
    const justPublished = searchParams.get('published') === 'true';
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
    const [feedEnabled] = useAtom(feedEnabledAtom);
    const showFeed = feedEnabled;
    const isMobile = useIsMobile(640);
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
    const isOwner = viewpoint ? user?.id === viewpoint.createdBy : false;
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
            await copyViewpointAndNavigate(
                currentGraph,
                editableTitle,
                editableDescription,
                viewpoint!.id,
                publishCopy
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
        title: editableTitle,
        description: editableDescription,
        topic: editableTopic,
        topicId: editableTopicId,
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
            <div className="flex-grow flex items-center justify-center">
                <Loader className="size-12" />
            </div>
        );

    // Use the most up-to-date data from query cache
    const latestViewpoint = queryClient.getQueryData<typeof viewpoint>(["viewpoint", viewpoint.id]) || viewpoint;
    const { title, author, statistics, createdBy } = latestViewpoint;

    return (
        <>
            <PublishAcknowledgementDialog
                open={showPublishDialog}
                onOpenChange={setShowPublishDialog}
                badgeThreshold={newBadgeThreshold}
            />
            <main className={cn(
                "relative flex-grow bg-background h-full overflow-hidden",
                "md:grid",
                showFeed
                    ? "md:grid-cols-[0_minmax(200px,400px)_1fr_minmax(200px,400px)]"
                    : "md:grid-cols-[0_minmax(200px,400px)_1fr]"
            )}>
                <div className="hidden md:block"></div>
                <div className="flex flex-col h-full md:col-start-2 border-x overflow-hidden">
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
                    />
                    {/* --- Scrollable Content START*/}
                    <div className={cn(
                        "flex-grow overflow-y-auto pb-10",
                        showFeed && isMobile && "hidden",
                        canvasEnabled && "hidden md:block",
                        !canvasEnabled && (isGraphModified || isContentModified) && isOwner && "pb-24 md:pb-10",
                        isSharing && "pb-24 md:pb-24"
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
                            onTopicChange={(val) => { setEditableTopic(val); setIsContentModified(true); setIsTopicEditing(false); }}
                            topics={topicsData || []}
                            currentSpace={space?.data?.id!}
                            isNew={false}
                            canEdit={true}
                            showEditButtons={true}
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
                                </>
                            }
                        />

                        {/* Points List */}
                        <RationalePointsList
                            points={points}
                            hoveredPointId={hoveredPointId}
                            selectedPointIds={selectedPointIds}
                            editMode={true}
                            isSharing={isSharing}
                            containerClassName="relative flex flex-col"
                        />
                    </div>
                    {/* --- Scrollable Content END --- */}
                    {!showFeed || !isMobile ? (
                        <MobileSaveFooter
                            isOwner={isOwner}
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

                {/* Column 3 (Graph View) using shared RationaleGraph */}
                <Dynamic>
                    <RationaleGraph
                        graph={localGraph!}
                        setGraph={setGraph}
                        setLocalGraph={setLocalGraph}
                        statement={title}
                        description={editableDescription}
                        canModify={isOwner}
                        canvasEnabled={canvasEnabled}
                        className={cn(
                            "!fixed inset-0 top-[var(--header-height)] !h-[calc(100vh-var(--header-height))]",
                            "md:!relative md:col-start-3 md:inset-[reset] md:top-[reset] md:!h-full md:!z-auto",
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

                {/* Column 4 (Points Feed) */}
                <PointsFeedContainer />

                <NegateDialog />

                <UnsavedChangesDialog
                    open={isDiscardDialogOpen}
                    onOpenChange={setIsDiscardDialogOpen}
                    onDiscard={handleDiscard}
                    onCancel={() => setIsDiscardDialogOpen(false)}
                />
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
            <div className="flex-grow flex items-center justify-center">
                <Loader className="size-12" />
            </div>
        );
    }
    if (!viewpoint || isError) {
        notFound();
        return (
            <div className="flex-grow flex items-center justify-center">
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
