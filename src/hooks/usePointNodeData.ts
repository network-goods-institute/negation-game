import { useEffect, useMemo } from "react";
import { usePointData, usePrefetchPoint } from "@/queries/usePointData";
import {
  useUserEndorsement,
  usePrefetchUserEndorsements,
} from "@/queries/useUserEndorsements";
import { useOriginalPoster } from "@/components/graph/OriginalPosterContext";

export interface UsePointNodeDataResult {
  pointData: ReturnType<typeof usePointData>["data"] | undefined;
  isLoading: boolean;
  opCred: number | undefined;
  endorsedByOp: boolean;
}

export function usePointNodeData(
  pointId: number,
  parentId?: string
): UsePointNodeDataResult {
  const { data: pointData, isLoading } = usePointData(pointId);
  const { originalPosterId } = useOriginalPoster();
  const { data: rawOpCred } = useUserEndorsement(originalPosterId, pointId);
  const opCred = rawOpCred === null ? undefined : rawOpCred;
  const endorsedByOp = Boolean(opCred !== undefined && opCred > 0);

  const prefetchPoint = usePrefetchPoint();
  const prefetchUserEndorsements = usePrefetchUserEndorsements();

  useEffect(() => {
    if (!pointData || !pointData.negationIds) return;
    pointData.negationIds
      .filter((id) => id !== Number(parentId))
      .forEach((negationId) => {
        prefetchPoint(negationId);
        if (originalPosterId) {
          prefetchUserEndorsements(originalPosterId, negationId);
        }
      });
  }, [
    pointData,
    parentId,
    prefetchPoint,
    originalPosterId,
    prefetchUserEndorsements,
  ]);

  return useMemo(
    () => ({ pointData, isLoading, opCred, endorsedByOp }),
    [pointData, isLoading, opCred, endorsedByOp]
  );
}
