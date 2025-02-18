"use client";

import {
  initialViewpointGraph,
  viewpointGraphAtom,
  viewpointReasoningAtom,
  viewpointStatementAtom,
  deletedPointIdsAtom,
} from "@/app/s/[space]/viewpoint/viewpointAtoms";
import { useEffect, useMemo, useState, useCallback } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Dynamic } from "@/components/utils/Dynamic";
import {
  DEFAULT_SPACE,
  PLACEHOLDER_REASONING,
  PLACEHOLDER_STATEMENT,
} from "@/constants/config";
import { useBasePath } from "@/hooks/useBasePath";
import { cn } from "@/lib/cn";
import { usePointData } from "@/queries/usePointData";
import { useSpace } from "@/queries/useSpace";
import { useUser } from "@/queries/useUser";
import { usePrivy } from "@privy-io/react-auth";
import {
  ReactFlowProvider,
  useReactFlow,
} from "@xyflow/react";
import { useAtom, useSetAtom } from "jotai";
import { NetworkIcon } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { EditModeProvider, useEditMode } from "@/components/graph/EditModeContext";
import { useGraphPoints } from "@/components/graph/useGraphPoints";
import { usePublishViewpoint } from "@/mutations/usePublishViewpoint";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Loader } from "@/components/ui/loader";
import { ErrorBoundary } from "react-error-boundary";
import { Trash2Icon } from "lucide-react";
import { negatedPointIdAtom } from "@/atoms/negatedPointIdAtom";

function PointCardWrapper({
  point,
  className,
  onDelete,
}: {
  point: { pointId: number; parentId?: number | string };
  className?: string;
  onDelete: (pointId: string) => void;
}) {
  const searchParams = useSearchParams();
  const isForking = searchParams.get('fork') === 'true';
  const pointDataQuery = usePointData(point.pointId);
  const pointData = isForking ? null : pointDataQuery.data;
  const { originalPosterId } = useOriginalPoster();
  const setNegatedPointId = useSetAtom(negatedPointIdAtom);
  const reactFlow = useReactFlow<AppNode>();
  const editMode = useEditMode();
  const [deletedPointIds] = useAtom(deletedPointIdsAtom);

  if (deletedPointIds.has(point.pointId)) {
    return null;
  }

  if (!pointData)
    return (
      <div className={cn("h-32 w-full bg-muted animate-pulse", className)} />
    );

  return (
    <PointCard
      className={className}
      pointId={point.pointId}
      content={pointData.content}
      createdAt={pointData.createdAt}
      cred={pointData.cred}
      favor={pointData.favor}
      amountSupporters={pointData.amountSupporters}
      amountNegations={pointData.amountNegations}
      viewerContext={{ viewerCred: pointData.viewerCred }}
      onNegate={() => setNegatedPointId(point.pointId)}
      originalPosterId={originalPosterId}
    >
      {editMode && (
        <AuthenticatedActionButton
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2"
          onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
            e.stopPropagation();
            const targetNode = reactFlow.getNodes().find(
              (n: AppNode) => n.type === "point" &&
                n.data?.pointId === point.pointId
            );

            if (!targetNode) {
              return;
            }

            onDelete(targetNode.id);
          }}
        >
          <Trash2Icon className="size-4" />
        </AuthenticatedActionButton>
      )}
    </PointCard>
  );
}

