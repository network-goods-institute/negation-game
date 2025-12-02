import { logger } from "@/lib/logger";
import { getVotersByIds } from "@/services/users/getVotersByIds";

jest.mock("@/services/users/getVotersByIds");
jest.mock("@/lib/logger", () => ({
  logger: {
    error: jest.fn(),
  },
}));

jest.mock("next/server", () => ({
  NextResponse: {
    json: jest.fn((data, init) => ({
      json: async () => data,
      status: init?.status ?? 200,
    })),
  },
}));

const mockedGetVotersByIds = getVotersByIds as jest.MockedFunction<typeof getVotersByIds>;

describe("POST /api/users/voters", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns voters for valid ids", async () => {
    const voters = [
      { id: "user-1", username: "Alice", avatarUrl: null, avatarUpdatedAt: null },
    ];
    mockedGetVotersByIds.mockResolvedValue(voters);

    const { POST } = await import("../route");

    const response = await POST({
      json: async () => ({ userIds: ["user-1"] }),
    } as Request);

    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({ voters });
    expect(mockedGetVotersByIds).toHaveBeenCalledWith(["user-1"]);
  });

  it("returns 400 when userIds payload is invalid", async () => {
    const { POST } = await import("../route");

    const response = await POST({
      json: async () => ({ ids: ["user-1"] }),
    } as Request);

    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toEqual({ error: "userIds must be an array of strings" });
    expect(mockedGetVotersByIds).not.toHaveBeenCalled();
  });

  it("returns 500 when fetching voters fails", async () => {
    mockedGetVotersByIds.mockRejectedValue(new Error("db failure"));

    const { POST } = await import("../route");

    const response = await POST({
      json: async () => ({ userIds: ["user-1"] }),
    } as Request);

    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload).toEqual({ error: "Failed to fetch voters" });
    expect(logger.error).toHaveBeenCalled();
  });
});
