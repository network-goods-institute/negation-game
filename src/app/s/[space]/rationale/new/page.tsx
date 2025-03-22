"use client";

import {
  initialViewpointGraph,
  viewpointGraphAtom,
  viewpointReasoningAtom,
  viewpointStatementAtom,
  collapsedPointIdsAtom,
  ViewpointGraph,
} from "@/atoms/viewpointAtoms";
import { useEffect, useMemo, useState, useCallback, useTransition } from "react";
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
import { AuthenticatedActionButton } from "@/components/ui/AuthenticatedActionButton";
import { Button } from "@/components/ui/button";
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
import { getSpaceFromPathname } from "@/lib/negation-game/getSpaceFromPathname";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useFavorHistory } from "@/queries/useFavorHistory";

function PointCardWrapper({
  point,
  className,
}: {
  point: { pointId: number; parentId?: number | string };
  className?: string;
}) {
  const pointDataQuery = usePointData(point.pointId);
  const pointData = pointDataQuery.data;
  const { originalPosterId } = useOriginalPoster();
  const setNegatedPointId = useSetAtom(negatedPointIdAtom);
  const [collapsedPointIds] = useAtom(collapsedPointIdsAtom);
  const [hoveredPointId] = useAtom(hoveredPointIdAtom);

  const { data: favorHistory } = useFavorHistory({
    pointId: point.pointId,
    timelineScale: "1W"
  });

  if (collapsedPointIds.has(point.pointId)) {
    return null;
  }

  if (!pointData)
    return (
      <div className={cn("h-32 w-full bg-muted animate-pulse", className)} />
    );

  return (
    <PointCard
      className={cn(
        className,
        hoveredPointId === point.pointId &&
        "shadow-[inset_0_0_0_2px_hsl(var(--primary))]"
      )}
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
      inRationale={true}
      favorHistory={favorHistory}
    />
  );
}