function ViewpointContent() {
  const { updateNodeData, deleteElements } = useReactFlow();
  const { data: user } = useUser();
  const { push } = useRouter();
  const basePath = useBasePath();
  const isForking = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).has('fork')
    : false;
  const spaceQuery = useSpace();
  const space = isForking ? null : spaceQuery;
  const [canvasEnabled, setCanvasEnabled] = useAtom(canvasEnabledAtom);
  const [isMobile, setIsMobile] = useState(false);
  const reactFlow = useReactFlow<AppNode>();
  const [graph, setGraph] = useAtom(viewpointGraphAtom);
  const [graphRevision, setGraphRevision] = useState(0);
  const points = useGraphPoints();
  const [statement, setStatement] = useAtom(viewpointStatementAtom);
  const [reasoning, setReasoning] = useAtom(viewpointReasoningAtom);
  const pathname = usePathname();
  const editMode = useEditMode();
  const [_, setDeletedPointIds] = useAtom(deletedPointIdsAtom);

  useEffect(() => {
    updateNodeData("statement", {
      statement: statement.length > 0 ? statement : PLACEHOLDER_STATEMENT,
    });
  }, [statement, updateNodeData]);

  const { mutateAsync: publishViewpoint, isPending: isPublishing } =
    usePublishViewpoint();
  const canPublish = useMemo(() => {
    return (
      statement.length > 0 && reasoning.length > 0 && graph.edges.length > 0
    );
  }, [graph, statement, reasoning]);
  const [hoveredPointId, setHoveredPointId] = useAtom(hoveredPointIdAtom);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (pathname !== `${basePath}/viewpoint/new`) {
      return;
    }

    if (!isForking && localStorage.getItem("justPublished") === "true") {
      localStorage.removeItem("justPublished");
      setReasoning("");
      setStatement("");
      setGraph(initialViewpointGraph);
    }
  }, [pathname, setReasoning, setStatement, setGraph, basePath, isForking]);

  useEffect(() => {
    if (isForking) {
      const search = new URLSearchParams(window.location.search);
      const graphParam = search.get("graph");

      if (graphParam) {
        try {
          const parsedGraph = JSON.parse(decodeURIComponent(graphParam));
          setGraph(parsedGraph);
        } catch (error) {
        }
      } else {
        console.warn("[FORK] No graph parameter found in URL");
      }
    }
  }, [isForking, setGraph]);

  useEffect(() => {
    const hasStatement = graph?.nodes?.some(n => n.type === "statement");

    if (!isForking && (!graph || !hasStatement)) {
      setGraph(initialViewpointGraph);
    }
  }, [graph, isForking, setGraph]);

  const clearGraph = () => {
    setReasoning("");
    setStatement("");
    setGraph(initialViewpointGraph);
    // Explicitly set nodes and edges in React Flow.
    reactFlow.setNodes(initialViewpointGraph.nodes);
    reactFlow.setEdges(initialViewpointGraph.edges);
    setDeletedPointIds(new Set()); // Clear deleted points
  };

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
          edge => edge.target === currentId && edge.source !== 'statement'
        );

        childEdges.forEach(edge => {
          const childNodeId = edge.source;
          if (!nodesToRemove.has(childNodeId)) {
            nodesToRemove.add(childNodeId);
            queue.push(childNodeId);
          }
        });
      }

      // Update Jotai state directly with a new graph value rather than using a function updater
      setGraph({
        nodes: currentNodes.filter((n: { id: string }) => !nodesToRemove.has(n.id)),
        edges: currentEdges.filter((e: { id: string }) => !edgesToRemove.has(e.id))
      });

      // Update React Flow
      const elementsToDelete = {
        nodes: Array.from(nodesToRemove).map((id: string) => ({ id })),
        edges: Array.from(edgesToRemove).map((id: string) => ({ id }))
      };

      deleteElements(elementsToDelete);

      // Get the pointId from the node data
      const nodeToRemove = currentNodes.find(n => n.id === pointIdToRemove);
      const pointId =
        nodeToRemove?.type === "point" ? nodeToRemove.data.pointId : undefined;

      // Add to deletedPointIdsAtom
      if (pointId) {
        setDeletedPointIds(prev => {
          const newSet = new Set(prev).add(pointId);
          return newSet;
        });
      }
    },
    [setGraph, deleteElements, reactFlow, setDeletedPointIds]
  );

  return (
    <main className="relative flex-grow sm:grid sm:grid-cols-[1fr_minmax(200px,600px)_1fr] md:grid-cols-[0_minmax(200px,400px)_1fr] bg-background">
      <div className="w-full sm:col-[2] flex flex-col border-x">
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
                  <span className="text-md font-semibold">
                    s/{space.data.id}
                  </span>
                </>
              </div>
            ) : (
              <div />
            )}

            <h1 className="text-sm font-bold">New Viewpoint</h1>

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
              <Button
                variant={"ghost"}
                size={"icon"}
                className="mr-2"
                onClick={clearGraph}
              >
                <Trash2Icon />
              </Button>
              <AuthenticatedActionButton
                size={"sm"}
                className="rounded-full w-24"
                disabled={!canPublish || isPublishing}
                rightLoading={isPublishing}
                onClick={async () => {
                  try {
                    const id = await publishViewpoint({
                      title: statement,
                      description: reasoning,
                      graph,
                    });
                    localStorage.setItem("justPublished", "true");
                    push(`${basePath}/viewpoint/${id}`);
                  } catch (error) {
                    console.error("Failed to publish viewpoint:", error);
                    alert(
                      "Failed to publish viewpoint. See console for details."
                    );
                  }
                }}
              >
                Publish
              </AuthenticatedActionButton>
            </div>
          </div>
          <Separator />

          <div className="overflow-auto">
            <div className="flex flex-col p-2 gap-2">
              <Label className="ml-1">Title</Label>
              <Input
                placeholder={PLACEHOLDER_STATEMENT}
                value={statement}
                onChange={(e) => setStatement(e.target.value)}
              />

              <Label className="ml-1">
                By{" "}
                <span className="font-bold text-sm text-yellow-500">
                  {user?.username}
                </span>
              </Label>

              <div>
                <Label className="ml-1">Description</Label>{" "}
                <span className="text-muted-foreground text-xs">
                  (Markdown supported)
                </span>
              </div>
              <div className="grid grid-cols-1 grid-rows-1">
                <Textarea
                  className="relative col-[1/1] h-full row-[1/1] opacity-0 focus-within:opacity-100"
                  value={reasoning}
                  onChange={(e) => setReasoning(e.target.value)}
                  placeholder={PLACEHOLDER_REASONING}
                />
                <div className="border prose dark:prose-invert max-w-none [&>p]:mb-4 [&>p]:leading-7 [&>h1]:mt-8 [&>h1]:mb-4 [&>h2]:mt-6 [&>h2]:mb-4 [&>h3]:mt-4 [&>h3]:mb-2 [&>ul]:mb-4 [&>ul]:ml-6 [&>ol]:mb-4 [&>ol]:ml-6 [&>li]:mb-2 [&>blockquote]:border-l-4 [&>blockquote]:border-muted [&>blockquote]:pl-4 [&>blockquote]:italic rounded-md px-3 py-2 text-sm col-[1/1] row-[1/1] selection:invisible overflow-x-clip">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {reasoning}
                  </ReactMarkdown>
                </div>
              </div>
            </div>

            {points.length > 0 && (
              <div className="flex flex-col w-full">
                <span className="text-muted-foreground text-xs uppercase font-semibold tracking-widest w-full p-2 border-y text-center">
                  Points
                </span>
                <Dynamic>
                  {points.map((point) => (
                    <div key={`${point.pointId}-card-wrapper`} className="relative">
                      <PointCardWrapper
                        key={`${point.pointId}-card`}
                        point={point}
                        className={cn(
                          "border-b",
                          hoveredPointId === point.pointId &&
                          "shadow-[inset_0_0_0_2px_hsl(var(--primary))]",
                          editMode && "pr-10"
                        )}
                        onDelete={removePointFromViewpoint}
                      />
                    </div>
                  ))}
                </Dynamic>
              </div>
            )}
          </div>
        </div>
      </div>

      <Dynamic>
        <GraphView
          key={`graph-${graphRevision}`}
          isNew={true}
          onInit={(reactFlow) => {
            reactFlow.setNodes(graph.nodes);
            reactFlow.setEdges(graph.edges);
            reactFlow.fitView();
          }}
          defaultNodes={graph.nodes}
          defaultEdges={graph.edges}
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
          statement={statement}
          className={cn(
            "!fixed md:!sticky inset-0 top-[var(--header-height)] md:inset-[reset]  !h-[calc(100vh-var(--header-height))] md:top-[var(--header-height)] md: !z-10 md:z-auto",
            !canvasEnabled && isMobile && "hidden"
          )}
          onDeleteNode={removePointFromViewpoint}
        />
      </Dynamic>

      <NegateDialog />
    </main>
  );
}

