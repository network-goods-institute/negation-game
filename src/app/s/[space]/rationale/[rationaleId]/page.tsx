"use client";

import {
  viewpointGraphAtom,
  collapsedPointIdsAtom,
  ViewpointGraph,
} from "@/app/s/[space]/viewpoint/viewpointAtoms";
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
import { ReactFlowProvider, useReactFlow, } from "@xyflow/react";
import { useAtom, useSetAtom } from "jotai";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Portal } from "@radix-ui/react-portal";
import { NetworkIcon, CopyIcon } from "lucide-react";
import React, { useEffect, useState, useMemo, useCallback } from "react";
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
import { ViewpointIcon } from "@/components/icons/AppIcons";

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

function ViewpointPageContent({ viewpointId }: { viewpointId: string }) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const basePath = useBasePath();
  const space = useSpace();
  const [canvasEnabled, setCanvasEnabled] = useAtom(canvasEnabledAtom);
  const [isMobile, setIsMobile] = useState(false);
  const [isCopying, setIsCopying] = useState(false);

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
            title: viewpoint.title + " (copy)",
            description: viewpoint.description,
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
      if (localGraph && viewpoint) {
        // Update local query cache with new graph
        queryClient.setQueryData(["viewpoint", viewpoint.id], {
          ...viewpoint,
          graph: localGraph,
        });
      }
      // Reset collapsed points when saving changes
      setCollapsedPointIds(new Set());

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
    space?.data?.id
  ]);

  const [editFlowInstance, setEditFlowInstance] = useState<ReactFlowInstance<AppNode> | null>(null);


  const handleCopy = useCallback(() => {
    if (!viewpoint) return;

    // Set copying state to true
    setIsCopying(true);

    try {
      // Get the current space
      const currentSpace = space?.data?.id || 'default';

      // Use the original viewpoint state from DB, not the edited state
      const regeneratedGraph = regenerateGraphIds(viewpoint.graph);

      // Store the viewpoint data in session storage with space information
      const viewpointData = {
        title: viewpoint.title + " (copy)",
        description: viewpoint.description,
        graph: regeneratedGraph,
        sourceSpace: currentSpace,
      };

      // Use sessionStorage with space-specific key to avoid conflicts
      const storageKey = `copyingViewpoint:${currentSpace}`;
      sessionStorage.setItem(storageKey, JSON.stringify(viewpointData));

      // Navigate to the new viewpoint page in the same space
      router.push(`${basePath}/rationale/new`);

    } catch (error) {
      alert("Failed to copy rationale. Please try again.");
      setIsCopying(false);
    }
  }, [viewpoint, router, basePath, space?.data?.id]);

  if (!viewpoint)
    return (
      <div className="flex-grow flex items-center justify-center">
        <Loader className="size-12" />
      </div>
    );

  const { title, description, graph, author } = viewpoint;

  return (
    <EditModeProvider>
      <main className="relative flex-grow sm:grid sm:grid-cols-[1fr_minmax(200px,600px)_1fr] md:grid-cols-[0_minmax(200px,400px)_1fr] bg-background">
        <div className="w-full sm:col-[2] flex flex-col border-x pb-10 overflow-auto">
          <div className="relative flex-grow bg-background">
            <div className="sticky top-0 z-10 w-full flex items-center justify-between gap-3 px-4 py-3 bg-background/70 backdrop-blur">
              {space?.data && space.data.id !== DEFAULT_SPACE ? (
                <div className="flex items-center gap-2">
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
                  <span className="text-md font-semibold">
                    s/{space.data.id}
                  </span>
                </div>
              ) : (
                <div />
              )}

              <h1 className="text-sm font-bold flex items-center gap-2">
                <ViewpointIcon className="size-4" />
                Rationale
              </h1>

              <div className="flex gap-sm items-center text-muted-foreground">
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
                <Tooltip>
                  <TooltipTrigger asChild>
                    <AuthenticatedActionButton
                      variant="outline"
                      size="icon"
                      className="rounded-full p-2 size-9 flex items-center justify-center ml-6"
                      onClick={handleCopy}
                      disabled={isCopying}
                      rightLoading={isCopying}
                    >
                      <CopyIcon className="size-4" />
                    </AuthenticatedActionButton>
                  </TooltipTrigger>
                  <Portal>
                    <TooltipContent
                      side="bottom"
                      align="center"
                      sideOffset={5}
                      className="z-[100]"
                    >
                      <p>Copy this rationale</p>
                    </TooltipContent>
                  </Portal>
                </Tooltip>
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
            isSaving={isSaving}
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
  const { user: privyUser } = usePrivy();
  const { rationaleId } = use(params);
  return (
    <OriginalPosterProvider originalPosterId={privyUser?.id}>
      <ReactFlowProvider>
        <ViewpointPageContent viewpointId={rationaleId} />
      </ReactFlowProvider>
    </OriginalPosterProvider>
  );
}
