"use client";

import {
  initialViewpointGraph,
  viewpointGraphAtom,
  viewpointReasoningAtom,
  viewpointStatementAtom,
  collapsedPointIdsAtom,
  clearViewpointState,
  copiedFromIdAtom,
} from "@/atoms/viewpointAtoms";
import { useEffect, useMemo, useState, useCallback, useTransition, useRef } from "react";
import { canvasEnabledAtom } from "@/atoms/canvasEnabledAtom";
import { hoveredPointIdAtom } from "@/atoms/hoveredPointIdAtom";
import { initialSpaceTabAtom } from "@/atoms/navigationAtom";
import { AppNode } from "@/components/graph/AppNode";
import { GraphView } from "@/components/graph/GraphView";
import {
  OriginalPosterProvider,
  useOriginalPoster,
} from "@/components/graph/OriginalPosterContext";
import { PointCard } from "@/components/PointCard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AuthenticatedActionButton } from "@/components/AuthenticatedActionButton";
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
import { useAtom, useSetAtom, useAtomValue } from "jotai";
import { NetworkIcon, ArrowLeftIcon } from "lucide-react";
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
import { useVisitedPoints } from "@/hooks/useVisitedPoints";

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
  const [hoveredPointId] = useAtom(hoveredPointIdAtom);

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

