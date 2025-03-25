"use client";

import { viewpointGraphAtom, collapsedPointIdsAtom, ViewpointGraph } from "@/atoms/viewpointAtoms";
import { negatedPointIdAtom } from "@/atoms/negatedPointIdAtom";
import { canvasEnabledAtom } from "@/atoms/canvasEnabledAtom";
import { hoveredPointIdAtom } from "@/atoms/hoveredPointIdAtom";
import { AppNode } from "@/components/graph/AppNode";
import { AppEdge } from "@/components/graph/AppEdge";
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
import { usePrivy } from "@privy-io/react-auth";
import { ReactFlowProvider, useReactFlow, } from "@xyflow/react";
import { useAtom, useSetAtom } from "jotai";
import { NetworkIcon, CopyIcon, LinkIcon, CheckIcon } from "lucide-react";
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
import { useRouter } from "next/navigation";
import { EditModeProvider, useEditMode } from "@/components/graph/EditModeContext";
import { ReactFlowInstance } from "@xyflow/react";
import { ViewpointIcon } from "@/components/icons/AppIcons";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ViewpointStatsBar } from "@/components/ViewpointStatsBar";
import { use } from "react";

// Create dynamic ReactMarkdown component
const DynamicMarkdown = dynamic(() => import('react-markdown'), {
  loading: () => <div className="animate-pulse h-32 bg-muted/30 rounded-md" />,
  ssr: false // Disable server-side rendering
});

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

