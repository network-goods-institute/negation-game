import { useMemo } from "react";
import { usePointData } from "@/queries/points/usePointData";
import { useUserEndorsement } from "@/queries/users/useUserEndorsements";
import { useOriginalPoster } from "@/components/contexts/OriginalPosterContext";

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

  return useMemo(
    () => ({ pointData, isLoading, opCred, endorsedByOp }),
    [pointData, isLoading, opCred, endorsedByOp]
  );
}
