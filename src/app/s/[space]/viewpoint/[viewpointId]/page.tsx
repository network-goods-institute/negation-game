"use client";

import {
  viewpointGraphAtom,
  viewpointReasoningAtom,
  viewpointStatementAtom,
  collapsedPointIdsAtom,
} from "@/app/s/[space]/viewpoint/viewpointAtoms";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AuthenticatedActionButton, Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Dynamic } from "@/components/utils/Dynamic";
import { DEFAULT_SPACE } from "@/constants/config";
import { useBasePath } from "@/hooks/useBasePath";
import { cn } from "@/lib/cn";
import { usePointData } from "@/queries/usePointData";
import { useSpace } from "@/queries/useSpace";
import { useUser } from "@/queries/useUser";
import { usePrivy } from "@privy-io/react-auth";
import { Edge, ReactFlowProvider, useReactFlow, Node } from "@xyflow/react";
import { useAtom, useSetAtom } from "jotai";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Portal } from "@radix-ui/react-portal";
import { GroupIcon, NetworkIcon, CopyIcon, Edit2Icon, Trash2Icon } from "lucide-react";
import React from 'react';
import { useEffect, useState, useMemo, useCallback } from "react";
import dynamic from 'next/dynamic';
import remarkGfm from 'remark-gfm';
import { use } from "react";
import { useQueryClient } from '@tanstack/react-query';

import { useGraphPoints } from "@/components/graph/useGraphPoints";
import { Loader } from "@/components/ui/loader";
import { useViewpoint } from "@/queries/useViewpoint";
import { useRouter } from "next/navigation";
import { EditModeProvider, useEditMode } from "@/components/graph/EditModeContext";
import { ReactFlowInstance } from "@xyflow/react";

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
  const editMode = useEditMode();
  const reactFlow = useReactFlow();
  const setNegatedPointId = useSetAtom(negatedPointIdAtom);
  const [hoveredPointId] = useAtom(hoveredPointIdAtom);

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
    />
  );
}

