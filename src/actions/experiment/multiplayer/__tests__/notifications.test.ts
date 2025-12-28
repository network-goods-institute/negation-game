jest.mock("@/actions/users/getUserId", () => ({
  getUserId: jest.fn(async () => "user-1"),
}));

import { getUserId } from "@/actions/users/getUserId";

const mockSelect = jest.fn();
const mockInsert = jest.fn();
const mockUpdate = jest.fn();

jest.mock("@/services/db", () => ({
  db: {
    select: (...args: any[]) => mockSelect(...args),
    insert: (...args: any[]) => mockInsert(...args),
    update: (...args: any[]) => mockUpdate(...args),
  },
}));

const buildSelectChain = (rows: any[]) => {
  const chain: any = {};
  chain.limit = jest.fn(async () => rows);
  chain.orderBy = jest.fn(() => chain);
  chain.where = jest.fn(() => chain);
  chain.leftJoin = jest.fn(() => chain);
  const from = jest.fn(() => chain);
  return { from, where: chain.where, orderBy: chain.orderBy, limit: chain.limit };
};

const buildSummarySelectChain = (rows: any[]) => {
  const chain: any = {};
  chain.limit = jest.fn(async () => rows);
  chain.orderBy = jest.fn(() => chain);
  chain.where = jest.fn(() => chain);
  chain.leftJoin = jest.fn(() => chain);
  const from = jest.fn(() => chain);
  return { from, where: chain.where, orderBy: chain.orderBy, limit: chain.limit };
};

const buildInsertChain = (row: any) => ({
  values: jest.fn(() => ({
    returning: jest.fn(async () => [row]),
  })),
});

const buildRecentSelectChain = (rows: any[]) => ({
  from: jest.fn(() => ({
    where: jest.fn(() => ({
      orderBy: jest.fn(() => ({
        limit: jest.fn(async () => rows),
      })),
    })),
  })),
});

const buildUpdateChain = (rows: any[]) => ({
  set: jest.fn(() => ({
    where: jest.fn(() => ({
      returning: jest.fn(async () => rows),
    })),
  })),
});

