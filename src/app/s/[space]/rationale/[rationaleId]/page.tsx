"use client";

import { viewpointGraphAtom, collapsedPointIdsAtom } from "@/atoms/viewpointAtoms";
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
import { AuthenticatedActionButton } from "@/components/ui/AuthenticatedActionButton";
import { Separator } from "@/components/ui/separator";
import { Dynamic } from "@/components/utils/Dynamic";
import { useBasePath } from "@/hooks/useBasePath";
import { cn } from "@/lib/cn";
import { usePointData } from "@/queries/usePointData";
import { useSpace } from "@/queries/useSpace";
import { useUser } from "@/queries/useUser";
import { ReactFlowProvider, useReactFlow, } from "@xyflow/react";
import { useAtom, useSetAtom } from "jotai";
import { NetworkIcon, CopyIcon, LinkIcon, CheckIcon, ArrowLeftIcon } from "lucide-react";
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
import { useRouter, notFound } from "next/navigation";
import { EditModeProvider, useEditMode } from "@/components/graph/EditModeContext";
import { ReactFlowInstance } from "@xyflow/react";
import { ViewpointIcon } from "@/components/icons/AppIcons";
import { ViewpointStatsBar } from "@/components/ViewpointStatsBar";
import { use } from "react";
import { getBackButtonHandler } from "@/utils/backButtonUtils";
import { useVisitedPoints } from "@/hooks/useVisitedPoints";
import { copyViewpointAndNavigate } from "@/utils/copyViewpoint";
import { initialSpaceTabAtom } from "@/atoms/navigationAtom";

// Create dynamic ReactMarkdown component
const DynamicMarkdown = dynamic(() => import('react-markdown'), {
  loading: () => <div className="animate-pulse h-32 bg-muted/30 rounded-md" />,
  ssr: false // Disable server-side rendering
});

const markdownPlugins = [remarkGfm];

const customMarkdownComponents = {
  // coerce h1 to h2
  h1: (props: React.HTMLAttributes<HTMLHeadingElement>) => <h2 {...props} />
};

