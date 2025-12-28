import { normalizeNotificationVotes } from "@/utils/experiment/multiplayer/notificationVotes";

describe("normalizeNotificationVotes", () => {
  it("normalizes string and object votes", () => {
    const votes = [
      " user-1 ",
      { id: "user-2", name: "Alex" },
      { userId: "user-3", username: "Jamie" },
      { id: "", name: "Nope" },
      null,
      undefined,
    ] as any[];

    expect(normalizeNotificationVotes(votes)).toEqual([
      { id: "user-1" },
      { id: "user-2", name: "Alex" },
      { id: "user-3", name: "Jamie" },
    ]);
  });

  it("returns empty array for non-array input", () => {
    expect(normalizeNotificationVotes(undefined)).toEqual([]);
    expect(normalizeNotificationVotes(null as any)).toEqual([]);
  });
});
