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
jest.mock("@/services/db", () => ({
  db: {
    select: jest.fn(() => ({
      from: jest.fn(() => ({
        where: jest.fn(() => ({
          limit: jest.fn(() => ({
            then: jest.fn(),
          })),
        })),
      })),
    })),
    update: jest.fn(() => ({
      set: jest.fn(() => ({
        where: jest.fn(() => ({
          returning: jest.fn(() => Promise.resolve([{ id: "viewpoint-1" }])),
        })),
      })),
    })),
  },
}));

// Now import the actual implementation and its dependencies
import { updateViewpointDetails } from "../updateViewpointDetails";
import { getUserId } from "@/actions/getUserId";
import { db } from "@/services/db";
import { viewpointsTable } from "@/db/tables/viewpointsTable";
import { eq } from "drizzle-orm";

jest.mock("@/actions/getUserId");
jest.mock("@/services/db");

const mockGetUserId = getUserId as jest.MockedFunction<typeof getUserId>;
const mockDb = db as jest.Mocked<typeof db>;

describe("updateViewpointDetails", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUserId.mockResolvedValue("test-user");

    // Mock the select query chain
    const mockSelectChain = {
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      then: jest
        .fn()
        .mockResolvedValue([{ id: "test-id", createdBy: "test-user" }]),
    };
    mockDb.select.mockReturnValue(mockSelectChain as any);

    // Mock the update query chain
    const mockUpdateChain = {
      set: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue(undefined),
      }),
    };
    mockDb.update.mockReturnValue(mockUpdateChain as any);
  });

  it("should update viewpoint details when user is authenticated and owner", async () => {
    const updateData = {
      id: "test-id",
      title: "New Title",
      description: "New Description",
    };

    const result = await updateViewpointDetails(updateData);

    expect(mockGetUserId).toHaveBeenCalled();
    expect(mockDb.select).toHaveBeenCalled();
    expect(mockDb.update).toHaveBeenCalledWith(viewpointsTable);
    expect(mockDb.update(viewpointsTable).set).toHaveBeenCalledWith({
      title: updateData.title,
      description: updateData.description,
    });
    expect(result).toBe(updateData.id);
  });

  it("should throw error when user is not authenticated", async () => {
    mockGetUserId.mockResolvedValueOnce(null);

    await expect(
      updateViewpointDetails({
        id: "test-id",
        title: "New Title",
        description: "New Description",
      })
    ).rejects.toThrow("Must be authenticated to update rationale");
  });

  it("should throw error when user is not the owner", async () => {
    // Override the select mock to return a viewpoint with a different owner
    const mockSelectDifferentOwner = {
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      then: jest
        .fn()
        .mockResolvedValue([{ id: "test-id", createdBy: "different-user" }]),
    };
    mockDb.select.mockReturnValueOnce(mockSelectDifferentOwner as any);

    await expect(
      updateViewpointDetails({
        id: "test-id",
        title: "New Title",
        description: "New Description",
      })
    ).rejects.toThrow("Only the owner can update this rationale");
  });

  it("should throw error when viewpoint is not found", async () => {
    // Override the select mock to return an empty array (no viewpoint found)
    const mockSelectEmpty = {
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      then: jest.fn().mockResolvedValue([]),
    };
    mockDb.select.mockReturnValueOnce(mockSelectEmpty as any);

    await expect(
      updateViewpointDetails({
        id: "test-id",
        title: "New Title",
        description: "New Description",
      })
    ).rejects.toThrow("Only the owner can update this rationale");
  });
});
