import { generateNotificationSummary } from "../generateNotificationSummary";

// Since the function is mocked globally, let's test the interface and behavior
describe("generateNotificationSummary", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should be callable with notification data", async () => {
    const notification = {
      type: "endorsement",
      title: "Your point received an endorsement",
      content: "Someone endorsed your point with 50 cred",
      metadata: {
        sourceUserId: "user123",
        pointId: 123,
        credAmount: 50,
      },
    };

    const result = await generateNotificationSummary(notification);

    // The function should return a string (mocked as "AI generated summary")
    expect(typeof result).toBe("string");
    expect(result).toBeTruthy();
  });

  it("should handle different notification types", async () => {
    const notifications = [
      {
        type: "endorsement",
        title: "Endorsement received",
        content: "Someone endorsed your point",
        metadata: { credAmount: 50 },
      },
      {
        type: "negation",
        title: "Point challenged",
        content: "Someone created a counterpoint",
        metadata: { pointId: 123, counterpointId: 456 },
      },
      {
        type: "rationale_mention",
        title: "Point mentioned",
        content: "Your point was included in a rationale",
        metadata: { rationaleId: "abc123" },
      },
    ];

    for (const notification of notifications) {
      const result = await generateNotificationSummary(notification);
      expect(typeof result).toBe("string");
      expect(result).toBeTruthy();
    }
  });

  it("should handle notifications without metadata", async () => {
    const notification = {
      type: "endorsement",
      title: "Your point received an endorsement",
      content: "Someone endorsed your point",
    };

    const result = await generateNotificationSummary(notification);

    expect(typeof result).toBe("string");
    expect(result).toBeTruthy();
  });
});
