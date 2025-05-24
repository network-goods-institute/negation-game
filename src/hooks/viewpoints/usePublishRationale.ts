import { useCallback } from "react";
import { useAtom } from "jotai";
import { useRouter } from "next/navigation";
import { useReactFlow } from "@xyflow/react";
import { usePublishViewpoint } from "@/mutations/viewpoints/usePublishViewpoint";
import {
  initialViewpointGraph,
  clearViewpointState,
  viewpointGraphAtom,
  viewpointStatementAtom,
  viewpointReasoningAtom,
  viewpointTopicAtom,
  collapsedPointIdsAtom,
} from "@/atoms/viewpointAtoms";
import { useSpace } from "@/queries/space/useSpace";
import { useTopics } from "@/queries/topics/useTopics";

/**
 * Hook to manage the publish flow for a new rationale.
 * Reads statement, reasoning, topic, graph, and resets state on publish.
 */
export default function usePublishRationale() {
  const reactFlow = useReactFlow();
  const [graph, setGraph] = useAtom(viewpointGraphAtom);
  const [statement, setStatement] = useAtom(viewpointStatementAtom);
  const [description, setReasoning] = useAtom(viewpointReasoningAtom);
  const [topic, setTopic] = useAtom(viewpointTopicAtom);
  const [, setCollapsedPointIds] = useAtom(collapsedPointIdsAtom);

  const { mutateAsync, isPending } = usePublishViewpoint();
  const { push } = useRouter();

  const space = useSpace();
  const spaceId = space.data?.id || "";
  const basePath = spaceId ? `/s/${spaceId}` : "";
  const { data: topicsData } = useTopics(spaceId);

  const canPublish = !!statement && graph.edges.length > 0;

  const publish = useCallback(async () => {
    if (!canPublish) return;
    try {
      let topicId: number | null = null;
      if (topic && topicsData) {
        const found = topicsData.find((t) => t.name === topic);
        if (found) topicId = found.id;
      }
      const copiedFromId = undefined;
      const id = await mutateAsync({
        title: statement,
        description,
        graph,
        topicId,
        copiedFromId,
      });
      clearViewpointState(true);
      setStatement("");
      setReasoning("");
      setTopic("");
      setGraph(initialViewpointGraph);
      setCollapsedPointIds(new Set());
      if (reactFlow) {
        reactFlow.setNodes(initialViewpointGraph.nodes);
        reactFlow.setEdges(initialViewpointGraph.edges);
      }
      push(`${basePath}/rationale/${id}`);
      return id;
    } catch (e) {
      console.error("Publish failed", e);
      throw e;
    }
  }, [
    canPublish,
    description,
    graph,
    mutateAsync,
    push,
    reactFlow,
    setCollapsedPointIds,
    setGraph,
    setReasoning,
    setStatement,
    setTopic,
    basePath,
    statement,
    topic,
    topicsData,
  ]);

  return {
    publish,
    isPublishing: isPending,
    canPublish,
  };
}
