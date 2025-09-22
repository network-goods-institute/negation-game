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
    const srcFavor = Math.max(1, Math.min(5, sourceNode?.data?.favor ?? 5));
    const tgtFavor = Math.max(1, Math.min(5, targetNode?.data?.favor ?? 5));
    const srcIsTitle = sourceNode?.type === "title";
    const tgtIsTitle = targetNode?.type === "title";
    const srcIsAnchor = sourceNode?.type === "edge_anchor";
    const tgtIsAnchor = targetNode?.type === "edge_anchor";
    const srcLowOpacity =
      (srcHasFavor && srcFavor <= 3) || srcIsTitle || srcIsAnchor;
    const tgtLowOpacity =
      (tgtHasFavor && tgtFavor <= 3) || tgtIsTitle || tgtIsAnchor;

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
