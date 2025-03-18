// Mock dependencies
jest.mock("@/db/schema", () => ({
  viewpointInteractionsTable: {
    viewpointId: "viewpoint_id",
    views: "views",
    lastViewed: "last_viewed",
  },
}));

jest.mock("@/services/db", () => ({
  db: {
    update: jest.fn(),
    insert: jest.fn(),
  },
}));

jest.mock("drizzle-orm", () => ({
  eq: jest.fn((a, b) => ({ column: a, value: b })),
  sql: jest.fn((args) => args),
}));

// Import after mocking
import { trackViewpointView } from "../trackViewpointView";
import { db } from "@/services/db";
import { viewpointInteractionsTable } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

describe("trackViewpointView", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should update an existing record and increment views", async () => {
    // Mock update operation that finds an existing record
    const mockSet = jest.fn().mockReturnThis();
    const mockWhere = jest.fn().mockReturnThis();
    const mockReturning = jest
      .fn()
      .mockResolvedValue([{ viewpointId: "test-id" }]);

    (db.update as jest.Mock).mockReturnValue({
      set: mockSet,
      where: mockWhere,
      returning: mockReturning,
    });

    // Call the function
    const result = await trackViewpointView("test-id");

    // Assert
    expect(result).toBe(true);
    expect(db.update).toHaveBeenCalledWith(viewpointInteractionsTable);
    expect(mockSet).toHaveBeenCalledWith({
      views: expect.anything(),
      lastViewed: expect.any(Date),
    });
    expect(mockWhere).toHaveBeenCalledWith(
      eq(viewpointInteractionsTable.viewpointId, "test-id")
    );
    expect(mockReturning).toHaveBeenCalled();

    // Insert should not have been called
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("should create a new record if none exists", async () => {
    // Mock update operation that doesn't find a record
    const mockSet = jest.fn().mockReturnThis();
    const mockWhere = jest.fn().mockReturnThis();
    const mockReturning = jest.fn().mockResolvedValue([]);

    (db.update as jest.Mock).mockReturnValue({
      set: mockSet,
      where: mockWhere,
      returning: mockReturning,
    });

    // Mock insert operation
    const mockValues = jest.fn().mockReturnThis();
    (db.insert as jest.Mock).mockReturnValue({
      values: mockValues,
    });

    // Call the function
    const result = await trackViewpointView("test-id");

    // Assert
    expect(result).toBe(true);
    expect(db.update).toHaveBeenCalledWith(viewpointInteractionsTable);
    expect(mockReturning).toHaveBeenCalled();

    // Insert should have been called
    expect(db.insert).toHaveBeenCalledWith(viewpointInteractionsTable);
    expect(mockValues).toHaveBeenCalledWith({
      viewpointId: "test-id",
      views: 1,
      copies: 0,
      lastViewed: expect.any(Date),
      lastUpdated: expect.any(Date),
    });
  });

  it("should handle errors gracefully", async () => {
    // Mock an error during the update operation
    (db.update as jest.Mock).mockImplementation(() => {
      throw new Error("Database error");
    });

    // Mock console.error to prevent test output pollution
    jest.spyOn(console, "error").mockImplementation(() => {});

    // Call the function
    const result = await trackViewpointView("test-id");

    // It should return false but not throw
    expect(result).toBe(false);
    expect(console.error).toHaveBeenCalled();
  });
});
