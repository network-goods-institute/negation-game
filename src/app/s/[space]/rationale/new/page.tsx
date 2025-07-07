"use client";

import {
  initialViewpointGraph,
  viewpointGraphAtom,
  viewpointReasoningAtom,
  viewpointStatementAtom,
  collapsedPointIdsAtom,
  clearViewpointState,
  viewpointTopicAtom,
  viewpointTopicIdAtom,
} from "@/atoms/viewpointAtoms";
import { useEffect, useState, useCallback, useTransition, useMemo } from "react";
import { canvasEnabledAtom } from "@/atoms/canvasEnabledAtom";
import { hoveredPointIdAtom } from "@/atoms/hoveredPointIdAtom";
import { initialSpaceTabAtom } from "@/atoms/navigationAtom";
import { AppNode } from "@/components/graph/nodes/AppNode";
import type { PointNode } from "@/components/graph/nodes/PointNode";
import { OriginalPosterProvider } from "@/components/contexts/OriginalPosterContext";
import { Separator } from "@/components/ui/separator";
import { Dynamic } from "@/components/utils/Dynamic";
import { decodeId } from "@/lib/negation-game/decodeId";
import { PLACEHOLDER_STATEMENT } from "@/constants/config";
import { useBasePath } from "@/hooks/utils/useBasePath";
import { cn } from "@/lib/utils/cn";
import { useSpace } from "@/queries/space/useSpace";
import { useUser } from "@/queries/users/useUser";
import { usePrivy } from "@privy-io/react-auth";
import {
  ReactFlowProvider,
  useReactFlow,
} from "@xyflow/react";
import { useAtom, useSetAtom } from "jotai";
import useRationaleDraftLifecycle from "@/hooks/viewpoints/useRationaleDraftLifecycle";
import usePublishRationale from "@/hooks/viewpoints/usePublishRationale";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader } from "@/components/ui/loader";
import { useCurrentSpace } from "@/hooks/utils/useCurrentSpace";
import NewRationaleHeader from "@/components/rationale/NewRationaleHeader";
import RationaleGraph from "@/components/rationale/RationaleGraph";
import NewRationaleForm from "@/components/rationale/NewRationaleForm";
import { useTopics } from "@/queries/topics/useTopics";
import useIsMobile from "@/hooks/ui/useIsMobile";
import { feedEnabledAtom } from "@/atoms/feedEnabledAtom";
import PointsFeedContainer from "@/components/rationale/PointsFeedContainer";
import { useCanCreateRationale } from "@/hooks/topics/useCanCreateRationale";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Lock } from "lucide-react";

