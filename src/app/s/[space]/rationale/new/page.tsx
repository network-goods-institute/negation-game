"use client";

import {
  initialViewpointGraph,
  viewpointGraphAtom,
  viewpointReasoningAtom,
  viewpointStatementAtom,
  collapsedPointIdsAtom,
  clearViewpointState,
  viewpointTopicAtom,
} from "@/atoms/viewpointAtoms";
import { useEffect, useState, useCallback, useTransition } from "react";
import { canvasEnabledAtom } from "@/atoms/canvasEnabledAtom";
import { hoveredPointIdAtom } from "@/atoms/hoveredPointIdAtom";
import { initialSpaceTabAtom } from "@/atoms/navigationAtom";
import { AppNode } from "@/components/graph/AppNode";
import { OriginalPosterProvider } from "@/components/graph/OriginalPosterContext";
import { Separator } from "@/components/ui/separator";
import { Dynamic } from "@/components/utils/Dynamic";
import {
  DEFAULT_SPACE,
  PLACEHOLDER_STATEMENT,
} from "@/constants/config";
import { useBasePath } from "@/hooks/useBasePath";
import { cn } from "@/lib/cn";
import { useSpace } from "@/queries/useSpace";
import { useUser } from "@/queries/useUser";
import { usePrivy } from "@privy-io/react-auth";
import {
  ReactFlowProvider,
  useReactFlow,
} from "@xyflow/react";
import { useAtom, useSetAtom } from "jotai";
import useRationaleDraftLifecycle from "@/hooks/useRationaleDraftLifecycle";
import { EditModeProvider } from "@/components/graph/EditModeContext";
import { useGraphPoints } from "@/hooks/useGraphPoints";
import usePublishRationale from "@/hooks/usePublishRationale";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Loader } from "@/components/ui/loader";
import { getSpaceFromPathname } from "@/lib/negation-game/getSpaceFromPathname";
import NewRationaleHeader from "@/components/rationale/NewRationaleHeader";
import RationaleGraph from "@/components/RationaleGraph";
import NewRationaleForm from "@/components/rationale/NewRationaleForm";
import { useTopics } from "@/queries/useTopics";
import useIsMobile from "@/hooks/useIsMobile";

function ViewpointContent({ setInitialTab }: { setInitialTab: (update: "points" | "rationales" | null) => void }) {
  const { updateNodeData } = useReactFlow();
  const router = useRouter();
  const { push } = router;
  const basePath = useBasePath();
  const pathname = usePathname();
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
  const currentSpace = getSpaceFromPathname(pathname);
  const spaceId = space?.data?.id ?? DEFAULT_SPACE;
  const { data: topicsData } = useTopics(spaceId);

  const [canvasEnabled, setCanvasEnabled] = useAtom(canvasEnabledAtom);
  const isMobile = useIsMobile(640);
  const reactFlow = useReactFlow<AppNode>();
  const [graph, setGraph] = useAtom(viewpointGraphAtom);
  const points = useGraphPoints();
  const [statement, setStatement] = useAtom(viewpointStatementAtom);
  const [reasoning, setReasoning] = useAtom(viewpointReasoningAtom);
  const [topic, setTopic] = useAtom(viewpointTopicAtom);
  const setCollapsedPointIds = useSetAtom(collapsedPointIdsAtom);

  const [isEditingDescription, setIsEditingDescription] = useState(false);

  useEffect(() => {
    // Setup event listener for when the user is about to leave the page
    const handleBeforeUnload = () => {
      // Clean up copy flags in case we're navigating away
      setIsReactFlowReady(false);

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
  const handlePublish = async (): Promise<string> => {
    const id = await publish();
    if (id === undefined) {
      throw new Error("Publish failed: no ID returned");
    }
    return id;
  };

  const clearGraphAndState = useCallback(() => {
    startTransition(() => {
      // Set all atoms back to their defaults
      setReasoning("");
      setStatement("");
      setTopic("");
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
      const effectiveSpace = currentSpace || 'global';
      const storageKey = `copyingViewpoint:${effectiveSpace}`;
      sessionStorage.removeItem(storageKey);

      // Set justPublished flag to indicate published state without 
      // clearing localStorage directly (atom will handle storage via atomWithStorage)
      clearViewpointState(false);

      // Navigate back to the correct page based on space
      const targetPath = basePath && basePath.startsWith('/s/') ? basePath : '/';
      push(targetPath);
    });
  }, [setReasoning, setStatement, setTopic, setGraph, reactFlow, setCollapsedPointIds, setIsReactFlowReady, push, currentSpace, basePath]);

  const openConfirmDialog = useCallback(() => {
    setIsConfirmDialogOpen(true);
  }, []);

  const handleDiscardWithoutNavigation = useCallback(() => {

    setReasoning("");
    setStatement("");
    setTopic("");
    setGraph(initialViewpointGraph);
    setCollapsedPointIds(new Set());
    if (reactFlow) {
      reactFlow.setNodes(initialViewpointGraph.nodes);
      reactFlow.setEdges(initialViewpointGraph.edges);
    }
    // Clear sessionStorage draft data
    const effectiveSpace = currentSpace || 'global';
    sessionStorage.removeItem(`copyingViewpoint:${effectiveSpace}`);
    clearViewpointState(false);
    // Close dialog & remount graph
    setIsInitialLoadDialogOpen(false);
    setGraphRevision((prev) => prev + 1);
  }, [
    reactFlow,
    setReasoning,
    setStatement,
    setTopic,
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

  return (
    <main className="relative flex-grow sm:grid sm:grid-cols-[1fr_minmax(200px,600px)_1fr] md:grid-cols-[0_minmax(200px,400px)_1fr] bg-background">
      <div className="w-full sm:col-[2] flex flex-col border-x">
        <div className="relative flex-grow bg-background">
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
          <NewRationaleForm
            title={statement}
            onTitleChange={setStatement}
            description={reasoning}
            onDescriptionChange={setReasoning}
            topic={topic}
            onTopicChange={setTopic}
            topics={topicsData || []}
            currentSpace={spaceId}
            points={points}
            hoveredPointId={hoveredPointId}
            isDescriptionEditing={isEditingDescription}
            onDescriptionEdit={() => setIsEditingDescription(true)}
            onDescriptionBlur={() => setIsEditingDescription(false)}
          />
        </div>
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
            !canvasEnabled && isMobile && "hidden"
          )}
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
        />
      </Dynamic>
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
    <EditModeProvider>
      <OriginalPosterProvider originalPosterId={privyUser?.id}>
        <ViewpointPageContent key={searchParams.toString()} setInitialTab={setInitialTab} />
      </OriginalPosterProvider>
    </EditModeProvider>
  );
}