function PointCardWrapper({
  point,
  className,
}: {
  point: { pointId: number; parentId?: number | string };
  className?: string;
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
    />
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
  const { markPointAsRead } = useVisitedPoints();

  const [editableTitle, setEditableTitle] = useState("");
  const [editableDescription, setEditableDescription] = useState("");
  const [isTitleEditing, setIsTitleEditing] = useState(false);
  const [isDescriptionEditing, setIsDescriptionEditing] = useState(false);

  const updateDetailsMutation = useUpdateViewpointDetails();

  const setInitialTab = useSetAtom(initialSpaceTabAtom);

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
    // Check if content has been modified by comparing against original values
    const titleChanged = originalTitleRef.current !== editableTitle;
    const descriptionChanged = originalDescriptionRef.current !== editableDescription;

    if (titleChanged || descriptionChanged) {
      // Mark as modified to show save button
      setIsContentModified(true);

      // Immediately update the local query cache to show changes visually
      // This is just for display purposes and will not persist until saved
      if (viewpoint) {
        queryClient.setQueryData(["viewpoint", viewpoint.id], {
          ...viewpoint,
          title: editableTitle,
          description: editableDescription,
          _pendingChanges: true // Mark as having pending changes
        });
      }
    }

    // Exit edit mode
    setIsTitleEditing(false);
    setIsDescriptionEditing(false);
  }, [viewpoint, editableTitle, editableDescription, queryClient]);

  const onSaveChanges = useCallback(async () => {
    try {
      setIsSaving(true);

      // If the current user is not the owner (i.e. not the creator) then fork instead of trying to update directly
      if (!isOwner) {
        if (reactFlow && viewpoint) {
          // Get the current space
          const currentSpace = space?.data?.id || 'default';

          // Get the CURRENT graph state directly from React Flow
          const currentGraph = {
            nodes: reactFlow.getNodes(),
            edges: reactFlow.getEdges()
          };

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

      if (localGraph && viewpoint) {
        // Update local query cache with new graph
        queryClient.setQueryData(["viewpoint", viewpoint.id], {
          ...viewpoint,
          title: editableTitle,
          description: editableDescription,
          graph: localGraph,
        });
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
    localGraph,
    space?.data?.id,
    editableTitle,
    editableDescription,
    updateDetailsMutation
  ]);

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

  const handleBackClick = getBackButtonHandler(router, setInitialTab);

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
      <main className="relative flex-grow md:grid md:grid-cols-[0_minmax(200px,400px)_1fr] bg-background">
        <div className="w-full md:col-[2] flex flex-col border-x pb-10 overflow-auto">
          <div className="relative flex-grow bg-background">
            {/* New back navigation row */}
            <div className="sticky top-0 z-10 w-full flex items-center justify-between px-2 py-1.5 bg-background">
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
                <h1 className="text-sm font-bold items-center gap-2 ml-2 md:block hidden">
                  <ViewpointIcon className="size-4" />
                  Rationale
                </h1>
                {/* Graph toggle on mobile */}
                <div className="md:hidden">
                  <Button
                    size={"icon"}
                    variant={canvasEnabled ? "default" : "outline"}
                    className="rounded-full p-1 size-7"
                    onClick={() => setCanvasEnabled(!canvasEnabled)}
                  >
                    <NetworkIcon className="size-3.5" />
                  </Button>
                </div>
                {/* Rationale text on mobile */}
                <h1 className="text-[10px] font-bold flex items-center gap-1.5 md:hidden">
                  <ViewpointIcon className="size-3" />
                  Rationale
                </h1>
              </div>
              {/* Copy buttons for both mobile and desktop */}
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  className={cn(
                    "rounded-full flex items-center gap-1 px-1.5 text-[10px] md:text-sm md:px-3 md:gap-2 shrink-0 h-7",
                    isCopyingUrl && "text-green-500 border-green-500"
                  )}
                  onClick={handleCopyUrl}
                >
                  <span className="font-bold whitespace-nowrap">
                    {isCopyingUrl ? "Copied!" : "Copy Link"}
                  </span>
                  {isCopyingUrl ? (
                    <CheckIcon className="size-3 md:size-4 shrink-0" />
                  ) : (
                    <LinkIcon className="size-3 md:size-4 shrink-0" />
                  )}
                </Button>
                <AuthenticatedActionButton
                  variant="outline"
                  className="rounded-full flex items-center gap-1 px-1.5 text-[10px] md:text-sm md:px-3 md:gap-2 shrink-0 h-7"
                  onClick={handleCopy}
                  disabled={isCopying}
                >
                  {isCopying ? (
                    <div className="flex items-center gap-1 md:gap-2">
                      <span className="size-3 md:size-4 border-2 border-background border-t-transparent rounded-full animate-spin shrink-0" />
                      <span className="font-bold whitespace-nowrap">Copying...</span>
                    </div>
                  ) : (
                    <>
                      <span className="font-bold whitespace-nowrap">Make a Copy</span>
                      <CopyIcon className="size-3 md:size-4 shrink-0" />
                    </>
                  )}
                </AuthenticatedActionButton>
              </div>
            </div>
            <Separator />

            {/* Desktop-only header*/}
            <div className="hidden md:block">
              <div className="sticky top-[calc(2.5rem+1px)] z-10 w-full flex items-center justify-between gap-3 px-4 py-3 bg-background">
                <div className="flex items-center gap-2">
                </div>
              </div>
              <Separator />
            </div>

            <div className="flex flex-col p-2 gap-0">
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
                <div className="relative">
                  {canEdit() && !canvasEnabled && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 z-10 md:hidden"
                      onClick={() => setIsTitleEditing(true)}
                    >
                      Edit
                    </Button>
                  )}
                  {canEdit() && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 z-10 hidden md:inline-flex"
                      onClick={() => setIsTitleEditing(true)}
                    >
                      Edit
                    </Button>
                  )}
                  <h2 className="font-semibold pr-16">
                    {title}
                  </h2>
                </div>
              )}

              <div className="flex flex-col gap-2">
                <span className="text-muted-foreground text-sm">
                  by{" "}
                  <span className="font-bold text-sm text-yellow-500">
                    {author}
                  </span>
                </span>
                {viewpoint.statistics && (
                  <ViewpointStatsBar
                    views={viewpoint.statistics.views}
                    copies={viewpoint.statistics.copies}
                    totalCred={viewpoint.statistics.totalCred}
                    averageFavor={viewpoint.statistics.averageFavor}
                  />
                )}
              </div>

              <Separator className="my-2" />

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
                <div className="relative">
                  {canEdit() && !canvasEnabled && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 z-10 md:hidden"
                      onClick={() => setIsDescriptionEditing(true)}
                    >
                      Edit
                    </Button>
                  )}
                  {canEdit() && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 z-10 hidden md:inline-flex"
                      onClick={() => setIsDescriptionEditing(true)}
                    >
                      Edit
                    </Button>
                  )}
                  <div
                    className="prose dark:prose-invert max-w-none [&>p]:mb-4 [&>p]:leading-7 [&>h1]:mt-8 [&>h1]:mb-4 [&>h2]:mt-6 [&>h2]:mb-4 [&>h3]:mt-4 [&>h3]:mb-2 [&>ul]:mb-4 [&>ul]:ml-6 [&>ol]:mb-4 [&>ol]:ml-6 [&>li]:mb-2 [&>blockquote]:border-l-4 [&>blockquote]:border-muted [&>blockquote]:pl-4 [&>blockquote]:italic px-2 py-2"
                  >
                    <DynamicMarkdown
                      remarkPlugins={markdownPlugins}
                      components={customMarkdownComponents}
                    >
                      {description}
                    </DynamicMarkdown>
                  </div>
                </div>
              )}
            </div>
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
                      editMode && "pr-10"
                    )}
                  />
                ))}
              </Dynamic>
            </div>
          </div>
        </div>

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
              "!fixed md:!sticky inset-0 top-[var(--header-height)] md:inset-[reset] !h-[calc(100vh-var(--header-height))] md:top-[var(--header-height)] md:z-auto",
              !canvasEnabled && "hidden md:block"
            )}
            setLocalGraph={setLocalGraph}
            onSaveChanges={onSaveChanges}
            onResetContent={resetContentModifications}
            isSaving={isSaving}
            isContentModified={isContentModified}
            onClose={
              isMobile
                ? () => setCanvasEnabled(false)
                : undefined
            }
            closeButtonClassName="top-4 right-4"
          />
        </Dynamic>

        <NegateDialog />
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
