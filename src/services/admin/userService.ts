import { User } from "@/types/admin";

export async function fetchAllUsers(spaceId: string): Promise<User[]> {
  const response = await fetch(`/api/spaces/${spaceId}/all-users`);
  if (!response.ok) throw new Error("Failed to fetch users");
  return response.json();
}
