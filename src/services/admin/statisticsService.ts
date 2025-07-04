import { TopicRationaleStatus, DelegateStats } from "@/types/admin";

export async function fetchRationaleStatus(
  spaceId: string
): Promise<TopicRationaleStatus[]> {
  const response = await fetch(`/api/spaces/${spaceId}/rationale-status`);
  if (!response.ok) throw new Error("Failed to fetch rationale status");
  return response.json();
}

export async function fetchDelegateStats(
  spaceId: string
): Promise<DelegateStats[]> {
  const response = await fetch(`/api/spaces/${spaceId}/delegate-stats`);
  if (!response.ok) throw new Error("Failed to fetch delegate statistics");
  return response.json();
}
