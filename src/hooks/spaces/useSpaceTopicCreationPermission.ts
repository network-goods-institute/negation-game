"use client";

import { useQuery } from "@tanstack/react-query";
import { getSpaceTopicCreationPermission } from "@/actions/spaces/getSpaceTopicCreationPermission";

export function useSpaceTopicCreationPermission(spaceId: string) {
  return useQuery({
    queryKey: ["space-topic-creation-permission", spaceId],
    queryFn: () => getSpaceTopicCreationPermission(spaceId),
    enabled: !!spaceId,
  });
}