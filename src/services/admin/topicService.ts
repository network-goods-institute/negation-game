import {
  Topic,
  CreateTopicData,
  UpdateTopicData,
  TopicPermission,
} from "@/types/admin";

export async function fetchTopics(spaceId: string): Promise<Topic[]> {
  const response = await fetch(`/api/spaces/${spaceId}/topics`);
  if (!response.ok) throw new Error("Failed to fetch topics");
  return response.json();
}

export async function createTopic(data: CreateTopicData) {
  const response = await fetch("/api/topics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Failed to create topic");
  return response.json();
}

export async function updateTopic(topicId: number, data: UpdateTopicData) {
  const response = await fetch(`/api/topics/${topicId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Failed to update topic");
  return response.json();
}

export async function deleteTopic(topicId: number) {
  const response = await fetch(`/api/topics/${topicId}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Failed to delete topic");
  return response.json();
}

export async function fetchTopicPermissions(
  topicId: number
): Promise<TopicPermission[]> {
  const response = await fetch(`/api/topics/${topicId}/permissions`);
  if (!response.ok) throw new Error("Failed to fetch topic permissions");
  return response.json();
}