function ViewpointPageContent({ viewpointId }: { viewpointId: string }) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const basePath = useBasePath();
  const space = useSpace();
  const [canvasEnabled, setCanvasEnabled] = useAtom(canvasEnabledAtom);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640); // 640px is tailwind's sm breakpoint
    };

    // Check initially
    checkMobile();

    // Add resize listener
    window.addEventListener('resize', checkMobile);

    // Cleanup
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const points = useGraphPoints();

  const { updateNodeData } = useReactFlow();
  const reactFlow = useReactFlow<AppNode>();
  const { data: viewpoint } = useViewpoint(viewpointId);

  const setGraph = useSetAtom(viewpointGraphAtom);
  const setStatement = useSetAtom(viewpointStatementAtom);
  const setReasoning = useSetAtom(viewpointReasoningAtom);
  const setCollapsedPointIds = useSetAtom(collapsedPointIdsAtom);

  const [hoveredPointId, setHoveredPointId] = useAtom(hoveredPointIdAtom);

  // Local edit mode state; when true, we keep graph state in a local controlled state.
  const [editModeEnabled, setEditModeEnabled] = useState(false);
  // Save global graph snapshot from viewpoint
  const originalGraph = useMemo(() => viewpoint?.graph, [viewpoint]);
  // Add a revision state to force re-mount of GraphView in non-edit mode upon toggling
  const [graphRevision, setGraphRevision] = useState(0);

  // When editing, maintain a local graph state
  const [localGraph, setLocalGraph] = useState(originalGraph);

  // When global graph (from the loaded viewpoint) updates and we're not editing,
  // sync the localGraph to the new value.
  useEffect(() => {
    if (!editModeEnabled && originalGraph) {
      setLocalGraph(originalGraph);
      setCollapsedPointIds(new Set());
    }
  }, [editModeEnabled, originalGraph, setCollapsedPointIds]);

  // Toggle edit mode and initialize/discard local graph state accordingly.
  const toggleEditMode = () => {
    if (editModeEnabled) {
      // Exiting edit mode: log the current original and local graphs.
      if (originalGraph) {
        setGraph(originalGraph);
        setLocalGraph(originalGraph);
      }
      setEditModeEnabled(false);
      // Reset collapsed points when discarding changes
      setCollapsedPointIds(new Set());
      // Increment the revision counter to force remount of non-edit GraphView.
      setGraphRevision(prev => prev + 1);
    } else {
      setLocalGraph(originalGraph);
      setEditModeEnabled(true);
    }
  };

  const [isSaving, setIsSaving] = useState(false);

  const { data: user } = useUser();
  const isOwner = viewpoint ? user?.id === viewpoint.createdBy : false;

  const onSaveChanges = useCallback(async () => {
    try {
      setIsSaving(true);
      // If the current user is not the owner (i.e. not the creator) then fork instead of trying to update directly
      if (!isOwner) {
        if (localGraph && viewpoint) {
          sessionStorage.setItem('forkGraph', JSON.stringify(localGraph));
          setStatement(viewpoint.title + " (copy)");
          setReasoning(viewpoint.description);
          setGraph(localGraph);

          const encodedGraph = encodeURIComponent(JSON.stringify(localGraph));
          router.push(`${basePath}/viewpoint/new?copy=true&graph=${encodedGraph}`);
          return;
        }
      }
      setEditModeEnabled(false);
      if (localGraph && viewpoint) {
        queryClient.setQueryData(["viewpoint", viewpoint.id], {
          ...viewpoint,
          graph: localGraph,
        });
      }
      // Reset collapsed points when saving changes
      setCollapsedPointIds(new Set());
      // Reset revision counter to force a remount of the non-edit GraphView
      setGraphRevision(prev => prev + 1);
    } catch (error) {
      alert("Failed to save changes. Please try again.");
      if (originalGraph) {
        setLocalGraph(originalGraph);
        setGraph(originalGraph);
      }
      setEditModeEnabled(false);
    } finally {
      setIsSaving(false);
    }
  }, [
    localGraph,
    queryClient,
    setEditModeEnabled,
    viewpoint,
    originalGraph,
    setLocalGraph,
    setGraph,
    isOwner,
    router,
    basePath,
    setStatement,
    setReasoning,
    setGraphRevision,
    setCollapsedPointIds
  ]);

  const [editFlowInstance, setEditFlowInstance] = useState<ReactFlowInstance<AppNode> | null>(null);

  const removePointFromViewpoint = useCallback(
    (pointIdToRemove: string) => {
      const currentNodes = reactFlow.getNodes();
      const currentEdges = reactFlow.getEdges();

      if (pointIdToRemove === 'statement') {
        return;
      }

      const nodesToRemove = new Set<string>([pointIdToRemove]);
      const edgesToRemove = new Set<string>();

      // Find all edges connected to this node (both directions)
      const connectedEdges = currentEdges.filter(edge =>
        edge.source === pointIdToRemove || edge.target === pointIdToRemove
      );
      // Add all connected edges to removal set
      connectedEdges.forEach(edge => {
        edgesToRemove.add(edge.id);
      });

      // BFS to find all CHILDREN (using reverse edge direction)
      const queue = [pointIdToRemove];
      while (queue.length > 0) {
        const currentId = queue.shift()!;
        // Find edges where this node is the TARGET (parent)
        const childEdges = currentEdges.filter(
          edge => edge.target === currentId && edge.source !== "statement"
        );
        childEdges.forEach(edge => {
          const childNodeId = edge.source;
          if (!nodesToRemove.has(childNodeId)) {
            nodesToRemove.add(childNodeId);
            queue.push(childNodeId);
          }
        });
      }

      // Update local graph state
      const newGraph = {
        nodes: currentNodes.filter(n => !nodesToRemove.has(n.id)),
        edges: currentEdges.filter(e => !edgesToRemove.has(e.id))
      };
      setLocalGraph(newGraph);

      // Update ReactFlow instance
      if (editFlowInstance) {
        editFlowInstance.setNodes(newGraph.nodes);
        editFlowInstance.setEdges(newGraph.edges);
      }

      // Update collapsedPointIds for all removed nodes
      const removedNodes = currentNodes.filter(n => nodesToRemove.has(n.id));
      setCollapsedPointIds(prev => {
        const newSet = new Set(prev);
        removedNodes.forEach(node => {
          if (node.type === "point") {
            newSet.add(node.data.pointId);
          }
        });
        return newSet;
      });
    },
    [reactFlow, editFlowInstance, setCollapsedPointIds, setLocalGraph]
  );

  const handleCopy = useCallback(() => {
    if (!viewpoint) return;

    setStatement(viewpoint.title + " (copy)");
    setReasoning(viewpoint.description);
    setGraph(viewpoint.graph);

    router.push(`${basePath}/viewpoint/new`);
  }, [viewpoint, setStatement, setReasoning, setGraph, router, basePath]);

  if (!viewpoint)
    return (
      <div className="flex-grow flex items-center justify-center">
        <Loader className="size-12" />
      </div>
    );

  const { title, description, graph, author } = viewpoint;

  return (
    <EditModeProvider editMode={editModeEnabled}>
      <main className="relative flex-grow sm:grid sm:grid-cols-[1fr_minmax(200px,600px)_1fr] md:grid-cols-[0_minmax(200px,400px)_1fr] bg-background">
        <div className="w-full sm:col-[2] flex flex-col border-x pb-10 overflow-auto">
          <div className="relative flex-grow bg-background">
            <div className="sticky top-0 z-10 w-full flex items-center justify-between gap-3 px-4 py-3 bg-background/70 backdrop-blur">
              {space?.data && space.data.id !== DEFAULT_SPACE ? (
                <div className="flex items-center gap-1">
                  <>
                    <Avatar className="border-4 border-background size-8">
                      {space.data.icon && (
                        <AvatarImage
                          src={space.data.icon}
                          alt={`s/${space.data.id} icon`}
                        />
                      )}
                      <AvatarFallback className="text-xl font-bold text-muted-foreground">
                        {space.data.id.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-md  font-semibold">
                      s/{space.data.id}
                    </span>
                  </>
                </div>
              ) : (
                <div />
              )}

              <h1 className="text-sm font-bold">
                <GroupIcon className="inline stroke-1 size-5 align-text-bottom" />{" "}
                Viewpoint
              </h1>

              <div className="flex gap-sm items-center text-muted-foreground">
                <Button
                  size={"icon"}
                  variant={canvasEnabled ? "default" : "outline"}
                  className="rounded-full p-2 size-9 sm:hidden"
                  onClick={() => {
                    setCanvasEnabled(true);
                  }}
                >
                  <NetworkIcon className="" />
                </Button>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <AuthenticatedActionButton
                      variant="outline"
                      size="icon"
                      className="rounded-full p-2 size-9"
                      onClick={handleCopy}
                    >
                      <CopyIcon />
                    </AuthenticatedActionButton>
                  </TooltipTrigger>
                  <Portal>
                    <TooltipContent
                      side="bottom"
                      align="center"
                      sideOffset={5}
                      className="z-[100]"
                    >
                      <p>Copy this viewpoint</p>
                    </TooltipContent>
                  </Portal>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <AuthenticatedActionButton
                      variant={"outline"}
                      size={"icon"}
                      className="rounded-full p-2 size-9"
                      onClick={toggleEditMode}
                    >
                      {editModeEnabled ? <Trash2Icon /> : <Edit2Icon />}
                    </AuthenticatedActionButton>
                  </TooltipTrigger>
                  <Portal>
                    <TooltipContent
                      side="bottom"
                      align="center"
                      sideOffset={5}
                      className="z-[100]"
                    >
                      <p>{editModeEnabled ? "Discard changes" : "Edit viewpoint"}</p>
                    </TooltipContent>
                  </Portal>
                </Tooltip>
              </div>
            </div>
            <Separator />

            <div className="flex flex-col p-2 gap-0">
              <h2 className="font-semibold">{title}</h2>

              <span className="text-muted-foreground text-sm">
                by{" "}
                <span className="font-bold text-sm text-yellow-500">
                  {author}
                </span>
              </span>

              <Separator className="my-2" />

              <div className="prose dark:prose-invert max-w-none [&>p]:mb-4 [&>p]:leading-7 [&>h1]:mt-8 [&>h1]:mb-4 [&>h2]:mt-6 [&>h2]:mb-4 [&>h3]:mt-4 [&>h3]:mb-2 [&>ul]:mb-4 [&>ul]:ml-6 [&>ol]:mb-4 [&>ol]:ml-6 [&>li]:mb-2 [&>blockquote]:border-l-4 [&>blockquote]:border-muted [&>blockquote]:pl-4 [&>blockquote]:italic">
                <DynamicMarkdown remarkPlugins={[remarkGfm]}>
                  {description}
                </DynamicMarkdown>
              </div>
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
                      editModeEnabled && "pr-10"
                    )}
                  />
                ))}
              </Dynamic>
            </div>
          </div>
        </div>

        <Dynamic>
          {editModeEnabled ? (
            <GraphView
              key="graph-edit"
              canModify={isOwner}
              onInit={(instance) => {
                console.log("[ViewpointPage] Setting editFlowInstance:", instance);
                setEditFlowInstance(instance);
              }}
              defaultNodes={localGraph ? localGraph.nodes : []}
              defaultEdges={localGraph ? localGraph.edges : []}
              statement={title}
              className={cn(
                "!fixed md:!sticky inset-0 top-[var(--header-height)] md:inset-[reset] !h-[calc(100vh-var(--header-height))] md:top-[var(--header-height)] md:z-auto",
                !canvasEnabled && isMobile && "hidden"
              )}
              setLocalGraph={setLocalGraph}
              onSaveChanges={onSaveChanges}
              isSaving={isSaving}
            />
          ) : (
            <GraphView
              key={`graph-normal-${graphRevision}`}
              onInit={(reactFlow) => {
                if (viewpoint?.graph) {
                  reactFlow.setNodes(viewpoint.graph.nodes);
                  reactFlow.setEdges(viewpoint.graph.edges);
                  reactFlow.fitView();
                }
              }}
              defaultNodes={viewpoint?.graph.nodes}
              defaultEdges={viewpoint?.graph.edges}
              onClose={
                isMobile
                  ? () => {
                    setCanvasEnabled(false);
                  }
                  : undefined
              }
              onNodesChange={() => {
                const { viewport, ...graph } = reactFlow.toObject();
                setGraph(graph);
              }}
              onEdgesChange={() => {
                const { viewport, ...graph } = reactFlow.toObject();
                setGraph(graph);
              }}
              statement={title}
              className={cn(
                "!fixed md:!sticky inset-0 top-[var(--header-height)] md:inset-[reset] !h-[calc(100vh-var(--header-height))] md:top-[var(--header-height)] md:z-auto",
                !canvasEnabled && isMobile && "hidden"
              )}
            />
          )}
        </Dynamic>

        <NegateDialog />
      </main>
    </EditModeProvider>
  );
}

export default function NewViewpointPage({
  params,
}: {
  params: Promise<{ viewpointId: string; space: string }>;
}) {
  const { user: privyUser } = usePrivy();
  const { viewpointId } = use(params);
  return (
    <OriginalPosterProvider originalPosterId={privyUser?.id}>
      <ReactFlowProvider>
        <ViewpointPageContent viewpointId={viewpointId} />
      </ReactFlowProvider>
    </OriginalPosterProvider>
  );
}
