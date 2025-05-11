"use client";

import { viewpointGraphAtom, collapsedPointIdsAtom, ViewpointGraph } from "@/atoms/viewpointAtoms";
import { negatedPointIdAtom } from "@/atoms/negatedPointIdAtom";
import { canvasEnabledAtom } from "@/atoms/canvasEnabledAtom";
import { hoveredPointIdAtom } from "@/atoms/hoveredPointIdAtom";
import { AppNode } from "@/components/graph/AppNode";
import { GraphView } from "@/components/graph/GraphView";
import {
    OriginalPosterProvider,
    useOriginalPoster,
} from "@/components/graph/OriginalPosterContext";
import { NegateDialog } from "@/components/NegateDialog";
import { PointCard } from "@/components/PointCard";
import { Button } from "@/components/ui/button";
import { AuthenticatedActionButton } from "@/components/AuthenticatedActionButton";
import { Separator } from "@/components/ui/separator";
import { Dynamic } from "@/components/utils/Dynamic";
import { useBasePath } from "@/hooks/useBasePath";
import { cn } from "@/lib/cn";
import { usePointData } from "@/queries/usePointData";
import { useSpace } from "@/queries/useSpace";
import { useUser } from "@/queries/useUser";
import { ReactFlowProvider, useReactFlow, } from "@xyflow/react";
import { useAtom, useSetAtom } from "jotai";
import { NetworkIcon, CopyIcon, LinkIcon, CheckIcon, ArrowLeftIcon, Share2Icon } from "lucide-react";
import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import dynamic from 'next/dynamic';
import remarkGfm from 'remark-gfm';
import { useQueryClient } from '@tanstack/react-query';
import { useUpdateViewpointDetails } from "@/mutations/useUpdateViewpointDetails";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useFavorHistory } from "@/queries/useFavorHistory";
import { useGraphPoints } from "@/components/graph/useGraphPoints";
import { Loader } from "@/components/ui/loader";
import { useViewpoint } from "@/queries/useViewpoint";
import { useRouter, notFound, useSearchParams } from "next/navigation";
import { EditModeProvider, useEditMode } from "@/components/graph/EditModeContext";
import { ReactFlowInstance } from "@xyflow/react";
import { ViewpointIcon } from "@/components/icons/AppIcons";
import { ViewpointStatsBar } from "@/components/ViewpointStatsBar";
import { use } from "react";
import { copyViewpointAndNavigate } from "@/lib/negation-game/copyViewpoint";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { ShareRationaleDialog } from "@/components/graph/ShareRationalePointsDialog";
import { toast } from "sonner";
import { selectedPointIdsAtom } from "@/atoms/viewpointAtoms";
import { UsernameDisplay } from "@/components/UsernameDisplay";
import Link from "next/link";

const DynamicMarkdown = dynamic(() => import('react-markdown'), {
    loading: () => <div className="animate-pulse h-32 bg-muted/30 rounded-md" />,
    ssr: false
});

const markdownPlugins = [remarkGfm];

const customMarkdownComponents = {
    h1: (props: React.HTMLAttributes<HTMLHeadingElement>) => <h2 {...props} />
};

function PointCardWrapper({
    point,
    className,
    isSharing,
}: {
    point: { pointId: number; parentId?: number | string };
    className?: string;
    isSharing?: boolean;
}) {
    const { data: pointData } = usePointData(point.pointId);
    const { originalPosterId } = useOriginalPoster();
    const setNegatedPointId = useSetAtom(negatedPointIdAtom);
    const [hoveredPointId] = useAtom(hoveredPointIdAtom);

    // Get favor history data
    const { data: favorHistory } = useFavorHistory({
        pointId: point.pointId,
        timelineScale: "1W"
    });

    if (!pointData)
        return (
            <div className={cn("h-32 w-full bg-muted animate-pulse", className)} />
        );

    return (
        <PointCard
            className={cn(
                className,
                hoveredPointId === point.pointId && "shadow-[inset_0_0_0_2px_hsl(var(--primary))]"
            )}
            pointId={point.pointId}
            content={pointData.content}
            createdAt={pointData.createdAt}
            cred={pointData.cred}
            favor={pointData.favor}
            amountSupporters={pointData.amountSupporters}
            amountNegations={pointData.amountNegations}
            originalPosterId={originalPosterId}
            onNegate={() => setNegatedPointId(point.pointId)}
            inRationale={true}
            favorHistory={favorHistory}
            isSharing={isSharing}
        />
    );
}

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

