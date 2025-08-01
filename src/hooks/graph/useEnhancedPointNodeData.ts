import { useMemo } from "react";
import { usePointData } from "@/queries/points/usePointData";
import { useUserEndorsement } from "@/queries/users/useUserEndorsements";
import { useOriginalPoster } from "@/components/contexts/OriginalPosterContext";
import type { ParallelRationalePointData } from "@/hooks/points/useParallelRationaleData";

export interface UseEnhancedPointNodeDataResult {
  pointData: ReturnType<typeof usePointData>["data"] | undefined;
  isLoading: boolean;
  enhancedData: ParallelRationalePointData | null;
}

export function useEnhancedPointNodeData(
  pointId: number,
  parentId?: string,
  skipIndividualLoading?: boolean
): UseEnhancedPointNodeDataResult {
  const { data: pointData, isLoading } = usePointData(pointId);
  const { originalPosterId } = useOriginalPoster();
  const { data: rawOpCred, isLoading: isOpCredLoading } = useUserEndorsement(
    originalPosterId,
    pointId,
    { enabled: !skipIndividualLoading }
  );

  const opCred = rawOpCred === null ? undefined : rawOpCred;

  const enhancedData = useMemo((): ParallelRationalePointData | null => {
    if (!pointData) return null;

    return {
      ...pointData,
      opCred,
      endorsementBreakdown: undefined,
      authorData: undefined,
      isEndorsementLoading: isOpCredLoading,
      isAuthorLoading: false,
    } satisfies ParallelRationalePointData;
  }, [pointData, opCred, isOpCredLoading]);

  return {
    pointData,
    isLoading,
    enhancedData,
  };
}
