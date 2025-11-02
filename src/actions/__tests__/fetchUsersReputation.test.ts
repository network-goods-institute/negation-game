// Mock postgres before importing the implementation
jest.mock("postgres", () => {
  const mockSql = jest.fn();
  return jest.fn(() => mockSql) as unknown as typeof import("postgres");
});

import { fetchUsersReputation } from "../users/fetchUsersReputation";
import postgres from "postgres";import { logger } from "@/lib/logger";

describe("fetchUsersReputation", () => {
  let mockSql: jest.Mock;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    // Get the mock SQL function
    mockSql = (postgres as unknown as jest.Mock)().mockImplementation();

    // Disable logger.logs during tests
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  it("should return empty object for empty user list", async () => {
    const result = await fetchUsersReputation([]);
    expect(result).toEqual({});
    expect(mockSql).not.toHaveBeenCalled();
  });

  it("should fetch reputation data for multiple users", async () => {
    // Mock the SQL query response with the exact format expected
    mockSql.mockResolvedValueOnce([
      { userId: "user-1", reputation: "75" },
      { userId: "user-2", reputation: "25" },
    ]);

    const result = await fetchUsersReputation(["user-1", "user-2"]);

    expect(result).toEqual({
      "user-1": 75,
      "user-2": 25,
    });

    // Verify SQL was called once
    expect(mockSql).toHaveBeenCalledTimes(1);
  });

  it("should handle database errors gracefully", async () => {
    // Mock the query to throw an error
    mockSql.mockRejectedValueOnce(new Error("Database error"));

    const result = await fetchUsersReputation(["user-1"]);

    // Should return empty object on error
    expect(result).toEqual({});
  });

  it("should handle missing users gracefully", async () => {
    // Mock SQL query response for a user with default reputation
    mockSql.mockResolvedValueOnce([{ userId: "user-1", reputation: "50" }]);

    const result = await fetchUsersReputation(["user-1"]);

    expect(result).toEqual({
      "user-1": 50,
    });
  });

  it("should handle different column name formats", async () => {
    // Test with a variety of column name formats that might come from SQL
    mockSql.mockResolvedValueOnce([
      { user_id: "user-1", reputation: "60" },
      { userid: "user-2", reputation: "70" },
    ]);

    const result = await fetchUsersReputation(["user-1", "user-2"]);

    expect(result).toEqual({
      "user-1": 60,
      "user-2": 70,
    });
  });

  it("should default to 50 for invalid reputation values", async () => {
    mockSql.mockResolvedValueOnce([
      { userId: "user-1", reputation: "NaN" },
      { userId: "user-2", reputation: null },
    ]);

    const result = await fetchUsersReputation(["user-1", "user-2"]);

    expect(result).toEqual({
      "user-1": 50,
      "user-2": 50,
    });
  });
});
