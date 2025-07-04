"use client";

import { useQuery } from "@tanstack/react-query";

interface UserAssignment {
  id: string;
  topicId: number;
  topicName: string;
  spaceId: string;
  promptMessage: string | null;
  completed: boolean;
  createdAt: string;
}

async function fetchUserAssignments(): Promise<UserAssignment[]> {
  const response = await fetch("/api/user/assignments");
  if (!response.ok) {
    if (response.status === 401) {
      return [];
    }
    throw new Error("Failed to fetch assignments");
  }
  return response.json();
}

export function useIncompleteAssignmentCount() {
  const { data: assignments = [] } = useQuery({
    queryKey: ["user-assignments"],
    queryFn: fetchUserAssignments,
    retry: false,
  });

  return assignments.filter(assignment => !assignment.completed).length;
}