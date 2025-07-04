import { useQuery } from "@tanstack/react-query";
import { usePrivy } from "@privy-io/react-auth";

interface CanCreateRationaleResponse {
  canCreate: boolean;
  isRestricted: boolean;
  topicExists: boolean;
}

async function checkCanCreateRationale(
  userId: string | undefined,
  topicId: number
): Promise<CanCreateRationaleResponse> {
  if (!userId) {
    return { canCreate: false, isRestricted: false, topicExists: false };
  }

  const response = await fetch(`/api/topics/${topicId}/can-create-rationale`);

  if (!response.ok) {
    if (response.status === 404) {
      return { canCreate: false, isRestricted: false, topicExists: false };
    }
    throw new Error("Failed to check rationale creation permissions");
  }

  return response.json();
}

export function useCanCreateRationale(topicId: number | null | undefined) {
  const { user } = usePrivy();

  return useQuery({
    queryKey: ["can-create-rationale", topicId, user?.id],
    queryFn: () => checkCanCreateRationale(user?.id, topicId!),
    enabled: !!topicId && !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
