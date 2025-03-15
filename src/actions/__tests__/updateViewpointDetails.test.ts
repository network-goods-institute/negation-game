// Mock dependencies before importing the implementation
jest.mock("../getUserId", () => ({
  getUserId: jest.fn(),
}));

// Mock the database schema
jest.mock("@/db/tables/viewpointsTable", () => ({
  viewpointsTable: {
    id: "id",
    createdBy: "created_by",
    title: "title",
    description: "content",
  },
}));

// Mock drizzle-orm
jest.mock("drizzle-orm", () => ({
  eq: jest.fn((a, b) => ({ a, b })),
}));

// Mock the db service
jest.mock("@/services/db", () => {
  const mockDb = {
    select: jest.fn(),
    update: jest.fn(),
  };
  return { db: mockDb };
});

// Now import the actual implementation and its dependencies
import { updateViewpointDetails } from "../updateViewpointDetails";
import { getUserId } from "../getUserId";
import { db } from "@/services/db";
import { viewpointsTable } from "@/db/tables/viewpointsTable";

describe("updateViewpointDetails", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should throw error if user is not authenticated", async () => {
    // Setup: user is not authenticated
    (getUserId as jest.Mock).mockResolvedValue(null);

    // Execute & Assert
    await expect(
      updateViewpointDetails({
        id: "test-id",
        title: "Test Title",
        description: "Test Description",
      })
    ).rejects.toThrow("Must be authenticated to update rationale");

    // Verify dependencies were called correctly
    expect(getUserId).toHaveBeenCalled();
  });

  it("should throw error if user is not the owner", async () => {
    // Setup: user is authenticated but not the owner
    (getUserId as jest.Mock).mockResolvedValue("user-123");
    // Create a select chain mock for the owner check returning different owner
    const selectChainMock = {
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      then: jest.fn().mockResolvedValue([{ createdBy: "different-user" }]),
    };
    (db.select as jest.Mock).mockReturnValueOnce(selectChainMock);

    // Execute & Assert
    await expect(
      updateViewpointDetails({
        id: "test-id",
        title: "Test Title",
        description: "Test Description",
      })
    ).rejects.toThrow("Only the owner can update this rationale");

    // Verify dependencies were called correctly
    expect(getUserId).toHaveBeenCalled();
    expect(db.select).toHaveBeenCalled();
    expect(selectChainMock.from).toHaveBeenCalledWith(viewpointsTable);
    expect(selectChainMock.where).toHaveBeenCalled();
  });

  it("should update viewpoint details if user is the owner", async () => {
    // Setup: user is authenticated and is the owner
    (getUserId as jest.Mock).mockResolvedValue("owner-id");

    // Create a select chain mock for the owner check returning matching owner
    const selectChainMock = {
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      then: jest.fn().mockResolvedValue([{ createdBy: "owner-id" }]),
    };
    (db.select as jest.Mock).mockReturnValueOnce(selectChainMock);

    // Create an update chain mock for updating the record
    const updateChainMock = {
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockResolvedValue("test-id"),
    };
    (db.update as jest.Mock).mockReturnValueOnce(updateChainMock);

    // Execute
    const result = await updateViewpointDetails({
      id: "test-id",
      title: "Updated Title",
      description: "Updated Description",
    });

    // Assert
    expect(result).toBe("test-id");

    // Verify dependencies were called correctly
    expect(getUserId).toHaveBeenCalled();
    expect(db.select).toHaveBeenCalled();
    expect(selectChainMock.from).toHaveBeenCalledWith(viewpointsTable);
    expect(db.update).toHaveBeenCalledWith(viewpointsTable);
    expect(updateChainMock.set).toHaveBeenCalledWith({
      title: "Updated Title",
      description: "Updated Description",
    });
    expect(updateChainMock.where).toHaveBeenCalled();
  });
});
