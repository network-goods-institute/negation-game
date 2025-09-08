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
    const optionId = `p-${Date.now()}`;

    setInitialGraph({
      nodes: [
        {
          id: questionId,
          type: "title",
          position: { x: 250, y: 160 },
          data: { content: requestedTitle || "New Rationale" },
        },
        {
          id: optionId,
          type: "point",
          position: { x: 250, y: 320 },
          data: { content: "First point", favor: 5 },
        },
      ],
      edges: [
        {
          id: generateEdgeId(),
          type: "option",
          source: optionId,
          target: questionId,
          sourceHandle: `${optionId}-source-handle`,
          targetHandle: `${questionId}-incoming-handle`,
        },
      ],
    });
  }, [initialGraph, requestedTitle]);

  return initialGraph;
};
