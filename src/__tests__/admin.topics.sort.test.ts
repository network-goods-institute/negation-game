import { sortTopicsByCreatedDesc } from "@/utils/admin/sortTopics";
import type { Topic } from "@/types/admin";

describe("Admin Topics default ordering", () => {
  it("sorts topics by createdAt descending", () => {
    const base = {
      space: "global",
      discourseUrl: "",
      restrictedRationaleCreation: false,
      closed: false,
    };
    const topics: Topic[] = [
      { id: 1, name: "Alpha", createdAt: "2024-01-10T10:00:00Z", ...base },
      { id: 2, name: "Beta", createdAt: "2024-03-05T09:00:00Z", ...base },
      { id: 3, name: "Gamma", createdAt: "2023-12-31T23:59:59Z", ...base },
    ];

    const sorted = sortTopicsByCreatedDesc(topics);

    expect(sorted.map((t) => t.id)).toEqual([2, 1, 3]);
  });
});