function ViewpointContent() {
  const { updateNodeData } = useReactFlow();
  const { data: user } = useUser();
  const { push } = useRouter();
  const basePath = useBasePath();
  const pathname = usePathname();
  const [isCopiedFromSessionStorage, setIsCopiedFromSessionStorage] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const spaceQuery = useSpace();
  const space = spaceQuery;
  const currentSpace = getSpaceFromPathname(pathname);
  const [canvasEnabled, setCanvasEnabled] = useAtom(canvasEnabledAtom);
  const [isMobile, setIsMobile] = useState(false);
  const reactFlow = useReactFlow<AppNode>();
  const [graph, setGraph] = useAtom(viewpointGraphAtom);
  const [graphRevision, setGraphRevision] = useState(0);
  const points = useGraphPoints();
  const [statement, setStatement] = useAtom(viewpointStatementAtom);
  const [reasoning, setReasoning] = useAtom(viewpointReasoningAtom);
  const [_, setCollapsedPointIds] = useAtom(collapsedPointIdsAtom);

  const spaceObj = space?.data?.id;
  const [viewGraph, setViewGraph] = useAtom(viewpointGraphAtom);
  const [viewpointStatement, setViewpointStatement] = useAtom(viewpointStatementAtom);

  useEffect(() => {
    if (spaceObj && !isCopiedFromSessionStorage) {
      const invalidDraft = viewGraph.nodes.some((node) => {
        if (node.type !== "point") return false;
        return false;
      });

      if (invalidDraft) {
        setViewGraph(initialViewpointGraph);
        setViewpointStatement("");
      }
    }
  }, [spaceObj, viewGraph.nodes, setViewGraph, setViewpointStatement, isCopiedFromSessionStorage]);

  useEffect(() => {
    updateNodeData("statement", {
      statement: statement.length > 0 ? statement : PLACEHOLDER_STATEMENT,
    });
  }, [statement, updateNodeData]);

  const { mutateAsync: publishViewpoint, isPending: isPublishing } =
    usePublishViewpoint();
  const canPublish = useMemo(() => {
    return (
      statement.length > 0 && graph.edges.length > 0
    );
  }, [graph, statement]);
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

    if (!isCopiedFromSessionStorage && localStorage.getItem("justPublished") === "true") {
      localStorage.removeItem("justPublished");
      setReasoning("");
      setStatement("");
      setGraph(initialViewpointGraph);
    }
  }, [pathname, setReasoning, setStatement, setGraph, basePath, isCopiedFromSessionStorage]);

  useEffect(() => {
    // Get the current space
    const pathname = window.location.pathname;
    const currentSpace = getSpaceFromPathname(pathname) || 'default';

    // Check if we have copied data in sessionStorage for this space
    const storageKey = `copyingViewpoint:${currentSpace}`;
    const viewpointDataStr = sessionStorage.getItem(storageKey);

    if (viewpointDataStr) {
      try {
        const viewpointData = JSON.parse(viewpointDataStr);

        // Generate a new graph with unique IDs to prevent duplicate keys
        const regeneratedGraph = regenerateGraphIds(viewpointData.graph);

        // Set the graph, title, and description
        setGraph(regeneratedGraph);
        setStatement(viewpointData.title);
        setReasoning(viewpointData.description);

        // Remove the data from sessionStorage to prevent reloading it
        sessionStorage.removeItem(storageKey);

        // Mark that we've loaded from sessionStorage
        setIsCopiedFromSessionStorage(true);

        // Update the reactFlow nodes and edges if reactFlow is available
        if (reactFlow) {
          const nodeIds = regeneratedGraph.nodes.map(n => n.id);
          const hasDuplicates = new Set(nodeIds).size !== nodeIds.length;
          if (hasDuplicates) {
            const idCounts: Record<string, number> = {};
            nodeIds.forEach(id => {
              idCounts[id] = (idCounts[id] || 0) + 1;
            });

          }

          reactFlow.setNodes(regeneratedGraph.nodes);
          reactFlow.setEdges(regeneratedGraph.edges);
        }
      } catch (error) {
        console.error("Error loading copied rationale:", error);
      }
    }
  }, [setGraph, setStatement, setReasoning, reactFlow]);

  useEffect(() => {
    const hasStatement = graph?.nodes?.some(n => n.type === "statement");

    if (!isCopiedFromSessionStorage && (!graph || !hasStatement)) {
      setGraph(initialViewpointGraph);
    }
  }, [graph, isCopiedFromSessionStorage, setGraph]);

  const clearGraph = useCallback(() => {
    startTransition(() => {
      setReasoning("");
      setStatement("");
      setGraph(initialViewpointGraph);
      setCollapsedPointIds(new Set());

      if (reactFlow) {
        reactFlow.setNodes(initialViewpointGraph.nodes);
        reactFlow.setEdges(initialViewpointGraph.edges);
      }

      setIsConfirmDialogOpen(false);

      // Clear any session storage data
      if (currentSpace) {
        const storageKey = `copyingViewpoint:${currentSpace}`;
        sessionStorage.removeItem(storageKey);
      }

      // Navigate back to the correct page based on space
      if (currentSpace && currentSpace !== "null" && currentSpace !== "undefined") {
        push(`/s/${currentSpace}`);
      } else {
        push("/");
      }
    });
  }, [setReasoning, setStatement, setGraph, reactFlow, setCollapsedPointIds, push, currentSpace]);

  const openConfirmDialog = useCallback(() => {
    setIsConfirmDialogOpen(true);
  }, []);

  return (
    <main className="relative flex-grow sm:grid sm:grid-cols-[1fr_minmax(200px,600px)_1fr] md:grid-cols-[0_minmax(200px,400px)_1fr] bg-background">
      <div className="w-full sm:col-[2] flex flex-col border-x">
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

            <h1 className="text-sm font-bold">New Rationale</h1>

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
                onClick={openConfirmDialog}
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
                    push(`${basePath}/rationale/${id}`);
                  } catch (error) {
                    console.error("Failed to publish rationale:", error);
                    alert(
                      "Failed to publish rationale. See console for details."
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
                  {points.map((point) => {
                    const pointNode = reactFlow.getNodes().find(
                      (n) => n.type === "point" && n.data?.pointId === point.pointId
                    );
                    return (
                      <div
                        key={`${point.pointId}-card-wrapper`}
                        className="relative"
                      >
                        <PointCardWrapper
                          key={`${point.pointId}-card`}
                          point={point}
                          className={cn(
                            "border-b",
                            hoveredPointId === point.pointId &&
                            "shadow-[inset_0_0_0_2px_hsl(var(--primary))]"
                          )}
                        />
                      </div>
                    );
                  })}
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
          onNodesChange={(changes) => {
            const { viewport, ...graph } = reactFlow.toObject();
            setGraph(graph);
          }}
          onEdgesChange={(changes) => {
            const { viewport, ...graph } = reactFlow.toObject();
            setGraph(graph);
          }}
          onSaveChanges={async () => {
            try {
              const id = await publishViewpoint({
                title: statement,
                description: reasoning,
                graph,
              });
              localStorage.setItem("justPublished", "true");
              push(`${basePath}/rationale/${id}`);
              return true; // Return true to indicate successful save
            } catch (error: any) {
              console.error("Failed to publish rationale:", error);
              alert(
                "Failed to publish rationale. See console for details."
              );
              return false; // Return false to indicate failed save
            }
          }}
          statement={statement}
          className={cn(
            "!fixed md:!sticky inset-0 top-[var(--header-height)] md:inset-[reset]  !h-[calc(100vh-var(--header-height))] md:top-[var(--header-height)] md: !z-10 md:z-auto",
            !canvasEnabled && isMobile && "hidden"
          )}
        />
      </Dynamic>

      <NegateDialog />

      <AlertDialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Abandon Rationale</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to abandon this rationale? All your work will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={clearGraph} disabled={isPending}>
              {isPending ? "Abandoning..." : "Yes, abandon it"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
    <EditModeProvider>
      <OriginalPosterProvider originalPosterId={privyUser?.id}>
        <ViewpointPageContent key={searchParams.toString()} />
      </OriginalPosterProvider>
    </EditModeProvider>
  );
}

const regenerateGraphIds = (graph: ViewpointGraph): ViewpointGraph => {

  // Create a mapping from old IDs to new IDs
  const idMap = new Map<string, string>();

  // Keep the statement node ID as is
  const statementNode = graph.nodes.find(node => node.type === 'statement');
  if (statementNode) {
    idMap.set(statementNode.id, 'statement');
  }

  // Generate new IDs for all other nodes
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
