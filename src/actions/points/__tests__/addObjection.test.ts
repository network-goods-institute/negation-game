import { addObjection } from "../addObjection";
import { db } from "@/services/db";
import { getUserId } from "@/actions/users/getUserId";
import { getSpace } from "@/actions/spaces/getSpace";

jest.mock("@/services/db");
jest.mock("@/actions/users/getUserId");
jest.mock("@/actions/spaces/getSpace");
jest.mock("@/actions/ai/addEmbedding", () => ({
  addEmbedding: jest.fn(),
}));
jest.mock("@/actions/ai/addKeywords", () => ({
  addKeywords: jest.fn(),
}));
jest.mock("@vercel/functions", () => ({
  waitUntil: jest.fn(),
}));

const mockDb = db as jest.Mocked<typeof db>;
const mockGetUserId = getUserId as jest.MockedFunction<typeof getUserId>;
const mockGetSpace = getSpace as jest.MockedFunction<typeof getSpace>;

describe("addObjection", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should create objection without endorsement when cred is 0", async () => {
    mockGetUserId.mockResolvedValue("user-123");
    mockGetSpace.mockResolvedValue("test-space");

    // Mock the initial negation validation query
    const mockSelect = jest.fn().mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue([{ id: 789 }]),
      }),
    });

    // Mock transaction operations
    const mockInsert = jest.fn();
    const mockPointInsert = mockInsert.mockReturnValueOnce({
      values: jest.fn().mockReturnValue({
        returning: jest.fn().mockResolvedValue([{ id: 456 }]),
      }),
    });
    const mockObjectionInsert = mockInsert.mockReturnValueOnce({
      values: jest.fn(),
    });
    const mockNegationInsert = mockInsert.mockReturnValueOnce({
      values: jest.fn(),
    });

    mockDb.select.mockImplementation(mockSelect);
    mockDb.transaction.mockImplementation(async (callback) => {
      const tx = {
        insert: mockInsert,
      };
      return await callback(tx as any);
    });

    const result = await addObjection({
      content: "This is an objection",
      targetPointId: 123,
      contextPointId: 124,
      cred: 0,
    });

    expect(result).toBe(456);
    expect(mockInsert).toHaveBeenCalledTimes(3); // Point, objection, negation
  });

  it("should create objection with endorsement when cred > 0", async () => {
    mockGetUserId.mockResolvedValue("user-123");
    mockGetSpace.mockResolvedValue("test-space");

    // Mock the initial negation validation query
    const mockSelect = jest.fn().mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue([{ id: 789 }]),
      }),
    });

    // Mock transaction operations
    const mockInsert = jest.fn();
    const mockUpdate = jest.fn().mockReturnValue({
      set: jest.fn().mockReturnValue({
        where: jest.fn(),
      }),
    });

    const mockPointInsert = mockInsert.mockReturnValueOnce({
      values: jest.fn().mockReturnValue({
        returning: jest.fn().mockResolvedValue([{ id: 456 }]),
      }),
    });
    const mockEndorsementInsert = mockInsert.mockReturnValueOnce({
      values: jest.fn().mockReturnValue({
        returning: jest.fn().mockResolvedValue([{ id: 789 }]),
      }),
    });
    const mockObjectionInsert = mockInsert.mockReturnValueOnce({
      values: jest.fn(),
    });
    const mockNegationInsert = mockInsert.mockReturnValueOnce({
      values: jest.fn(),
    });

    mockDb.select.mockImplementation(mockSelect);
    mockDb.transaction.mockImplementation(async (callback) => {
      const tx = {
        insert: mockInsert,
        update: mockUpdate,
      };
      return await callback(tx as any);
    });

    const result = await addObjection({
      content: "This is an objection",
      targetPointId: 123,
      contextPointId: 124,
      cred: 10,
    });

    expect(result).toBe(456);
    expect(mockInsert).toHaveBeenCalledTimes(4); // Point, endorsement, objection, negation
    expect(mockUpdate).toHaveBeenCalledTimes(1); // User cred update
  });
});
