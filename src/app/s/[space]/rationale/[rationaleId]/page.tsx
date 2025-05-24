"use client";

import { viewpointGraphAtom } from "@/atoms/viewpointAtoms";
import { canvasEnabledAtom } from "@/atoms/canvasEnabledAtom";
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
import React, { use, useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter, notFound } from "next/navigation";
import Link from "next/link";
import { useTopics } from "@/queries/topics/useTopics";
import { DEFAULT_SPACE } from "@/constants/config";
import RationalePointsList from "@/components/rationale/RationalePointsList";
import ExistingRationaleHeader from "@/components/rationale/ExistingRationaleHeader";
import { useViewpoint } from "@/queries/viewpoints/useViewpoint";
import { Loader } from "@/components/ui/loader";
import { EditModeProvider, useEditMode } from "@/components/contexts/EditModeContext"
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

function ViewpointPageContent({ viewpointId }: { viewpointId: string }) {
    const queryClient = useQueryClient();
    const router = useRouter();
    const basePath = useBasePath();
    const space = useSpace();
    const [canvasEnabled, setCanvasEnabled] = useAtom(canvasEnabledAtom);
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

    const points = (viewpoint?.graph.nodes ?? [])
        .filter((node: any) => node.type === 'point')
        .map((node: any) => ({
            pointId: node.data.pointId,
            parentId: node.data.parentId,
            initialPointData: node.data.initialPointData,
        }));

    const reactFlow = useReactFlow<AppNode>();

    const originalGraph = useMemo(() => viewpoint?.graph, [viewpoint]);
    const [localGraph, setLocalGraph] = useState(originalGraph);
    const { isCopying, isPageCopyConfirmOpen, setIsPageCopyConfirmOpen, handleCopy } = useCopyConfirm(async () => {
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
            viewpoint!.id
        );
    });

    const spaceId = space?.data?.id ?? DEFAULT_SPACE;
    const { data: topicsData } = useTopics(spaceId);
    // Compute numeric topicId early for callbacks
    const topicsList = (topicsData ?? []) as { id: number; name: string }[];
    const selectedTopicObj = topicsList.find((t) => t.name === editableTopic);
    const editableTopicId = selectedTopicObj?.id;

    const setGraph = useSetAtom(viewpointGraphAtom);

    const [hoveredPointId, setHoveredPointId] = useAtom(hoveredPointIdAtom);
    const editMode = useEditMode();

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

    const { onSaveChanges, isSaving: extractedSaving } = useSaveViewpoint({
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

    useEffect(() => {
        if (reactFlow && editableTitle) {
            reactFlow.setNodes((nodes: AppNode[]) => {
                return nodes.map(node => {
                    if (node.id === "statement" && node.type === "statement") {
                        return {
                            ...node,
                            data: {
                                ...node.data,
                                statement: editableTitle
                            }
                        };
                    }
                    return node;
                });
            });
        }
    }, [editableTitle, reactFlow]);

    const handleTitleEdit = useCallback(() => {
        setIsTitleEditing(true);
    }, []);

    const handleDescriptionEdit = useCallback(() => {
        setIsDescriptionEditing(true);
    }, []);

    const resetContentModifications = useCallback(() => {
        if (viewpoint) {
            setEditableTitle(originalTitleRef.current);
            setEditableDescription(originalDescriptionRef.current);
            setEditableTopic(originalTopicRef.current);

            setIsContentModified(false);

            const originalViewpoint = {
                ...viewpoint,
                // Force updated values for display using refs
                title: originalTitleRef.current,
                description: originalDescriptionRef.current,
                topic: originalTopicRef.current,
                // Remove any pending changes flag
                _pendingChanges: false,
                // Include a timestamp to ensure React detects the change
                _reverted: Date.now()
            };

            // Update the query cache with the original values
            queryClient.setQueryData<typeof viewpoint>(["viewpoint", viewpoint.id], originalViewpoint);

            // Ensure the local graph is also reset to original
            if (originalGraph) {
                setLocalGraph(originalGraph);
            }
        }
    }, [viewpoint, queryClient, originalGraph, setLocalGraph]);

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
        <EditModeProvider>
            <main className="relative flex-grow md:grid md:grid-cols-[0_minmax(200px,400px)_1fr] bg-background h-full overflow-hidden">
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
                        canvasEnabled && "hidden md:block", // Hide content on mobile when canvas active
                        // Add extra padding-bottom on mobile if canvas is OFF and changes exist
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
                            currentSpace={space?.data?.id || DEFAULT_SPACE}
                            isNew={false}
                            canEdit={true}
                            showEditButtons={true}
                            titleModified={isContentModified}
                            descriptionModified={isContentModified}
                            renderCopiedFromLink={latestViewpoint?.copiedFromId ? <CopiedFromLink sourceId={latestViewpoint.copiedFromId} /> : null}
                            renderHeader={
                                <>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-muted-foreground">By</span>
                                        <UsernameDisplay username={author} userId={createdBy} className="text-sm text-muted-foreground" />
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
                            editMode={editMode}
                            isSharing={isSharing}
                            containerClassName="relative flex flex-col"
                        />
                    </div>
                    {/* --- Scrollable Content END --- */}
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
                            !canvasEnabled && "hidden md:block"
                        )}
                        isSaving={extractedSaving}
                        isContentModified={isContentModified}
                        isSharing={isSharing}
                        toggleSharingMode={toggleSharingMode}
                        handleGenerateAndCopyShareLink={handleGenerateAndCopyShareLink}
                        originalGraphData={originalGraph!}
                        onSave={onSaveChanges}
                        onResetContent={resetContentModifications}
                    />
                </Dynamic>

                <NegateDialog />

                <UnsavedChangesDialog
                    open={isDiscardDialogOpen}
                    onOpenChange={setIsDiscardDialogOpen}
                    onDiscard={handleDiscard}
                    onCancel={() => setIsDiscardDialogOpen(false)}
                />
            </main>
        </EditModeProvider>
    );
}

export default function NewViewpointPage({
    params,
}: {
    params: Promise<{ rationaleId: string; space: string }>;
}) {
    const { rationaleId } = use(params);

    return (
        <ViewpointPageWrapper rationaleId={rationaleId} />
    );
}

function ViewpointPageWrapper({ rationaleId }: { rationaleId: string }) {
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
                <ViewpointPageContent viewpointId={rationaleId} />
            </ReactFlowProvider>
        </OriginalPosterProvider>
    );
}
