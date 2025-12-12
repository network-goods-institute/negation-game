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

    const srcFavor = 5;
    const tgtFavor = 5;
    const srcIsTitle = sourceNode?.type === "title";
    const tgtIsTitle = targetNode?.type === "title";
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
