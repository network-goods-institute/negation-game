import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { generateEdgeId } from "@/utils/experiment/multiplayer/graphSync";

export const useInitialGraph = () => {
  const sp = useSearchParams();
  const requestedTitle = (sp?.get("title") || "").trim();
  const [initialGraph, setInitialGraph] = useState<{
    nodes: any[];
    edges: any[];
  } | null>(null);

  useEffect(() => {
    if (initialGraph) return;

    const questionId = "title";
    const optionId1 = `p-${Date.now()}`;
    const optionId2 = `p-${Date.now() + 1}`;

    setInitialGraph({
      nodes: [
        {
          id: questionId,
          type: "title",
          position: { x: 250, y: 120 },
          data: { content: requestedTitle || "New Board" },
        },
        {
          id: optionId1,
          type: "point",
          position: { x: 150, y: 280 },
          data: { content: "First option", favor: 5 },
        },
        {
          id: optionId2,
          type: "point",
          position: { x: 350, y: 280 },
          data: { content: "Second option", favor: 5 },
        },
      ],
      edges: [
        {
          id: generateEdgeId(),
          type: "option",
          source: optionId1,
          target: questionId,
          sourceHandle: `${optionId1}-source-handle`,
          targetHandle: `${questionId}-incoming-handle`,
        },
        {
          id: generateEdgeId(),
          type: "option",
          source: optionId2,
          target: questionId,
          sourceHandle: `${optionId2}-source-handle`,
          targetHandle: `${questionId}-incoming-handle`,
        },
      ],
    });
  }, [initialGraph, requestedTitle]);

  return initialGraph;
};