const regenerateGraphIds = (graph: ViewpointGraph): ViewpointGraph => {

  const idMap = new Map<string, string>();

  const statementNode = graph.nodes.find(node => node.type === 'statement');
  if (statementNode) {
    idMap.set(statementNode.id, 'statement');
  }

  const newNodes = graph.nodes.map((node) => {
    // Statement node keeps its ID
    if (node.type === 'statement') {
      return { ...node, id: 'statement' } as AppNode;
    }

    // Generate a new unique ID for this node that incorporates the node type
    // Making sure we don't include any references to other nodes in the ID
    const newId = `${node.type || 'node'}_${Math.random().toString(36).substring(2, 15)}`;
    idMap.set(node.id, newId);

    return { ...node, id: newId } as AppNode;
  });

  // Update edge source and target IDs using the mapping
  let newEdges = graph.edges.map((edge) => {
    const newSource = idMap.get(edge.source) || edge.source;
    const newTarget = idMap.get(edge.target) || edge.target;
    const newId = `edge_${Math.random().toString(36).substring(2, 15)}`;

    return {
      ...edge,
      id: newId,
      source: newSource,
      target: newTarget
    } as AppEdge;
  });

  // Check for and remove duplicate edges based on source-target pairs
  const edgeMap = new Map<string, AppEdge>();
  const duplicateEdges: string[] = [];

  newEdges.forEach(edge => {
    const key = `${edge.source}->${edge.target}`;
    if (edgeMap.has(key)) {
      duplicateEdges.push(edge.id);
    } else {
      edgeMap.set(key, edge);
    }
  });

  if (duplicateEdges.length > 0) {
    newEdges = newEdges.filter(edge => !duplicateEdges.includes(edge.id));
  }

  return { nodes: newNodes, edges: newEdges };
};

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

  const [editableTitle, setEditableTitle] = useState("");
  const [editableDescription, setEditableDescription] = useState("");
  const [isTitleEditing, setIsTitleEditing] = useState(false);
  const [isDescriptionEditing, setIsDescriptionEditing] = useState(false);

  const updateDetailsMutation = useUpdateViewpointDetails();

  useEffect(() => {
    const checkMobile = () => {
      const isMobileView = window.innerWidth < 640; // 640px is tailwind's sm breakpoint
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
    if (originalTitleRef.current !== editableTitle || originalDescriptionRef.current !== editableDescription) {
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
      // Get the current space
      const currentSpace = space?.data?.id || 'default';

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

      const regeneratedGraph = regenerateGraphIds(currentGraph);

      // Store the viewpoint data in session storage with space information
      const viewpointData = {
        title: editableTitle,
        description: editableDescription,
        graph: regeneratedGraph,
        sourceSpace: currentSpace,
        sourceId: viewpoint.id // Store the original ID to track copies
      };

      // Use sessionStorage with space-specific key to avoid conflicts
      const storageKey = `copyingViewpoint:${currentSpace}`;
      sessionStorage.setItem(storageKey, JSON.stringify(viewpointData));

      // Track the copy action
      // We don't need to await this as it shouldn't block navigation
      fetch(`/api/viewpoint/track-copy?id=${viewpoint.id}`, { method: 'POST' });

      // Navigate to the new viewpoint page in the same space
      router.push(`${basePath}/rationale/new`);

    } catch (error) {
      alert("Failed to copy rationale. Please try again.");
      setIsCopying(false);
    }
  }, [viewpoint, router, basePath, space?.data?.id, reactFlow, localGraph, editableTitle, editableDescription]);

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
      <main className="relative flex-grow sm:grid sm:grid-cols-[1fr_minmax(200px,600px)_1fr] md:grid-cols-[0_minmax(200px,400px)_1fr] bg-background">
        <div className="w-full sm:col-[2] flex flex-col border-x pb-10 overflow-auto">
          <div className="relative flex-grow bg-background">
            <div className="sticky top-0 z-10 w-full flex items-center justify-between gap-3 px-4 py-3 bg-background/70 backdrop-blur">
              <h1 className="text-sm font-bold flex items-center gap-2">
                <ViewpointIcon className="size-4" />
                Rationale
              </h1>

              <div className="flex items-center gap-2">
                <Button
                  size={"icon"}
                  variant={canvasEnabled ? "default" : "outline"}
                  className="rounded-full p-2 size-9 sm:hidden"
                  onClick={() => {
                    const newState = !canvasEnabled;
                    setCanvasEnabled(newState);
                  }}
                >
                  <NetworkIcon className="" />
                </Button>
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
                  variant="outline"
                  className="rounded-full flex items-center gap-2 px-4"
                  onClick={handleCopy}
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
            <Separator />
            {/* Add mobile-only separator that appears under the mobile buttons when canvas is enabled */}
            {canvasEnabled && (
              <div className="sm:hidden">
                <Separator />
              </div>
            )}

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
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <h2
                        className={cn(
                          "font-semibold",
                          canEdit() && "cursor-pointer hover:bg-accent hover:bg-opacity-50 px-2 py-1 -mx-2 rounded border-dashed border border-transparent hover:border-muted-foreground"
                        )}
                        onDoubleClick={handleTitleDoubleClick}
                      >
                        {title}
                      </h2>
                    </TooltipTrigger>
                    {canEdit() && (
                      <TooltipContent side="right" className="bg-accent text-accent-foreground border-accent-foreground/20">
                        <p><strong>Double-click to edit title</strong></p>
                        <p className="text-xs text-muted-foreground">Changes will be saved with the graph</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
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
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className={cn(
                          "prose dark:prose-invert max-w-none [&>p]:mb-4 [&>p]:leading-7 [&>h1]:mt-8 [&>h1]:mb-4 [&>h2]:mt-6 [&>h2]:mb-4 [&>h3]:mt-4 [&>h3]:mb-2 [&>ul]:mb-4 [&>ul]:ml-6 [&>ol]:mb-4 [&>ol]:ml-6 [&>li]:mb-2 [&>blockquote]:border-l-4 [&>blockquote]:border-muted [&>blockquote]:pl-4 [&>blockquote]:italic",
                          canEdit() && "cursor-pointer hover:bg-accent hover:bg-opacity-50 p-2 -m-2 rounded border-dashed border border-transparent hover:border-muted-foreground"
                        )}
                        onDoubleClick={handleDescriptionDoubleClick}
                      >
                        <DynamicMarkdown remarkPlugins={[remarkGfm]}>
                          {description}
                        </DynamicMarkdown>
                      </div>
                    </TooltipTrigger>
                    {canEdit() && (
                      <TooltipContent side="right" className="bg-accent text-accent-foreground border-accent-foreground/20">
                        <p><strong>Double-click to edit description</strong></p>
                        <p className="text-xs text-muted-foreground">Changes will be saved with the graph</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            <div className="relative flex flex-col">
              <span className="text-muted-foreground text-xs uppercase font-semibold tracking-widest w-full p-2 border-y text-center">
                Points
              </span>
              <Dynamic>
                {points.map((point) => (
                  <PointCardWrapper
                    key={`${point.pointId}-card`}
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
              !canvasEnabled && isMobile ? "hidden" : ""
            )}
            setLocalGraph={setLocalGraph}
            onSaveChanges={onSaveChanges}
            onResetContent={resetContentModifications}
            isSaving={isSaving}
            isContentModified={isContentModified}
            onClose={
              isMobile
                ? () => {
                  setCanvasEnabled(false);
                }
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
  const { data: viewpoint, isLoading } = useViewpoint(rationaleId);

  if (isLoading) {
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