function ViewpointContent({ setInitialTab }: { setInitialTab: (update: "points" | "rationales" | null) => void }) {
  const { updateNodeData } = useReactFlow();
  const { data: user } = useUser();
  const router = useRouter();
  const { push } = router;
  const basePath = useBasePath();
  const pathname = usePathname();
  const [isCopiedFromSessionStorage, setIsCopiedFromSessionStorage] = useState(false);
  const setCopiedFromId = useSetAtom(copiedFromIdAtom);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isInitialLoadDialogOpen, setIsInitialLoadDialogOpen] = useState(false);
  const [hasCheckedInitialLoad, setHasCheckedInitialLoad] = useState(false);
  const [isReactFlowReady, setIsReactFlowReady] = useState(false);
  const [isDiscardingWithoutNav, setIsDiscardingWithoutNav] = useState(false);
  const [isCopyOperation, setIsCopyOperation] = useState(false);
  const hasLoadedCopyData = useRef(false);
  const [graphRevision, setGraphRevision] = useState(0);

  const spaceQuery = useSpace();
  const space = spaceQuery;
  const currentSpace = getSpaceFromPathname(pathname);

  const [canvasEnabled, setCanvasEnabled] = useAtom(canvasEnabledAtom);
  const [isMobile, setIsMobile] = useState(false);
  const reactFlow = useReactFlow<AppNode>();
  const [graph, setGraph] = useAtom(viewpointGraphAtom);
  const points = useGraphPoints();
  const [statement, setStatement] = useAtom(viewpointStatementAtom);
  const [reasoning, setReasoning] = useAtom(viewpointReasoningAtom);
  const [_, setCollapsedPointIds] = useAtom(collapsedPointIdsAtom);

  useEffect(() => {
    // If we've already loaded copy data, skip this effect
    if (hasLoadedCopyData.current) {
      console.log("Already loaded copy data, skipping effect");
      return;
    }

    // Check for the justPublished flag first - if it's set, we're coming
    // from a publish or save operation and should NOT show the draft dialog
    const wasJustPublished = localStorage.getItem("justPublished") === "true";
    if (wasJustPublished) {
      console.log("Just published flag detected, clearing and skipping draft detection");

      // Clear localStorage flag
      localStorage.removeItem("justPublished");

      // Reset all state to ensure a clean slate using atoms
      setStatement("");
      setReasoning("");
      setGraph(initialViewpointGraph);
      setCollapsedPointIds(new Set());
      setCopiedFromId(undefined);

      // Reset ReactFlow nodes and edges directly if available
      if (reactFlow) {
        reactFlow.setNodes(initialViewpointGraph.nodes);
        reactFlow.setEdges(initialViewpointGraph.edges);
      }

      // Skip draft detection
      setHasCheckedInitialLoad(true);
      return;
    }

    // IMPORTANT: Always treat missing currentSpace as 'global'
    const effectiveSpace = currentSpace || 'global';

    const storageKey = `copyingViewpoint:${effectiveSpace}`;
    const copyData = sessionStorage.getItem(storageKey);

    if (copyData) {
      try {
        const parsedData = JSON.parse(copyData);

        if (parsedData && typeof parsedData === 'object' && parsedData.isCopyOperation === true) {
          console.log("Found copy operation data, loading it");
          setIsCopyOperation(true);
          setIsCopiedFromSessionStorage(true);
          setHasCheckedInitialLoad(true);
          setCopiedFromId(parsedData.copiedFromId);

          // Load the copied data using ONLY atom setters (single source of truth)
          if (parsedData.graph) {
            // Set graph using atom
            setGraph(parsedData.graph);

            // Mark that we've loaded the data to prevent reloading
            hasLoadedCopyData.current = true;
          }

          // Set statement and reasoning using atoms
          if (parsedData.title) {
            setStatement(parsedData.title);
          }

          if (parsedData.description) {
            setReasoning(parsedData.description);
          }

          // Increment revision to force GraphView remount, as copying is a bit flaky
          setGraphRevision(prev => prev + 1);

          updateNodeData("statement", {
            statement: parsedData.title || PLACEHOLDER_STATEMENT,
            _lastUpdated: Date.now()
          });

          // Clear the session storage data after loading
          sessionStorage.removeItem(storageKey);
          return; // Exit early - we're in a copy operation
        }
      } catch (e) {
        console.error("Error parsing copy data from session storage:", e);
      }
    }

    // Only proceed with other checks if ReactFlow is ready
    if (!isReactFlowReady || !reactFlow) {
      return;
    }

    // If we get here, we're not in a copy operation
    // Now check for drafts if we haven't already
    if (!hasCheckedInitialLoad) {
      const currentNodes = reactFlow.getNodes();

      // Consider draft exists if:
      // 1. We have a non-empty statement in atom, OR
      // 2. We have graph edges in atom, OR
      // 3. We have point nodes in the ReactFlow instance
      const hasStatement = statement.trim().length > 0;
      const hasEdges = graph.edges.length > 0;
      const hasRealPointNodes = currentNodes.some(node => {
        const isRealPoint = node.type === "point" && 'pointId' in node.data;
        return isRealPoint;
      });

      const hasDraft = hasStatement || hasEdges || hasRealPointNodes;

      if (hasDraft) {
        setIsInitialLoadDialogOpen(true);
      }
    }

    setHasCheckedInitialLoad(true);

    // Cleanup function to reset state when component unmounts
    return () => {
      hasLoadedCopyData.current = false;
      setHasCheckedInitialLoad(false);

      // Only clear copy operation flags if we're actually leaving the page
      if (document.visibilityState === 'hidden' || !document.body.contains(document.activeElement)) {
        setIsCopyOperation(false);
        setIsCopiedFromSessionStorage(false);
      }
    };
  }, [
    setCollapsedPointIds,
    currentSpace,
    reactFlow,
    isReactFlowReady,
    hasCheckedInitialLoad,
    setGraph,
    setStatement,
    setReasoning,
    setGraphRevision,
    updateNodeData,
    statement,
    reasoning,
    graph,
    setCopiedFromId,
  ]);

  // Use a dedicated effect to ensure the copy state gets properly reset when leaving the page
  useEffect(() => {
    // Setup event listener for when the user is about to leave the page
    const handleBeforeUnload = () => {
      // Clean up copy flags in case we're navigating away
      hasLoadedCopyData.current = false;
      setIsCopyOperation(false);
      setIsCopiedFromSessionStorage(false);

      // Also clean session storage to ensure a fresh state on return
      // Always treat missing currentSpace as 'global'
      const effectiveSpace = currentSpace || 'global';
      const storageKey = `copyingViewpoint:${effectiveSpace}`;
      sessionStorage.removeItem(storageKey);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    // Clean up
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      handleBeforeUnload(); // Also run the cleanup when unmounting
    };
  }, [currentSpace, setIsCopyOperation, setIsCopiedFromSessionStorage]);

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
      _lastUpdated: Date.now()
    });
  }, [statement, updateNodeData]);

  useEffect(() => {
    if (isCopiedFromSessionStorage && statement && reactFlow) {
      setTimeout(() => {
        updateNodeData("statement", {
          statement: statement.length > 0 ? statement : PLACEHOLDER_STATEMENT,
          _lastUpdated: Date.now()
        });

        // Also set modified to false since this is a fresh copy
        // We need to use any here because markAsModified is added dynamically
        const reactFlowWithCustomMethods = reactFlow as any;
        if (typeof reactFlowWithCustomMethods.markAsModified === 'function') {
          reactFlow.setNodes(reactFlow.getNodes());
        }
      }, 400);
    }
  }, [isCopiedFromSessionStorage, statement, updateNodeData, reactFlow]);

  const { mutateAsync: publishViewpoint, isPending: isPublishing } =
    usePublishViewpoint();
  const canPublish = useMemo(() => {
    return (
      statement.length > 0 && graph.edges.length > 0
    );
  }, [graph, statement]);
  const [hoveredPointId, setHoveredPointId] = useAtom(hoveredPointIdAtom);
  const copiedFromIdValue = useAtomValue(copiedFromIdAtom);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const clearGraphAndState = useCallback(() => {
    startTransition(() => {
      // Set all atoms back to their defaults
      setReasoning("");
      setStatement("");
      setGraph(initialViewpointGraph);
      setCollapsedPointIds(new Set());
      setCopiedFromId(undefined);

      // Also reset ReactFlow directly if available
      if (reactFlow) {
        reactFlow.setNodes(initialViewpointGraph.nodes);
        reactFlow.setEdges(initialViewpointGraph.edges);
      }

      setIsConfirmDialogOpen(false);

      // Clear any session storage data - always treat missing currentSpace as 'global'
      const effectiveSpace = currentSpace || 'global';
      const storageKey = `copyingViewpoint:${effectiveSpace}`;
      sessionStorage.removeItem(storageKey);

      // Reset copy operation state
      setIsCopyOperation(false);
      setIsCopiedFromSessionStorage(false);

      // Set justPublished flag to indicate published state without 
      // clearing localStorage directly (atom will handle storage via atomWithStorage)
      clearViewpointState(false);

      // Navigate back to the correct page based on space
      const targetPath = basePath && basePath.startsWith('/s/') ? basePath : '/';
      push(targetPath);
    });
  }, [setReasoning, setStatement, setGraph, reactFlow, setCollapsedPointIds, setCopiedFromId, push, currentSpace, basePath]);

  const openConfirmDialog = useCallback(() => {
    setIsConfirmDialogOpen(true);
  }, []);

  const handleDiscardWithoutNavigation = useCallback(() => {
    setIsDiscardingWithoutNav(true);
    startTransition(() => {
      try {
        // Set all atoms back to their defaults
        setReasoning("");
        setStatement("");
        setGraph(initialViewpointGraph);
        setCollapsedPointIds(new Set());
        setCopiedFromId(undefined);

        // Also reset ReactFlow directly if available
        if (reactFlow) {
          reactFlow.setNodes(initialViewpointGraph.nodes);
          reactFlow.setEdges(initialViewpointGraph.edges);
        }

        // Clear any session storage data - always treat missing currentSpace as 'global'
        const effectiveSpace = currentSpace || 'global';
        const storageKey = `copyingViewpoint:${effectiveSpace}`;
        sessionStorage.removeItem(storageKey);

        // Reset copy operation state
        setIsCopyOperation(false);
        setIsCopiedFromSessionStorage(false);

        // Set justPublished flag to indicate published state without 
        // clearing localStorage directly (atom will handle storage via atomWithStorage)
        clearViewpointState(false);

        setIsInitialLoadDialogOpen(false);
      } finally {
        setIsDiscardingWithoutNav(false);
      }
    });
  }, [setReasoning, setStatement, setGraph, reactFlow, setCollapsedPointIds, setCopiedFromId, currentSpace]);

  const handleBackClick = useCallback(() => {
    const targetPath = basePath && basePath.startsWith('/s/') ? basePath : '/';
    push(targetPath);
  }, [push, basePath]);

  const handlePublish = useCallback(async () => {
    const currentCopiedFromId = copiedFromIdValue;
    try {
      const rationaleId = await publishViewpoint({
        title: statement,
        description: reasoning,
        graph,
        copiedFromId: currentCopiedFromId,
      });

      clearViewpointState(true);
      setStatement("");
      setReasoning("");
      setGraph(initialViewpointGraph);
      setCollapsedPointIds(new Set());
      setCopiedFromId(undefined);

      if (reactFlow) {
        reactFlow.setNodes(initialViewpointGraph.nodes);
        reactFlow.setEdges(initialViewpointGraph.edges);
      }

      push(`${basePath}/rationale/${rationaleId}`);
    } catch (error: any) {
      console.error("Failed to publish rationale:", error);
      alert(
        "Failed to publish rationale. See console for details."
      );
    }
  }, [
    statement, reasoning, graph, publishViewpoint, clearViewpointState,
    setStatement, setReasoning, setGraph, setCollapsedPointIds,
    setCopiedFromId,
    reactFlow, push, basePath, copiedFromIdValue
  ]);

  return (
    <main className="relative flex-grow sm:grid sm:grid-cols-[1fr_minmax(200px,600px)_1fr] md:grid-cols-[0_minmax(200px,400px)_1fr] bg-background">
      <div className="w-full sm:col-[2] flex flex-col border-x">
        <div className="relative flex-grow bg-background">
          <div className="sticky top-0 z-30 w-full flex items-center justify-between px-2 py-1.5 bg-background border-b">
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-1.5 px-2 rounded-md -ml-1"
                onClick={handleBackClick}
              >
                <ArrowLeftIcon className="size-4" />
                <span className="text-sm">Back</span>
              </Button>
              <h1 className="text-sm font-bold ml-2">New Rationale</h1>
            </div>
          </div>
          <Separator />

          <div className="sticky top-[calc(2.5rem+1px)] z-50 w-full flex items-center justify-between gap-3 px-4 py-3 bg-background/70 backdrop-blur">
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

            <div className="flex gap-sm items-center text-muted-foreground">
              <Button
                size={"icon"}
                variant={canvasEnabled ? "default" : "outline"}
                className="rounded-full p-2 size-9 sm:hidden"
                onClick={() => {
                  setCanvasEnabled(!canvasEnabled);
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
                onClick={handlePublish}
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
                  {points.map((point, index) => {
                    const pointNode = reactFlow.getNodes().find(
                      (n) => n.type === "point" && n.data?.pointId === point.pointId
                    );
                    return (
                      <div
                        key={`${point.pointId}-card-wrapper-${index}`}
                        className="relative"
                      >
                        <PointCardWrapper
                          key={`${point.pointId}-card-${index}`}
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
          onInit={(instance) => {
            // Set reactFlow as ready after initialization
            setIsReactFlowReady(true);
            instance.setNodes(graph.nodes);
            instance.setEdges(graph.edges);
          }}
          defaultNodes={graph.nodes}
          defaultEdges={graph.edges}
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
              clearViewpointState(true);
              setStatement("");
              setReasoning("");
              setGraph(initialViewpointGraph);
              setCollapsedPointIds(new Set());

              if (reactFlow) {
                reactFlow.setNodes(initialViewpointGraph.nodes);
                reactFlow.setEdges(initialViewpointGraph.edges);
              }
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
          hideShareButton={true}
        />
      </Dynamic>

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
            <AlertDialogAction onClick={clearGraphAndState} disabled={isPending}>
              {isPending ? "Abandoning..." : "Yes, abandon it"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={isInitialLoadDialogOpen && !isCopiedFromSessionStorage}
        onOpenChange={(open) => {
          // Only allow changing if we're not in a copy operation
          if (!isCopiedFromSessionStorage) {
            setIsInitialLoadDialogOpen(open);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Existing Draft Found</AlertDialogTitle>
            <AlertDialogDescription>
              Would you like to keep working on your existing draft or start fresh?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => setIsInitialLoadDialogOpen(false)}
              disabled={isDiscardingWithoutNav}
            >
              Keep Draft
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDiscardWithoutNavigation}
              disabled={isDiscardingWithoutNav}
              className="relative"
            >
              {isDiscardingWithoutNav ? (
                <>
                  <span className="opacity-0">Start Fresh</span>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="size-4 border-2 border-background border-t-transparent rounded-full animate-spin" />
                  </div>
                </>
              ) : (
                "Start Fresh"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}

function ViewpointPageContent({ setInitialTab }: { setInitialTab: (update: "points" | "rationales" | null) => void }) {
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
        <ViewpointContent setInitialTab={setInitialTab} />
      </ReactFlowProvider>
    </ErrorBoundary>
  );
}

export default function NewViewpointPage() {
  const { user: privyUser } = usePrivy();
  const searchParams = useSearchParams();
  const setInitialTab = useSetAtom(initialSpaceTabAtom);

  return (
    <EditModeProvider>
      <OriginalPosterProvider originalPosterId={privyUser?.id}>
        <ViewpointPageContent key={searchParams.toString()} setInitialTab={setInitialTab} />
      </OriginalPosterProvider>
    </EditModeProvider>
  );
}
