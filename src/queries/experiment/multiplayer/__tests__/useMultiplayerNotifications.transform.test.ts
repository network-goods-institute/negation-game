import { aggregateMultiplayerNotifications } from "@/queries/experiment/multiplayer/useMultiplayerNotifications";
import type { MultiplayerNotificationRecord } from "@/actions/experiment/multiplayer/notifications";

describe("toSidebarNotification", () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2024-01-01T00:04:00Z"));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it("maps a db row into the sidebar shape with defaults", () => {
    const row: MultiplayerNotificationRecord = {
      id: "n-1",
      userId: "user-1",
      docId: "doc-1",
      nodeId: "node-1",
      edgeId: null,
      type: "support",
      action: null,
      actorUserId: "actor-1",
      actorUsername: "Alex",
      actorAvatarUrl: "https://example.com/alex.png",
      title: "Resilient consensus",
      content: null,
      metadata: null,
      readAt: null,
      createdAt: new Date("2024-01-01T00:02:00Z"),
      docTitle: "Board title",
    };

    const [mapped] = aggregateMultiplayerNotifications([row]);

    expect(mapped.id).toBe("n-1");
    expect(mapped.action).toBe("supported");
    expect(mapped.userName).toBe("Alex");
    expect(mapped.pointTitle).toBe("Resilient consensus");
    expect(mapped.isRead).toBe(false);
    expect(mapped.timestamp).toBe("2 minutes ago");
    expect(mapped.avatarUrls?.[0]).toBe(row.actorAvatarUrl);
    expect(mapped.ids).toEqual(["n-1"]);
  });

  it("groups repeated actions on the same point", () => {
    const rows: MultiplayerNotificationRecord[] = [
      {
        id: "n-1",
        userId: "user-1",
        docId: "doc-1",
        nodeId: "node-1",
        edgeId: null,
        type: "support",
        action: null,
        actorUserId: "actor-1",
        actorUsername: "Alex",
        actorAvatarUrl: null,
        title: "Resilient consensus",
        content: null,
        metadata: null,
        readAt: null,
        createdAt: new Date("2024-01-01T00:02:00Z"),
        docTitle: "Board title",
      },
      {
        id: "n-2",
        userId: "user-1",
        docId: "doc-1",
        nodeId: "node-1",
        edgeId: null,
        type: "support",
        action: "supported",
        actorUserId: "actor-2",
        actorUsername: "Blake",
        actorAvatarUrl: null,
        title: "Resilient consensus",
        content: null,
        metadata: null,
        readAt: new Date("2024-01-01T00:02:30Z"),
        createdAt: new Date("2024-01-01T00:02:30Z"),
        docTitle: "Board title",
      },
    ];

    const [grouped] = aggregateMultiplayerNotifications(rows);

    expect(grouped.ids).toEqual(["n-1", "n-2"]);
    expect(grouped.count).toBe(2);
    expect(grouped.userName).toBe("Alex and Blake");
    expect(grouped.isRead).toBe(false);
  });
});
