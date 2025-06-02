import { useCallback } from "react";
import { copyViewpointAndNavigate } from "@/lib/negation-game/copyViewpoint";
import type { ViewpointGraph } from "@/atoms/viewpointAtoms";

/**
 * Returns a callback to copy the given graph, handling errors and fallback navigation.
 */
export function useGraphCopyHandler(statement: string, description: string) {
  return useCallback(
    async (graphToCopy: ViewpointGraph) => {
      try {
        const result = await copyViewpointAndNavigate(
          graphToCopy,
          statement,
          description
        );

        if (!result) {
          console.error("Failed to copy viewpoint, forcing navigation");
          // fallback navigation to new rationale in global space
          await new Promise((resolve) => setTimeout(resolve, 300));
          window.location.href = `/s/global/rationale/new`;
        }

        return result;
      } catch (error) {
        console.error("Error during copy operation:", error);
        alert("There was an error copying the rationale. Please try again.");
        return false;
      }
    },
    [statement, description]
  );
}
