import { toSidebarNotification } from "@/queries/experiment/multiplayer/useMultiplayerNotifications";
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
      title: "Resilient consensus",
      content: null,
      metadata: null,
      readAt: null,
      createdAt: new Date("2024-01-01T00:02:00Z"),
      docTitle: "Board title",
    };

    const mapped = toSidebarNotification(row);

    expect(mapped.id).toBe("n-1");
    expect(mapped.action).toBe("supported");
    expect(mapped.userName).toBe("Alex");
    expect(mapped.pointTitle).toBe("Resilient consensus");
    expect(mapped.isRead).toBe(false);
    expect(mapped.timestamp).toBe("2 minutes ago");
  });
});