// Export the component for testing
function ViewpointPageContent({ viewpointId }: { viewpointId: string }) {
    const queryClient = useQueryClient();
    const router = useRouter();
    const basePath = useBasePath();
    const space = useSpace();
    const [canvasEnabled, setCanvasEnabled] = useAtom(canvasEnabledAtom);
    const [isMobile, setIsMobile] = useState(false);
    const [isCopying, setIsCopying] = useState(false);
    const [isCopyingUrl, setIsCopyingUrl] = useState(false);
    const [isPageCopyConfirmOpen, setIsPageCopyConfirmOpen] = useState(false);

    const [editableTitle, setEditableTitle] = useState("");
    const [editableDescription, setEditableDescription] = useState("");
    const [isTitleEditing, setIsTitleEditing] = useState(false);
    const [isDescriptionEditing, setIsDescriptionEditing] = useState(false);

    const updateDetailsMutation = useUpdateViewpointDetails();

    const [isDiscardDialogOpen, setIsDiscardDialogOpen] = useState(false);
    const [isGraphModified, setIsGraphModified] = useState(false);

    const [isSharing, setIsSharing] = useState(false);
    const [selectedPointIds, setSelectedPointIds] = useAtom(selectedPointIdsAtom);
    const [isViewSharedDialogOpen, setIsViewSharedDialogOpen] = useState(false);
    const [viewSharedPoints, setViewSharedPoints] = useState<number[]>([]);
    const [sharedByUsername, setSharedByUsername] = useState<string | undefined>(undefined);

    const searchParams = useSearchParams();

    useEffect(() => {
        const checkMobile = () => {
            const isMobileView = window.innerWidth < 768; // 768px is tailwind's md breakpoint
            setIsMobile(isMobileView);
        };

        // Check initially
        checkMobile();

        // Add resize listener
        window.addEventListener('resize', checkMobile);

        // Cleanup
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const points = useGraphPoints();

    const reactFlow = useReactFlow<AppNode>();
    const { data: viewpoint } = useViewpoint(viewpointId);

    const setGraph = useSetAtom(viewpointGraphAtom);

    const setCollapsedPointIds = useSetAtom(collapsedPointIdsAtom);

    const [hoveredPointId, setHoveredPointId] = useAtom(hoveredPointIdAtom);
    const editMode = useEditMode();

    // Save global graph snapshot from viewpoint
    const originalGraph = useMemo(() => viewpoint?.graph, [viewpoint]);
    // Local graph state (always maintained since we're always in edit mode)
    const [localGraph, setLocalGraph] = useState(originalGraph);

    // When global graph (from the loaded viewpoint) updates, sync the localGraph
    useEffect(() => {
        if (originalGraph) {
            setLocalGraph(originalGraph);
        }
    }, [originalGraph]);

    const [isSaving, setIsSaving] = useState(false);

    const { data: user } = useUser();
    const isOwner = viewpoint ? user?.id === viewpoint.createdBy : false;

    useEffect(() => {
        if (viewpoint) {
            setEditableTitle(viewpoint.title);
            setEditableDescription(viewpoint.description);
        }
    }, [viewpoint]);

    const [isContentModified, setIsContentModified] = useState(false);

    const originalTitleRef = useRef<string>("");
    const originalDescriptionRef = useRef<string>("");

    useEffect(() => {
        if (viewpoint) {
            originalTitleRef.current = viewpoint.title;
            originalDescriptionRef.current = viewpoint.description;
            console.log("Stored original values from DB:", {
                title: originalTitleRef.current,
                description: originalDescriptionRef.current
            });
        }
    }, [viewpoint?.id, viewpoint]); // Only update when viewpoint ID changes

    const handleEditingBlur = useCallback(() => {
        const titleChanged = originalTitleRef.current !== editableTitle;
        const descriptionChanged = originalDescriptionRef.current !== editableDescription;

        console.log("[RationalePage] Content changed on blur:", {
            titleChanged,
            descriptionChanged,
            originalTitle: originalTitleRef.current,
            newTitle: editableTitle,
            originalDescription: originalDescriptionRef.current,
            newDescription: editableDescription,
        });

        if (titleChanged || descriptionChanged) {
            setIsContentModified(true);
        }

        // Exit edit mode
        setIsTitleEditing(false);
        setIsDescriptionEditing(false);
    }, [editableTitle, editableDescription, setIsContentModified]);

    const onSaveChanges = useCallback(async (filteredGraph: ViewpointGraph) => {
        if (!filteredGraph) {
            console.error("[RationalePage] No graph state to save");
            return false;
        }

        try {
            setIsSaving(true);

            // If the current user is not the owner (i.e. not the creator) then fork instead of trying to update directly
            if (!isOwner) {
                if (reactFlow && viewpoint) {
                    // Get the current space
                    const currentSpace = space?.data?.id || 'default';

                    // Use the filtered graph passed from GraphView
                    const currentGraph = filteredGraph;

                    // Store the viewpoint data in session storage with space information
                    const viewpointData = {
                        title: editableTitle,
                        description: editableDescription,
                        graph: currentGraph,
                        sourceSpace: currentSpace,
                    };

                    // Use sessionStorage with space-specific key to avoid conflicts
                    const storageKey = `copyingViewpoint:${currentSpace}`;
                    sessionStorage.setItem(storageKey, JSON.stringify(viewpointData));

                    // Add a small delay to ensure the loading state is visible before navigation
                    await new Promise(resolve => setTimeout(resolve, 500));

                    // Navigate to the new viewpoint page in the same space
                    router.push(`${basePath}/rationale/new`);
                    return true;
                }
            }

            if (viewpoint) {
                await updateDetailsMutation.mutateAsync({
                    id: viewpoint.id,
                    title: editableTitle,
                    description: editableDescription,
                });

                // Update local query cache with new details
                queryClient.setQueryData(["viewpoint", viewpoint.id], {
                    ...viewpoint,
                    title: editableTitle,
                    description: editableDescription,
                });

                originalTitleRef.current = editableTitle;
                originalDescriptionRef.current = editableDescription;

                // Exit any edit modes
                setIsTitleEditing(false);
                setIsDescriptionEditing(false);
            }

            if (filteredGraph && viewpoint) {
                // Update local query cache with new graph
                queryClient.setQueryData(["viewpoint", viewpoint.id], {
                    ...viewpoint,
                    title: editableTitle,
                    description: editableDescription,
                    graph: filteredGraph,
                });

                setLocalGraph(filteredGraph);
            }
            // Reset collapsed points when saving changes
            setCollapsedPointIds(new Set());

            // Reset modification flag
            setIsContentModified(false);

            return true; // Indicate successful save to allow GraphView to reset isModified
        } catch (error) {
            alert("Failed to save changes. Please try again.");
            if (originalGraph) {
                setLocalGraph(originalGraph);
                setGraph(originalGraph);
            }
            return false; // Indicate failed save to GraphView
        } finally {
            setIsSaving(false);
        }
    }, [
        reactFlow,
        originalGraph,
        viewpoint,
        queryClient,
        setGraph,
        isOwner,
        router,
        basePath,
        setCollapsedPointIds,
        setLocalGraph,
        space?.data?.id,
        editableTitle,
        editableDescription,
        updateDetailsMutation,
        setIsContentModified
    ]);

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

    const [editFlowInstance, setEditFlowInstance] = useState<ReactFlowInstance<AppNode> | null>(null);

    const handleCopy = useCallback(() => {
        if (!viewpoint) return;

        // Set copying state to true
        setIsCopying(true);

        try {
            // Get the current graph state directly from reactFlow if available
            // This ensures we capture the exact current state including any changes
            let currentGraph;
            if (reactFlow) {
                currentGraph = {
                    nodes: reactFlow.getNodes(),
                    edges: reactFlow.getEdges()
                };
            } else if (localGraph) {
                // Fallback to localGraph if reactFlow instance isn't available
                currentGraph = localGraph;
            } else {
                currentGraph = viewpoint.graph;
            }

            copyViewpointAndNavigate(
                currentGraph,
                editableTitle,
                editableDescription,
                viewpoint.id
            )
                .then(() => {
                })
                .catch(error => {
                    alert("Failed to copy rationale. Please try again.");
                    setIsCopying(false);
                });
        } catch (error) {
            alert("Failed to copy rationale. Please try again.");
            setIsCopying(false);
        }
    }, [viewpoint, reactFlow, localGraph, editableTitle, editableDescription]);

    const handleCopyUrl = useCallback(() => {
        const url = window.location.href;
        navigator.clipboard.writeText(url);

        // Show confirmation
        setIsCopyingUrl(true);

        // Reset after 2 seconds
        setTimeout(() => {
            setIsCopyingUrl(false);
        }, 2000);
    }, []);

    // Function to check if editing is allowed
    const canEdit = useCallback(() => {
        // Editing is always allowed when making a copy
        // Only current owner can edit the original
        return isOwner;
    }, [isOwner]);

    const handleTitleDoubleClick = useCallback(() => {
        if (canEdit()) {
            setIsTitleEditing(true);
        }
    }, [canEdit]);

    const handleDescriptionDoubleClick = useCallback(() => {
        if (canEdit()) {
            setIsDescriptionEditing(true);
        }
    }, [canEdit]);

    const toggleSharingMode = useCallback(() => {
        const nextIsSharing = !isSharing;
        setIsSharing(nextIsSharing);
        if (!nextIsSharing) {
            setSelectedPointIds(new Set());
        }
    }, [isSharing, setSelectedPointIds]);

    const handleGenerateAndCopyShareLink = useCallback(() => {
        if (selectedPointIds.size === 0) {
            toast.info("Select some points first to generate a share link.");
            return;
        }

        const url = new URL(window.location.href);
        // eslint-disable-next-line drizzle/enforce-delete-with-where
        url.searchParams.delete('view');
        // eslint-disable-next-line drizzle/enforce-delete-with-where
        url.searchParams.delete('points');
        // eslint-disable-next-line drizzle/enforce-delete-with-where
        url.searchParams.delete('by');
        // Add new params
        url.searchParams.set('view', 'shared');
        url.searchParams.set('points', Array.from(selectedPointIds).join(','));
        if (user?.username) {
            url.searchParams.set('by', user.username);
        }
        const urlToCopy = url.toString();

        navigator.clipboard.writeText(urlToCopy)
            .then(() => {
                toast.success(`Share link copied for ${selectedPointIds.size} point(s)!`);
                setIsSharing(false);
                setSelectedPointIds(new Set());
            })
            .catch(err => {
                console.error('Failed to copy share link: ', err);
                toast.error("Failed to copy link. Please try again.");
            });

    }, [selectedPointIds, user?.username, setSelectedPointIds]);

    useEffect(() => {
        const viewParam = searchParams?.get('view');
        const pointsParam = searchParams?.get('points');
        const byParam = searchParams?.get('by');

        if (viewParam === 'shared' && pointsParam) {
            const pointIds = pointsParam.split(',').map(Number).filter(id => !isNaN(id));
            if (pointIds.length > 0) {
                setViewSharedPoints(pointIds);
                setSharedByUsername(byParam ?? undefined);
                setIsViewSharedDialogOpen(true);
            }
        } else {
            setIsViewSharedDialogOpen(false);
        }
    }, [searchParams]);

    const resetContentModifications = useCallback(() => {
        if (viewpoint) {
            setEditableTitle(originalTitleRef.current);
            setEditableDescription(originalDescriptionRef.current);

            setIsContentModified(false);

            const originalViewpoint = {
                ...viewpoint,
                // Force updated values for display using refs
                title: originalTitleRef.current,
                description: originalDescriptionRef.current,
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

    const handleBackClick = useCallback(() => {
        if (isGraphModified || isContentModified) {
            setIsDiscardDialogOpen(true);
            return;
        }

        const targetPath = basePath && basePath.startsWith('/s/') ? basePath : '/';
        router.push(targetPath);
    }, [router, basePath, isGraphModified, isContentModified]);

    const handleDiscard = useCallback(() => {
        resetContentModifications();
        setIsDiscardDialogOpen(false);
        const targetPath = basePath && basePath.startsWith('/s/') ? basePath : '/';
        router.push(targetPath);
    }, [resetContentModifications, router, basePath]);

    if (!viewpoint)
        return (
            <div className="flex-grow flex items-center justify-center">
                <Loader className="size-12" />
            </div>
        );

    // Use the most up-to-date data from query cache with proper type checking
    const latestViewpoint = queryClient.getQueryData<typeof viewpoint>(["viewpoint", viewpoint.id]) || viewpoint;
    const { title, description, graph, author } = latestViewpoint;

    return (
        <EditModeProvider>
            <main className="relative flex-grow md:grid md:grid-cols-[0_minmax(200px,400px)_1fr] bg-background h-full overflow-hidden">
                {/* Column 1 (Empty on Desktop) */}
                <div className="hidden md:block"></div>

                {/* Column 2 (Headers and Scrollable Content) */}
                <div className="flex flex-col h-full md:col-start-2 border-x overflow-hidden"> {/* Base styles, no conditional hiding here */}

                    {/* --- Headers START (Outside Scrollable Area) --- */}
                    {/* Header 1: Mobile Back/Graph Toggle / Desktop Rationale Title - Universal top-0 */}
                    <div className="sticky top-0 z-20 w-full flex items-center justify-between px-2 py-1.5 bg-background border-b">
                        <div className="flex items-center gap-1.5">
                            <Button
                                variant="outline"
                                size="sm"
                                className="flex items-center gap-1 px-1.5 rounded-md -ml-1 h-7"
                                onClick={handleBackClick}
                            >
                                <ArrowLeftIcon className="size-3.5" />
                                <span className="text-xs">Back</span>
                            </Button>
                            <h1 className="text-sm font-bold items-center gap-2 ml-2 md:flex hidden">
                                <ViewpointIcon className="size-4" />
                                <span>Rationale</span>
                            </h1>
                            {/* Graph toggle on mobile */}
                            <div className="md:hidden">
                                <Button
                                    size="icon"
                                    variant={canvasEnabled ? "default" : "outline"}
                                    className="rounded-full p-1 size-7"
                                    onClick={() => setCanvasEnabled(!canvasEnabled)}
                                >
                                    <NetworkIcon className="size-3.5" />
                                </Button>
                            </div>
                            {/* Rationale text on mobile */}
                            <h1 className="text-sm font-bold flex items-center gap-2 md:hidden">
                                <ViewpointIcon className="size-4" />
                                <span>Rationale{isSharing ? ' (Sharing)' : ''}</span>
                            </h1>
                        </div>
                        {/* Mobile copy buttons */}
                        <div className="flex items-center gap-1 md:hidden">
                            <Button
                                size="icon"
                                variant={isSharing ? "default" : "outline"}
                                className="rounded-full p-1 size-7"
                                onClick={toggleSharingMode}
                            >
                                <Share2Icon className="size-3.5" />
                            </Button>
                            {/* Mobile Copy Buttons */}
                            <Button
                                variant="outline"
                                size="sm"
                                className={cn(
                                    "rounded-full flex items-center gap-1 px-2 py-1 h-7 text-xs",
                                    isCopyingUrl && "text-green-500 border-green-500"
                                )}
                                onClick={handleCopyUrl}
                            >
                                <span className="font-medium whitespace-nowrap">
                                    {isCopyingUrl ? "Copied" : "Link"}
                                </span>
                                {isCopyingUrl ? (
                                    <CheckIcon className="size-3" />
                                ) : (
                                    <LinkIcon className="size-3" />
                                )}
                            </Button>
                            <AuthenticatedActionButton
                                variant="default"
                                size="sm"
                                className="rounded-full flex items-center gap-1 px-2 py-1 h-7 text-xs"
                                onClick={() => setIsPageCopyConfirmOpen(true)}
                                disabled={isCopying}
                            >
                                {isCopying ? (
                                    <div className="flex items-center gap-1">
                                        <span className="size-3 border border-background border-t-transparent rounded-full animate-spin" />
                                        <span className="font-medium whitespace-nowrap">Copying</span>
                                    </div>
                                ) : (
                                    <>
                                        <span className="font-medium whitespace-nowrap">Copy</span>
                                        <CopyIcon className="size-3" />
                                    </>
                                )}
                            </AuthenticatedActionButton>
                        </div>
                    </div>

                    {/* Header 2: Desktop Copy/Share etc. - Stick below Header 1 */}
                    <div className="hidden md:block sticky top-10 z-10 w-full border-b bg-background">
                        <div className="flex items-center justify-between gap-3 px-4 py-3">
                            <div className="flex items-center gap-2">
                                {/* Desktop Copy/Share Buttons */}
                                <Button
                                    variant="outline"
                                    className={cn(
                                        "rounded-full flex items-center gap-2 px-4",
                                        isCopyingUrl && "text-green-500 border-green-500"
                                    )}
                                    onClick={handleCopyUrl}
                                >
                                    <span className="text-sm font-bold">
                                        {isCopyingUrl ? "Copied!" : "Copy Link"}
                                    </span>
                                    {isCopyingUrl ? (
                                        <CheckIcon className="size-4" />
                                    ) : (
                                        <LinkIcon className="size-4" />
                                    )}
                                </Button>
                                <AuthenticatedActionButton
                                    variant="default"
                                    className="rounded-full flex items-center gap-2 px-4"
                                    onClick={() => setIsPageCopyConfirmOpen(true)}
                                    disabled={isCopying}
                                >
                                    {isCopying ? (
                                        <div className="flex items-center gap-2">
                                            <span className="size-4 border-2 border-background border-t-transparent rounded-full animate-spin" />
                                            <span className="text-sm font-bold">Copying...</span>
                                        </div>
                                    ) : (
                                        <>
                                            <span className="text-sm font-bold">Make a Copy</span>
                                            <CopyIcon className="size-4" />
                                        </>
                                    )}
                                </AuthenticatedActionButton>
                            </div>
                        </div>
                    </div>

                    {/* --- Scrollable Content START*/}
                    <div className={cn(
                        "flex-grow overflow-y-auto pb-10",
                        canvasEnabled && "hidden md:block", // Hide content on mobile when canvas active
                        // Add extra padding-bottom on mobile if canvas is OFF and changes exist
                        !canvasEnabled && (isGraphModified || isContentModified) && isOwner && "pb-24 md:pb-10",
                        isSharing && "pb-24 md:pb-24"
                    )}>
                        {/* Content: Title, Author, Stats, Desc, Points */}
                        <div className="flex flex-col p-2 gap-0">
                            {/* Title Editing */}
                            {isTitleEditing ? (
                                <Input
                                    value={editableTitle}
                                    onChange={(e) => setEditableTitle(e.target.value)}
                                    className="font-semibold mb-2"
                                    placeholder="Enter title"
                                    autoFocus
                                    onBlur={handleEditingBlur}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            handleEditingBlur();
                                        }
                                    }}
                                />
                            ) : (
                                <div className="relative" onDoubleClick={handleTitleDoubleClick}>
                                    {/* Conditional Edit Buttons for Title */}
                                    {canEdit() && (
                                        <>
                                            {/* Desktop Button */}
                                            <Button variant="ghost" size="sm" className="absolute right-0 top-0 z-10 hidden md:inline-flex" onClick={() => setIsTitleEditing(true)}>Edit</Button>
                                            {/* Mobile Button (Conditional) */}
                                            {!canvasEnabled && (
                                                <Button variant="ghost" size="sm" className="absolute right-0 top-0 z-10 md:hidden" onClick={() => setIsTitleEditing(true)}>Edit</Button>
                                            )}
                                        </>
                                    )}
                                    <h2 className="font-semibold pr-16">
                                        {editableTitle}{isContentModified && '*'}
                                    </h2>
                                    {latestViewpoint?.copiedFromId && (
                                        <div className="mt-1">
                                            <CopiedFromLink sourceId={latestViewpoint.copiedFromId} />
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Author and Stats */}
                            <div className="flex flex-col gap-2">
                                {latestViewpoint ? (
                                    <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                                        <span>By</span>
                                        <UsernameDisplay
                                            username={latestViewpoint.author ?? 'Unknown'}
                                            userId={latestViewpoint.createdBy}
                                            className="font-medium text-foreground text-sm"
                                        />
                                    </div>
                                ) : (
                                    <div className="mt-1 h-5 w-24 bg-muted animate-pulse rounded" />
                                )}
                                {latestViewpoint?.statistics && (
                                    <ViewpointStatsBar
                                        views={latestViewpoint.statistics.views}
                                        copies={latestViewpoint.statistics.copies}
                                        totalCred={latestViewpoint.statistics.totalCred}
                                        averageFavor={latestViewpoint.statistics.averageFavor}
                                    />
                                )}
                            </div>

                            <Separator className="my-2" />

                            {/* Description Editing */}
                            {isDescriptionEditing ? (
                                <Textarea
                                    value={editableDescription}
                                    onChange={(e) => setEditableDescription(e.target.value)}
                                    className="min-h-[200px] mb-4"
                                    placeholder="Enter description"
                                    autoFocus
                                    onBlur={handleEditingBlur}
                                />
                            ) : (
                                <div className="relative" onDoubleClick={handleDescriptionDoubleClick}>
                                    {/* Conditional Edit Buttons for Description */}
                                    {canEdit() && (
                                        <>
                                            {/* Desktop Button */}
                                            <Button variant="ghost" size="sm" className="absolute right-0 top-0 z-10 hidden md:inline-flex" onClick={() => setIsDescriptionEditing(true)}>Edit{isContentModified && '*'}</Button>
                                            {/* Mobile Button (Conditional) */}
                                            {!canvasEnabled && (
                                                <Button variant="ghost" size="sm" className="absolute right-0 top-0 z-10 md:hidden" onClick={() => setIsDescriptionEditing(true)}>Edit{isContentModified && '*'}</Button>
                                            )}
                                        </>
                                    )}
                                    <div
                                        className="prose dark:prose-invert max-w-none [&>p]:mb-4 [&>p]:leading-7 [&>h1]:mt-8 [&>h1]:mb-4 [&>h2]:mt-6 [&>h2]:mb-4 [&>h3]:mt-4 [&>h3]:mb-2 [&>ul]:mb-4 [&>ul]:ml-6 [&>ol]:mb-4 [&>ol]:ml-6 [&>li]:mb-2 [&>blockquote]:border-l-4 [&>blockquote]:border-muted [&>blockquote]:pl-4 [&>blockquote]:italic px-2 py-2"
                                    >
                                        {editableDescription ? (
                                            <DynamicMarkdown
                                                remarkPlugins={markdownPlugins}
                                                components={customMarkdownComponents}
                                            >
                                                {editableDescription}
                                            </DynamicMarkdown>
                                        ) : (
                                            <div className="text-muted-foreground italic">
                                                {canEdit() ? "Click edit to add a description..." : "No description provided"}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Points List */}
                        <div className="relative flex flex-col">
                            <span className="text-muted-foreground text-xs uppercase font-semibold tracking-widest w-full p-2 border-y text-center">
                                Points
                            </span>
                            <Dynamic>
                                {points.map((point, index) => (
                                    <PointCardWrapper
                                        key={`${point.pointId}-card-${index}`}
                                        point={point}
                                        className={cn(
                                            "border-b",
                                            hoveredPointId === point.pointId &&
                                            "shadow-[inset_0_0_0_2px_hsl(var(--primary))]",
                                            editMode && "pr-10",
                                            isSharing && selectedPointIds.has(point.pointId) && "bg-primary/10"
                                        )}
                                        isSharing={isSharing}
                                    />
                                ))}
                            </Dynamic>
                        </div>
                    </div>
                    {/* --- Scrollable Content END --- */}
                </div>

                {/* Column 3 (Graph View) */}
                <Dynamic>
                    <GraphView
                        key="graph-edit"
                        canModify={isOwner}
                        onInit={(instance) => {
                            setEditFlowInstance(instance);
                        }}
                        defaultNodes={localGraph ? localGraph.nodes : []}
                        defaultEdges={localGraph ? localGraph.edges : []}
                        statement={title}
                        className={cn(
                            // Base: Fixed overlay below header on mobile
                            "!fixed inset-0 top-[var(--header-height)] !h-[calc(100vh-var(--header-height))]",
                            // Desktop: Relative positioning within grid column
                            "md:!relative md:col-start-3 md:inset-[reset] md:top-[reset] md:!h-full md:!z-auto",
                            // Hide graph completely if canvas is NOT enabled AND we are on desktop
                            !canvasEnabled && "hidden md:block"
                        )}
                        setLocalGraph={setLocalGraph}
                        onSaveChanges={onSaveChanges}
                        onResetContent={resetContentModifications}
                        isSaving={isSaving}
                        isContentModified={isContentModified}
                        onNodesChange={(changes) => {
                            const { viewport, ...graph } = reactFlow.toObject();
                            setGraph(graph);
                            setLocalGraph(graph);
                        }}
                        onModifiedChange={setIsGraphModified}
                        canvasEnabled={canvasEnabled}
                        isSharing={isSharing}
                        toggleSharingMode={toggleSharingMode}
                        handleGenerateAndCopyShareLink={handleGenerateAndCopyShareLink}
                        originalGraphData={originalGraph}
                    />
                </Dynamic>

                <NegateDialog />

                <AlertDialog open={isDiscardDialogOpen} onOpenChange={setIsDiscardDialogOpen}>
                    <AlertDialogContent className="sm:max-w-[425px]">
                        <AlertDialogHeader>
                            <AlertDialogTitle>You have unsaved changes</AlertDialogTitle>
                            <AlertDialogDescription>
                                Do you want to save your changes or discard them?
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel
                                onClick={() => setIsDiscardDialogOpen(false)}
                                className="bg-primary text-primary-foreground hover:bg-primary/90"
                            >
                                Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction
                                onClick={handleDiscard}
                                className="bg-secondary text-secondary-foreground hover:bg-secondary/80"
                            >
                                Discard changes
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                <ShareRationaleDialog
                    open={isViewSharedDialogOpen}
                    onOpenChange={setIsViewSharedDialogOpen}
                    rationaleId={viewpointId}
                    spaceId={space?.data?.id || 'global'}
                    initialPoints={viewSharedPoints}
                    sharedBy={sharedByUsername}
                />

                <AlertDialog open={isPageCopyConfirmOpen} onOpenChange={setIsPageCopyConfirmOpen}>
                    <AlertDialogContent className="sm:max-w-[425px]">
                        <AlertDialogHeader>
                            <AlertDialogTitle>Confirm Copy</AlertDialogTitle>
                            <AlertDialogDescription>
                                Are you sure you want to make a copy of this rationale?
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => setIsPageCopyConfirmOpen(false)}>
                                Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction onClick={() => { setIsPageCopyConfirmOpen(false); handleCopy(); }}>
                                Yes, make a copy
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </main>

            <AlertDialog open={isDiscardDialogOpen} onOpenChange={setIsDiscardDialogOpen}>
                <AlertDialogContent className="sm:max-w-[425px]">
                    <AlertDialogHeader>
                        <AlertDialogTitle>You have unsaved changes</AlertDialogTitle>
                        <AlertDialogDescription>
                            Do you want to save your changes or discard them?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel
                            onClick={() => setIsDiscardDialogOpen(false)}
                            className="bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDiscard}
                            className="bg-secondary text-secondary-foreground hover:bg-secondary/80"
                        >
                            Discard changes
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
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
