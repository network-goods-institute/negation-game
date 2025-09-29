import { useMemo } from "react";

export interface NodeMaskingData {
  srcHasFavor: boolean;
  tgtHasFavor: boolean;
  srcFavor: number;
  tgtFavor: number;
  srcIsTitle: boolean;
  tgtIsTitle: boolean;
  srcLowOpacity: boolean;
  tgtLowOpacity: boolean;
}

export const useEdgeNodeMasking = (
  sourceNode: any,
  targetNode: any
): NodeMaskingData => {
  return useMemo(() => {
    const srcHasFavor =
      sourceNode?.type === "point" || sourceNode?.type === "objection";
    const tgtHasFavor =
      targetNode?.type === "point" || targetNode?.type === "objection";

    const normalizeFavor = (value: unknown) => {
      const numeric = Number(value);
      if (!Number.isFinite(numeric)) {
        return 5;
      }
      const rounded = Math.round(numeric);
      return Math.max(1, Math.min(5, rounded));
    };

    const srcFavor = normalizeFavor(sourceNode?.data?.favor ?? 5);
    const tgtFavor = normalizeFavor(targetNode?.data?.favor ?? 5);
    const srcIsTitle = sourceNode?.type === "title";
    const tgtIsTitle = targetNode?.type === "title";
    const srcIsAnchor = sourceNode?.type === "edge_anchor";
    const tgtIsAnchor = targetNode?.type === "edge_anchor";
    const srcLowOpacity = true;
    const tgtLowOpacity = true;

    return {
      srcHasFavor,
      tgtHasFavor,
      srcFavor,
      tgtFavor,
      srcIsTitle,
      tgtIsTitle,
      srcLowOpacity,
      tgtLowOpacity,
    };
  }, [sourceNode, targetNode]);
};
