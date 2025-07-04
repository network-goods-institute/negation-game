import { fetchDelegateStats } from "../fetchDelegateStats";
import { getUserId } from "@/actions/users/getUserId";
import { requireSpaceAdmin } from "@/utils/adminUtils";
import { db } from "@/services/db";

jest.mock("@/actions/users/getUserId");
jest.mock("@/utils/adminUtils");
jest.mock("@/services/db");

const mockGetUserId = getUserId as jest.MockedFunction<typeof getUserId>;
const mockRequireSpaceAdmin = requireSpaceAdmin as jest.MockedFunction<
  typeof requireSpaceAdmin
>;

describe("fetchDelegateStats", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should require authentication", async () => {
    mockGetUserId.mockResolvedValue(null);

    await expect(fetchDelegateStats("test-space")).rejects.toThrow(
      "Must be authenticated to view delegate statistics"
    );
  });

  it("should require space admin permissions", async () => {
    const userId = "user-123";
    mockGetUserId.mockResolvedValue(userId);
    mockRequireSpaceAdmin.mockRejectedValue(new Error("Not admin"));

    await expect(fetchDelegateStats("test-space")).rejects.toThrow("Not admin");
    expect(mockRequireSpaceAdmin).toHaveBeenCalledWith(userId, "test-space");
  });

  it("should return formatted delegate statistics", async () => {
    const userId = "user-123";
    mockGetUserId.mockResolvedValue(userId);
    mockRequireSpaceAdmin.mockResolvedValue(undefined);

    const mockResults = [
      {
        user_id: "delegate-1",
        username: "alice",
        total_cred: 1000,
        points_created: 5,
        rationales_created: 2,
        total_endorsements_made: 15,
        total_cred_endorsed: 500,
        points_receiving_endorsements: 3,
        total_cred_received: 750,
        last_active: "2024-01-15T10:00:00Z",
        joined_date: "2024-01-01T00:00:00Z",
      },
      {
        user_id: "delegate-2",
        username: "bob",
        total_cred: 800,
        points_created: 3,
        rationales_created: 1,
        total_endorsements_made: 10,
        total_cred_endorsed: 300,
        points_receiving_endorsements: 2,
        total_cred_received: 400,
        last_active: null,
        joined_date: "2024-01-02T00:00:00Z",
      },
    ];

    (db.execute as jest.Mock).mockResolvedValue(mockResults);

    const result = await fetchDelegateStats("test-space");

    expect(result).toEqual([
      {
        userId: "delegate-1",
        username: "alice",
        totalCred: 1000,
        pointsCreated: 5,
        rationalesCreated: 2,
        totalEndorsementsMade: 15,
        totalCredEndorsed: 500,
        pointsReceivingEndorsements: 3,
        totalCredReceived: 750,
        lastActive: "2024-01-15T10:00:00.000Z",
        joinedDate: "2024-01-01T00:00:00.000Z",
      },
      {
        userId: "delegate-2",
        username: "bob",
        totalCred: 800,
        pointsCreated: 3,
        rationalesCreated: 1,
        totalEndorsementsMade: 10,
        totalCredEndorsed: 300,
        pointsReceivingEndorsements: 2,
        totalCredReceived: 400,
        lastActive: null,
        joinedDate: "2024-01-02T00:00:00.000Z",
      },
    ]);
  });

  it("should handle null values gracefully", async () => {
    const userId = "user-123";
    mockGetUserId.mockResolvedValue(userId);
    mockRequireSpaceAdmin.mockResolvedValue(undefined);

    const mockResults = [
      {
        user_id: "delegate-1",
        username: "alice",
        total_cred: null,
        points_created: null,
        rationales_created: null,
        total_endorsements_made: null,
        total_cred_endorsed: null,
        points_receiving_endorsements: null,
        total_cred_received: null,
        last_active: null,
        joined_date: "2024-01-01T00:00:00Z",
      },
    ];

    (db.execute as jest.Mock).mockResolvedValue(mockResults);

    const result = await fetchDelegateStats("test-space");

    expect(result[0]).toEqual({
      userId: "delegate-1",
      username: "alice",
      totalCred: 0,
      pointsCreated: 0,
      rationalesCreated: 0,
      totalEndorsementsMade: 0,
      totalCredEndorsed: 0,
      pointsReceivingEndorsements: 0,
      totalCredReceived: 0,
      lastActive: null,
      joinedDate: "2024-01-01T00:00:00.000Z",
    });
  });

  it("should return empty array when no delegates found", async () => {
    const userId = "user-123";
    mockGetUserId.mockResolvedValue(userId);
    mockRequireSpaceAdmin.mockResolvedValue(undefined);

    (db.execute as jest.Mock).mockResolvedValue([]);

    const result = await fetchDelegateStats("test-space");

    expect(result).toEqual([]);
  });
});