describe("multiplayer notifications actions", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (getUserId as unknown as jest.Mock).mockResolvedValue("user-1");
  });

  it("returns empty when unauthenticated", async () => {
    (getUserId as unknown as jest.Mock).mockResolvedValue(null);
    mockSelect.mockReturnValue(buildSelectChain([]));
    const { getMultiplayerNotifications } = await import(
      "@/actions/experiment/multiplayer/notifications"
    );
    const res = await getMultiplayerNotifications({ docId: "d1" });
    expect(res).toEqual([]);
  });

  it("fetches notifications and maps doc title", async () => {
    mockSelect.mockReturnValue(
      buildSelectChain([
        {
          id: "n1",
          userId: "user-1",
          docId: "doc-1",
          nodeId: "node-1",
          edgeId: null,
          type: "support",
          action: "supported",
          actorUserId: "actor-1",
          actorUsername: "Alex",
          actorAvatarUrl: null,
          title: "Point title",
          content: null,
          metadata: null,
          readAt: null,
          createdAt: new Date(),
          docTitle: "Board title",
        },
      ])
    );
    const { getMultiplayerNotifications } = await import(
      "@/actions/experiment/multiplayer/notifications"
    );
    const res = await getMultiplayerNotifications({ docId: "doc-1" });
    expect(res[0].docTitle).toBe("Board title");
    expect(mockSelect).toHaveBeenCalled();
  });

  it("builds summaries with counts and messages", async () => {
    mockSelect.mockReturnValue(
      buildSummarySelectChain([
        {
          id: "n1",
          docId: "doc-1",
          docTitle: "Board A",
          type: "support",
          action: null,
          actorUsername: "Alex",
          actorAvatarUrl: null,
          title: "Point A",
          readAt: null,
          createdAt: new Date("2024-01-01T00:00:01Z"),
        },
        {
          id: "n2",
          docId: "doc-1",
          docTitle: "Board A",
          type: "objection",
          action: "objected to",
          actorUsername: "Brooke",
          actorAvatarUrl: null,
          title: "Point B",
          readAt: new Date("2024-01-01T00:00:02Z"),
          createdAt: new Date("2024-01-01T00:00:02Z"),
        },
        {
          id: "n3",
          docId: "doc-2",
          docTitle: "Board B",
          type: "comment",
          action: null,
          actorUsername: "Casey",
          actorAvatarUrl: null,
          title: "Point C",
          readAt: null,
          createdAt: new Date("2024-01-02T00:00:00Z"),
        },
      ])
    );
    const { getMultiplayerNotificationSummaries } = await import(
      "@/actions/experiment/multiplayer/notifications"
    );
    const summaries = await getMultiplayerNotificationSummaries();

    const doc1 = summaries.find((s) => s.docId === "doc-1");
    const doc2 = summaries.find((s) => s.docId === "doc-2");
    expect(doc1?.totalCount).toBe(2);
    expect(doc1?.unreadCount).toBe(1);
    expect(doc1?.notifications[0]?.message).toContain("Alex");
    expect(doc2?.totalCount).toBe(1);
  });

  it("aggregates repeated actions on the same point in summaries", async () => {
    mockSelect.mockReturnValue(
      buildSummarySelectChain([
        {
          id: "n1",
          docId: "doc-1",
          docTitle: "Board A",
          type: "support",
          action: null,
          actorUsername: "Alex",
          actorAvatarUrl: null,
          title: "Point A",
          readAt: null,
          createdAt: new Date("2024-01-01T00:00:01Z"),
        },
        {
          id: "n2",
          docId: "doc-1",
          docTitle: "Board A",
          type: "support",
          action: "supported",
          actorUsername: "Blake",
          actorAvatarUrl: null,
          title: "Point A",
          readAt: null,
          createdAt: new Date("2024-01-01T00:00:02Z"),
        },
      ])
    );

    const { getMultiplayerNotificationSummaries } = await import(
      "@/actions/experiment/multiplayer/notifications"
    );
    const summaries = await getMultiplayerNotificationSummaries();
    expect(summaries[0]?.notifications[0]?.message).toContain("Alex");
    expect(summaries[0]?.notifications[0]?.message).toContain("Blake");
    expect(summaries[0]?.notifications[0]?.message).toContain("supported");
  });

  it("creates a notification with required fields", async () => {
    mockSelect.mockReturnValue(buildRecentSelectChain([]));
    mockInsert.mockReturnValue(
      buildInsertChain({
        id: "new-id",
        userId: "user-2",
        docId: "doc-1",
        type: "support",
        title: "Point",
        createdAt: new Date(),
      })
    );
    const { createMultiplayerNotification } = await import(
      "@/actions/experiment/multiplayer/notifications"
    );
    const row = await createMultiplayerNotification({
      userId: "user-2",
      docId: "doc-1",
      type: "support",
      title: "Point",
    });
    if (!row) throw new Error("Expected row");
    expect(row.id).toBe("new-id");
  });

  it("dedupes recent notifications", async () => {
    const existing = { id: "recent-id" };
    mockSelect.mockReturnValue(buildRecentSelectChain([existing]));
    const { createMultiplayerNotification } = await import(
      "@/actions/experiment/multiplayer/notifications"
    );
    const row = await createMultiplayerNotification({
      userId: "user-2",
      docId: "doc-1",
      type: "support",
      title: "Point",
    });
    if (!row) throw new Error("Expected row");
    expect(row.id).toBe(existing.id);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("marks single notification as read", async () => {
    mockUpdate.mockReturnValue(buildUpdateChain([{ id: "n1" }]));
    const { markMultiplayerNotificationRead } = await import(
      "@/actions/experiment/multiplayer/notifications"
    );
    const res = await markMultiplayerNotificationRead("n1");
    expect(res?.id).toBe("n1");
  });

  it("marks multiple notifications as read", async () => {
    mockUpdate.mockReturnValue(buildUpdateChain([{ id: "n1" }, { id: "n2" }]));
    const { markMultiplayerNotificationsRead } = await import(
      "@/actions/experiment/multiplayer/notifications"
    );
    const res = await markMultiplayerNotificationsRead(["n1", "n2"]);
    expect(res.updated).toBe(2);
  });
});
