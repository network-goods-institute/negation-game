import type { Topic } from "@/types/admin";

export const sortTopicsByCreatedDesc = (topics: Topic[]): Topic[] => {
  return [...topics].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
};
