import { useState, useEffect, useRef } from "react";
import { useAtom, useSetAtom } from "jotai";
import { useReactFlow } from "@xyflow/react";
import type { AppNode } from "@/components/graph/AppNode";
import { usePathname } from "next/navigation";
import { getSpaceFromPathname } from "@/lib/negation-game/getSpaceFromPathname";
import {
  viewpointGraphAtom,
  viewpointStatementAtom,
  viewpointReasoningAtom,
  viewpointTopicAtom,
  copiedFromIdAtom,
} from "@/atoms/viewpointAtoms";

/**
 * Hook to manage draft lifecycle: loading from sessionStorage, draft detection, and cleanup.
 */
export default function useRationaleDraftLifecycle() {
  const reactFlow = useReactFlow<AppNode>();
  const pathname = usePathname();
  const currentSpace = getSpaceFromPathname(pathname) || "global";

  const setCopiedFromId = useSetAtom(copiedFromIdAtom);
  const [graph, setGraph] = useAtom(viewpointGraphAtom);
  const [statement, setStatement] = useAtom(viewpointStatementAtom);
  const [reasoning, setReasoning] = useAtom(viewpointReasoningAtom);
  const [topic, setTopic] = useAtom(viewpointTopicAtom);

  const [isCopiedFromSessionStorage, setIsCopiedFromSessionStorage] =
    useState(false);
  const [isInitialLoadDialogOpen, setIsInitialLoadDialogOpen] = useState(false);
  // track if we've already shown the initial-load dialog
  const hasCheckedInitialLoadRef = useRef(false);
  const [isReactFlowReady, setIsReactFlowReady] = useState(false);
  const [isDiscardingWithoutNav, setIsDiscardingWithoutNav] = useState(false);
  const hasLoadedCopyData = useRef(false);
  const [graphRevision, setGraphRevision] = useState(0);

  // Draft and copy data detection with detailed logging
  useEffect(() => {
    if (isDiscardingWithoutNav) {
      return;
    }
    if (hasLoadedCopyData.current) {
      return;
    }
    const storageKey = `copyingViewpoint:${currentSpace}`;
    const copyData = sessionStorage.getItem(storageKey);
    if (copyData) {
      try {
        const parsed = JSON.parse(copyData);
        if (parsed?.isCopyOperation) {
          setIsCopiedFromSessionStorage(true);
          hasCheckedInitialLoadRef.current = true;
          setCopiedFromId(parsed.copiedFromId);
          if (parsed.graph) {
            setGraph(parsed.graph);
            hasLoadedCopyData.current = true;
          }
          if (parsed.title) setStatement(parsed.title);
          if (parsed.description) setReasoning(parsed.description);
          if (parsed.topic) setTopic(parsed.topic);
          setGraphRevision((prev) => prev + 1);
          sessionStorage.removeItem(storageKey);
          return;
        }
      } catch (e) {
        console.error("[DraftLifecycle] failed to parse copy data:", e);
      }
    }
    if (!isReactFlowReady || !reactFlow) {
      return;
    }
    if (!hasCheckedInitialLoadRef.current) {
      const nodes = reactFlow.getNodes();
      const hasStatement = statement.trim().length > 0;
      const hasEdges = graph.edges.length > 0;
      const hasPoints = nodes.some(
        (n) => n.type === "point" && "pointId" in n.data
      );

      if (hasStatement || hasEdges || hasPoints) {
        setIsInitialLoadDialogOpen(true);
      }
      hasCheckedInitialLoadRef.current = true;
    }
    // No cleanup to avoid resetting flags on each render
  }, [
    currentSpace,
    reactFlow,
    isReactFlowReady,
    isDiscardingWithoutNav,
    graph.edges.length,
    setCopiedFromId,
    setGraph,
    setReasoning,
    setStatement,
    setTopic,
    statement,
  ]);

  return {
    isCopiedFromSessionStorage,
    setIsCopiedFromSessionStorage,
    isInitialLoadDialogOpen,
    setIsInitialLoadDialogOpen,
    graphRevision,
    setGraphRevision,
    setIsReactFlowReady,
    isDiscardingWithoutNav,
    setIsDiscardingWithoutNav,
  };
}