function ViewpointPageContent() {
  const { ready } = usePrivy();
  const { data: user, isLoading: isLoadingUser } = useUser();

  if (!ready || isLoadingUser) {
    return (
      <main className="relative flex-grow sm:grid sm:grid-cols-[1fr_minmax(200px,600px)_1fr] md:grid-cols-[0_minmax(200px,400px)_1fr] bg-background">
        <div className="w-full sm:col-[2] flex flex-col border-x">
          <div className="relative flex-grow bg-background">
            <div className="sticky top-0 z-10 w-full flex items-center justify-between gap-3 px-4 py-3 bg-background/70 backdrop-blur">
              <div className="h-8 w-32 bg-muted animate-pulse rounded" />
              <div className="h-8 w-24 bg-muted animate-pulse rounded" />
            </div>
            <div className="flex items-center justify-center min-h-[calc(100vh-var(--header-height))]">
              <Loader className="size-6" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="relative flex-grow sm:grid sm:grid-cols-[1fr_minmax(200px,600px)_1fr] md:grid-cols-[0_minmax(200px,400px)_1fr] bg-background">
        <div className="w-full sm:col-[2] flex flex-col border-x items-center justify-center">
          <p>Please log in to continue</p>
        </div>
      </main>
    );
  }

  return (
    <ErrorBoundary
      fallbackRender={({ error }) => (
        <div className="flex flex-col items-center justify-center p-4">
          <h2 className="text-lg font-semibold mb-2">Something went wrong</h2>
          <pre className="text-sm text-red-500 p-2 bg-red-50 rounded">
            {error.message}
          </pre>
        </div>
      )}
    >
      <ReactFlowProvider>
        <ViewpointContent />
      </ReactFlowProvider>
    </ErrorBoundary>
  );
}

export default function NewViewpointPage() {
  const { user: privyUser } = usePrivy();
  const searchParams = useSearchParams();

  return (
    <EditModeProvider editMode={true}>
      <OriginalPosterProvider originalPosterId={privyUser?.id}>
        <ViewpointPageContent key={searchParams.toString()} />
      </OriginalPosterProvider>
    </EditModeProvider>
  );
}
