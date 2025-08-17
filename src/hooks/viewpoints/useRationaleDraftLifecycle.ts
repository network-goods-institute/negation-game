import { useState, useEffect, useRef } from "react";
import { useAtom, useSetAtom } from "jotai";
import { useReactFlow } from "@xyflow/react";
import type { AppNode } from "@/components/graph/nodes/AppNode";
import { useCurrentSpace } from "../utils/useCurrentSpace";
import {
  viewpointGraphAtom,
  viewpointStatementAtom,
  viewpointReasoningAtom,
  viewpointTopicAtom,
  viewpointTopicIdAtom,
  copiedFromIdAtom,
} from "@/atoms/viewpointAtoms";
import { generateRationaleSummary } from "@/actions/ai/generateRationaleSummary";
import { validateAndCleanGraph } from "@/lib/negation-game/validateAndCleanGraph";

/**
 * Hook to manage draft lifecycle: loading from sessionStorage, draft detection, and cleanup.
 */
export default function useRationaleDraftLifecycle() {
  const reactFlow = useReactFlow<AppNode>();
  const currentSpace = useCurrentSpace();

  const setCopiedFromId = useSetAtom(copiedFromIdAtom);
  const [graph, setGraph] = useAtom(viewpointGraphAtom);
  const [statement, setStatement] = useAtom(viewpointStatementAtom);
  const [reasoning, setReasoning] = useAtom(viewpointReasoningAtom);
  const [, setTopic] = useAtom(viewpointTopicAtom);
  const [, setTopicId] = useAtom(viewpointTopicIdAtom);

  const [isCopiedFromSessionStorage, setIsCopiedFromSessionStorage] =
    useState(false);
  const [isInitialLoadDialogOpen, setIsInitialLoadDialogOpen] = useState(false);
  // track if we've already shown the initial-load dialog
  const hasCheckedInitialLoadRef = useRef(false);
  const [isReactFlowReady, setIsReactFlowReady] = useState(false);
  const [isDiscardingWithoutNav, setIsDiscardingWithoutNav] = useState(false);
  const hasLoadedCopyData = useRef(false);
  const [graphRevision, setGraphRevision] = useState(0);
  const hasGeneratedAIDescription = useRef(false);
  const hasValidatedGraph = useRef(false);

  useEffect(() => {
    if (hasValidatedGraph.current || isDiscardingWithoutNav) {
      return;
    }

    const hasPointNodes = graph.nodes.some(
      (node) => node.type === "point" && "pointId" in node.data
    );

    if (hasPointNodes) {
      hasValidatedGraph.current = true;

      validateAndCleanGraph(graph)
        .then((cleanedGraph) => {
          if (
            cleanedGraph.nodes.length !== graph.nodes.length ||
            cleanedGraph.edges.length !== graph.edges.length
          ) {
            console.log("[DraftLifecycle] Cleaned up existing draft");
            setGraph(cleanedGraph);
            setGraphRevision((prev) => prev + 1);
          }
        })
        .catch((error) => {
          console.error(
            "[DraftLifecycle] Failed to validate existing draft:",
            error
          );
        });
    } else {
      hasValidatedGraph.current = true;
    }
  }, [graph, setGraph, setGraphRevision, isDiscardingWithoutNav]);

  // Draft and copy data detection with detailed logging
  useEffect(() => {
    if (isDiscardingWithoutNav) {
      return;
    }
    if (hasLoadedCopyData.current) {
      return;
    }
    const storageKey = currentSpace
      ? `copyingViewpoint:${currentSpace}`
      : `copyingViewpoint`;
    const copyData = sessionStorage.getItem(storageKey);
    if (copyData) {
      try {
        const parsed = JSON.parse(copyData);
        console.log("[DraftLifecycle] Found copy data:", parsed);
        console.log("[DraftLifecycle] Topic info from storage:", {
          topic: parsed.topic,
          topicId: parsed.topicId,
        });

        if (parsed?.isCopyOperation) {
          setIsCopiedFromSessionStorage(true);
          hasCheckedInitialLoadRef.current = true;
          hasGeneratedAIDescription.current = false;
          setCopiedFromId(parsed.copiedFromId);
          if (parsed.graph) {
            validateAndCleanGraph(parsed.graph)
              .then((cleanedGraph) => {
                setGraph(cleanedGraph);
              })
              .catch((error) => {
                setGraph(parsed.graph);
              });
            hasLoadedCopyData.current = true;
          }
          if (parsed.title) {
            console.log("[DraftLifecycle] Setting title:", parsed.title);
            setStatement(parsed.title);
          }
          if (parsed.description) {
            console.log(
              "[DraftLifecycle] Setting description:",
              parsed.description
            );
            setReasoning(parsed.description);
          }
          if (parsed.topic) {
            console.log("[DraftLifecycle] Setting topic:", parsed.topic);
            setTopic(parsed.topic);
          }
          if (parsed.topicId) {
            console.log("[DraftLifecycle] Setting topicId:", parsed.topicId);
            setTopicId(parsed.topicId);
          }
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
    setTopicId,
    statement,
    reasoning,
  ]);

  // AI description generation for copied viewpoints
  useEffect(() => {
    if (!isCopiedFromSessionStorage || hasGeneratedAIDescription.current)
      return;

    // Check if we have a basic fallback description that should be replaced
    if (
      !reasoning ||
      !reasoning.includes("This is a copy of an existing rationale.")
    ) {
      return;
    }

    // Generate AI summary in the background
    const generateAISummary = async () => {
      try {
        console.log("[DraftLifecycle] Generating AI description for copy...");
        hasGeneratedAIDescription.current = true;
        const aiDescription = await generateRationaleSummary({
          title: statement,
          description: reasoning,
          graph: graph,
        });

        console.log(
          "[DraftLifecycle] Generated AI description:",
          aiDescription
        );
        setReasoning(aiDescription);
      } catch (error) {
        console.error(
          "[DraftLifecycle] Failed to generate AI description:",
          error
        );
        hasGeneratedAIDescription.current = false;
      }
    };

    generateAISummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCopiedFromSessionStorage, statement, graph]);

  return {
    isCopiedFromSessionStorage,
    setIsCopiedFromSessionStorage,
    isInitialLoadDialogOpen,
    setIsInitialLoadDialogOpen,
    graphRevision,
    setGraphRevision,
    isReactFlowReady,
    setIsReactFlowReady,
    isDiscardingWithoutNav,
    setIsDiscardingWithoutNav,
  };
}