function ViewpointContent({ setInitialTab }: { setInitialTab: (update: "points" | "rationales" | null) => void }) {
  const { updateNodeData } = useReactFlow();
  const router = useRouter();
  const { push } = router;
  const basePath = useBasePath();
  const currentSpace = useCurrentSpace();
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const {
    isCopiedFromSessionStorage,
    isInitialLoadDialogOpen,
    setIsInitialLoadDialogOpen,
    graphRevision,
    setGraphRevision,
    setIsReactFlowReady,
    isDiscardingWithoutNav,
  } = useRationaleDraftLifecycle();

  const spaceQuery = useSpace();
  const space = spaceQuery;
  const spaceId = space.data?.id;
  const { data: topicsData } = useTopics(spaceId || "");

  const [canvasEnabled, setCanvasEnabled] = useAtom(canvasEnabledAtom);
  const [feedEnabled, setFeedEnabled] = useAtom(feedEnabledAtom);
  useEffect(() => {
    setFeedEnabled(true);
  }, [setFeedEnabled]);
  const showFeed = feedEnabled;
  const isMobile = useIsMobile(640);
  const reactFlow = useReactFlow<AppNode>();
  const [graph, setGraph] = useAtom(viewpointGraphAtom);
  const points = useMemo(() => {
    // Narrow to only point nodes so TS knows node.data has point fields
    const pointNodes = graph.nodes.filter(
      (node): node is PointNode => node.type === "point"
    );
    return pointNodes.map((node) => ({
      pointId: node.data.pointId,
      parentId: node.data.parentId,
      initialPointData: node.data.initialPointData,
    }));
  }, [graph.nodes]);
  const [statement, setStatement] = useAtom(viewpointStatementAtom);
  const [reasoning, setReasoning] = useAtom(viewpointReasoningAtom);
  const [topic, setTopic] = useAtom(viewpointTopicAtom);
  const [topicId, setTopicId] = useAtom(viewpointTopicIdAtom);
  const setCollapsedPointIds = useSetAtom(collapsedPointIdsAtom);

  const [isEditingDescription, setIsEditingDescription] = useState(false);

  useEffect(() => {
    // Setup event listener for when the user is about to leave the page
    const handleBeforeUnload = () => {
      // Clean up copy flags in case we're navigating away
      setIsReactFlowReady(false);

      // Also clean session storage to ensure a fresh state on return
      const storageKey = currentSpace ? `copyingViewpoint:${currentSpace}` : `copyingViewpoint`;
      sessionStorage.removeItem(storageKey);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    // Clean up
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      handleBeforeUnload(); // Also run the cleanup when unmounting
    };
  }, [currentSpace, setIsReactFlowReady]);

  useEffect(() => {
    setIsReactFlowReady(true);
  }, [setIsReactFlowReady]);

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

  const { publish, isPublishing, canPublish } = usePublishRationale();
  const [hoveredPointId, setHoveredPointId] = useAtom(hoveredPointIdAtom);

  const headerSpaceData = space?.data
    ? { id: space.data.id, icon: space.data.icon ?? undefined }
    : undefined;
  // Wrap publish to ensure a string ID is always returned
  const handlePublish = useCallback(async (): Promise<string> => {
    const id = await publish();
    if (id === undefined) {
      throw new Error("Publish failed: no ID returned");
    }
    return id;
  }, [publish]);

  const searchParams = useSearchParams();
  const autoPublish = searchParams.get('autoPublish') === 'true';
  const preselectedTopicId = searchParams.get('topicId');
  const [autoPublishInvoked, setAutoPublishInvoked] = useState(false);

  const decodedTopicId = useMemo(() => {
    if (preselectedTopicId) {
      return decodeId(preselectedTopicId);
    }
    return null;
  }, [preselectedTopicId]);

  const { data: permissionData, isLoading: isPermissionLoading } = useCanCreateRationale(decodedTopicId);

  // Handle topic preselection from URL parameters
  useEffect(() => {
    if (preselectedTopicId && topicsData && !topic) {
      const decodedTopicId = decodeId(preselectedTopicId);
      if (decodedTopicId) {
        const matchingTopic = topicsData.find(t => t.id === decodedTopicId);
        if (matchingTopic) {
          setTopic(matchingTopic.name);
          setStatement(matchingTopic.name);
          setTopicId(matchingTopic.id);
        }
      }
    }
  }, [preselectedTopicId, topicsData, topic, setTopic, setTopicId]);

  useEffect(() => {
    if (
      isCopiedFromSessionStorage &&
      autoPublish &&
      !autoPublishInvoked &&
      canPublish
    ) {
      setAutoPublishInvoked(true);
      handlePublish();
    }
  }, [isCopiedFromSessionStorage, autoPublish, autoPublishInvoked, canPublish, handlePublish]);

  const clearGraphAndState = useCallback(() => {
    startTransition(() => {
      // Set all atoms back to their defaults
      setReasoning("");
      setStatement("");
      setTopic("");
      setTopicId(undefined);
      setGraph(initialViewpointGraph);
      setCollapsedPointIds(new Set());
      setIsReactFlowReady(false);

      // Also reset ReactFlow directly if available
      if (reactFlow) {
        reactFlow.setNodes(initialViewpointGraph.nodes);
        reactFlow.setEdges(initialViewpointGraph.edges);
      }

      setIsConfirmDialogOpen(false);

      // Clear any session storage data - always treat missing currentSpace as 'global'
      const storageKey = currentSpace ? `copyingViewpoint:${currentSpace}` : `copyingViewpoint`;
      sessionStorage.removeItem(storageKey);

      // Set justPublished flag to indicate published state without 
      // clearing localStorage directly (atom will handle storage via atomWithStorage)
      clearViewpointState(false);

      // Navigate back to the correct page based on space
      const targetPath = basePath && basePath.startsWith('/s/') ? basePath : '/';
      push(targetPath);
    });
  }, [setReasoning, setStatement, setTopic, setTopicId, setGraph, reactFlow, setCollapsedPointIds, setIsReactFlowReady, push, currentSpace, basePath]);

  const openConfirmDialog = useCallback(() => {
    setIsConfirmDialogOpen(true);
  }, []);

  const handleDiscardWithoutNavigation = useCallback(() => {

    setReasoning("");
    setStatement("");
    setTopic("");
    setTopicId(undefined);
    setGraph(initialViewpointGraph);
    setCollapsedPointIds(new Set());
    if (reactFlow) {
      reactFlow.setNodes(initialViewpointGraph.nodes);
      reactFlow.setEdges(initialViewpointGraph.edges);
    }
    // Clear sessionStorage draft data
    const storageKey = currentSpace ? `copyingViewpoint:${currentSpace}` : `copyingViewpoint`;
    sessionStorage.removeItem(storageKey);
    clearViewpointState(false);
    // Close dialog & remount graph
    setIsInitialLoadDialogOpen(false);
    setGraphRevision((prev) => prev + 1);
  }, [
    reactFlow,
    setReasoning,
    setStatement,
    setTopic,
    setTopicId,
    setGraph,
    setCollapsedPointIds,
    setIsInitialLoadDialogOpen,
    setGraphRevision,
    currentSpace,
  ]);

  const handleBackClick = useCallback(() => {
    const targetPath = basePath && basePath.startsWith('/s/') ? basePath : '/';
    push(targetPath);
  }, [push, basePath]);

  if (!spaceId) {
    return (
      <main className="relative flex-grow bg-background h-full overflow-hidden flex items-center justify-center">
        <Loader className="size-6" />
      </main>
    );
  }

  if (decodedTopicId && permissionData && !permissionData.canCreate && permissionData.isRestricted) {
    const matchingTopic = topicsData?.find(t => t.id === decodedTopicId);
    return (
      <main className="relative flex-grow bg-background h-full overflow-hidden">
        <div className="flex flex-col h-full">
          <NewRationaleHeader
            spaceData={headerSpaceData}
            spaceId={spaceId}
            openConfirmDialog={openConfirmDialog}
            isConfirmDialogOpen={isConfirmDialogOpen}
            setIsConfirmDialogOpen={setIsConfirmDialogOpen}
            isPending={isPending}
            publish={handlePublish}
            isPublishing={isPublishing}
            canPublish={false}
            isInitialLoadDialogOpen={isInitialLoadDialogOpen}
            isCopiedFromSessionStorage={isCopiedFromSessionStorage}
            setIsInitialLoadDialogOpen={setIsInitialLoadDialogOpen}
            handleDiscardWithoutNavigation={handleDiscardWithoutNavigation}
            isDiscardingWithoutNav={isDiscardingWithoutNav}
            clearGraphAndState={clearGraphAndState}
            handleBackClick={handleBackClick}
            canvasEnabled={canvasEnabled}
            toggleCanvas={() => setCanvasEnabled(!canvasEnabled)}
          />
          <Separator />
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="max-w-md w-full">
              <Alert className="border-2 border-amber-300 dark:border-amber-600 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30">
                <Lock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                <AlertDescription className="text-amber-800 dark:text-amber-200">
                  <div className="space-y-3">
                    <h3 className="font-semibold text-lg">Access Restricted</h3>
                    <p>
                      You don&apos;t have permission to create rationales for the topic &quot;{matchingTopic?.name || 'Unknown Topic'}&quot;.
                      This topic has restricted rationale creation.
                    </p>
                    <p className="text-sm">
                      Contact a space administrator if you believe this is an error, or create a rationale without a specific topic.
                    </p>
                    <div className="pt-2">
                      <button
                        onClick={() => {
                          // Remove topicId from URL and reload
                          const newUrl = new URL(window.location.href);
                          // eslint-disable-next-line drizzle/enforce-delete-with-where
                          newUrl.searchParams.delete('topicId');
                          window.location.href = newUrl.toString();
                        }}
                        className="inline-flex items-center gap-2 px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-md text-sm font-medium transition-colors"
                      >
                        Create General Rationale
                      </button>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={cn(
      "relative flex-grow bg-background h-full overflow-hidden",
      "md:grid",
      showFeed
        ? "md:grid-cols-[0_minmax(200px,400px)_1fr_minmax(200px,400px)]"
        : "md:grid-cols-[0_minmax(200px,400px)_1fr]"
    )}>
      <div className="hidden md:block" />
      <div className="flex flex-col h-full md:col-start-2 border-x overflow-hidden">
        <NewRationaleHeader
          spaceData={headerSpaceData}
          spaceId={spaceId}
          openConfirmDialog={openConfirmDialog}
          isConfirmDialogOpen={isConfirmDialogOpen}
          setIsConfirmDialogOpen={setIsConfirmDialogOpen}
          isPending={isPending}
          publish={handlePublish}
          isPublishing={isPublishing}
          canPublish={canPublish}
          isInitialLoadDialogOpen={isInitialLoadDialogOpen}
          isCopiedFromSessionStorage={isCopiedFromSessionStorage}
          setIsInitialLoadDialogOpen={setIsInitialLoadDialogOpen}
          handleDiscardWithoutNavigation={handleDiscardWithoutNavigation}
          isDiscardingWithoutNav={isDiscardingWithoutNav}
          clearGraphAndState={clearGraphAndState}
          handleBackClick={handleBackClick}
          canvasEnabled={canvasEnabled}
          toggleCanvas={() => setCanvasEnabled(!canvasEnabled)}
        />
        <Separator />
        {!showFeed || !isMobile ? (
          <div className="flex-grow overflow-y-auto pb-10">
            <NewRationaleForm
              title={statement}
              onTitleChange={setStatement}
              description={reasoning}
              onDescriptionChange={setReasoning}
              topic={topic}
              onTopicChange={(newTopic) => {
                setTopic(newTopic);
                setStatement(newTopic);
                const matchingTopic = topicsData?.find(t => t.name === newTopic);
                setTopicId(matchingTopic?.id);
              }}
              topics={topicsData || []}
              currentSpace={spaceId}
              points={points}
              hoveredPointId={hoveredPointId}
              isDescriptionEditing={isEditingDescription}
              onDescriptionEdit={() => setIsEditingDescription(true)}
              onDescriptionBlur={() => setIsEditingDescription(false)}
            />
          </div>
        ) : null}
      </div>

      <Dynamic>
        <RationaleGraph key={graphRevision}
          graph={graph}
          setGraph={setGraph}
          statement={statement}
          description={reasoning}
          canvasEnabled={canvasEnabled}
          className={cn(
            "!fixed md:!sticky inset-0 top-[var(--header-height)] md:inset-[reset]  !h-[calc(100vh-var(--header-height))] md:top-[var(--header-height)] md:z-auto",
            !canvasEnabled && isMobile && "hidden",
            showFeed && isMobile && "hidden"
          )}
          canModify={true}
          isNew={true}
          isSaving={isPublishing}
          hideShareButton={true}
          onSave={async () => {
            try {
              const id = await publish();
              // state reset handled inside hook
              return true;
            } catch {
              return false;
            }
          }}
          topOffsetPx={64}
        />
      </Dynamic>

      <PointsFeedContainer />
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
    <ReactFlowProvider>
      <ViewpointContent setInitialTab={setInitialTab} />
    </ReactFlowProvider>
  );
}

export default function NewViewpointPage() {
  const { user: privyUser } = usePrivy();
  const searchParams = useSearchParams();
  const setInitialTab = useSetAtom(initialSpaceTabAtom);

  return (
    <OriginalPosterProvider originalPosterId={privyUser?.id}>
      <ViewpointPageContent key={searchParams.toString()} setInitialTab={setInitialTab} />
    </OriginalPosterProvider>
  );
}
