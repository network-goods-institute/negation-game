import { Assignment, CreateAssignmentData } from "@/types/admin";

export async function fetchAssignments(spaceId: string): Promise<Assignment[]> {
  const response = await fetch(`/api/spaces/${spaceId}/rationale-assignments`);
  if (!response.ok) throw new Error("Failed to fetch assignments");
  return response.json();
}

export async function createAssignment(
  data: CreateAssignmentData,
  spaceId: string
) {
  const response = await fetch(`/api/spaces/${spaceId}/rationale-assignments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Failed to create assignment");
  return response.json();
}

export async function removeAssignment(
  topicId: number,
  userId: string,
  spaceId: string
) {
  const response = await fetch(
    `/api/spaces/${spaceId}/rationale-assignments?topicId=${topicId}&userId=${userId}`,
    {
      method: "DELETE",
    }
  );
  if (!response.ok) throw new Error("Failed to remove assignment");
  return response.json();
}
