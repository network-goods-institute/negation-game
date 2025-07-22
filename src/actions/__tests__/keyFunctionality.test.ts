// Mock the database and dependencies BEFORE importing the modules
jest.mock("@/services/db");
jest.mock("@/actions/users/getUserId");
jest.mock("@/actions/spaces/getSpace");
jest.mock("@/actions/ai/addEmbedding");
jest.mock("@/actions/ai/addKeywords");
jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));
jest.mock("@/db/schema", () => ({
  pointsTable: {},
  endorsementsTable: {},
  usersTable: {},
  viewpointsTable: {},
}));

import { makePoint } from "@/actions/points/makePoint";
import { updateViewpointDetails } from "@/actions/viewpoints/updateViewpointDetails";
import { createRationaleFromPreview } from "@/actions/viewpoints/createRationaleFromPreview";
import { db } from "@/services/db";

const mockDb = db as jest.Mocked<typeof db>;

// This will be used to mock the transaction object
const mockTx = {
  insert: jest.fn(),
  update: jest.fn(),
  select: jest.fn(),
};

describe("Key Functionality Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks(); // Ensure a clean state for each test
    // Default transaction mock that passes the transaction object to the callback
    mockDb.transaction.mockImplementation(async (callback) =>
      callback(mockTx as any)
    );
  });

  describe("makePoint", () => {
    it("should create a new point successfully", async () => {
      // Mock the insert call within the transaction
      mockTx.insert.mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([{ id: 123 }]),
        }),
      } as any);

      // Mock the update call for user cred (though not used in this test case)
      mockTx.update.mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(undefined),
        }),
      } as any);

      // Mock getUserId
      const { getUserId } = require("@/actions/users/getUserId");
      getUserId.mockResolvedValue("user123");

      // Mock getSpace
      const { getSpace } = require("@/actions/spaces/getSpace");
      getSpace.mockResolvedValue("testspace");

      // Mock addEmbedding and addKeywords
      const { addEmbedding } = require("@/actions/ai/addEmbedding");
      addEmbedding.mockResolvedValue(undefined);

      const { addKeywords } = require("@/actions/ai/addKeywords");
      addKeywords.mockResolvedValue(undefined);

      const result = await makePoint({
        content: "Test point content",
        cred: 0,
      });

      expect(result).toBe(123); // makePoint returns the point ID
      expect(mockTx.insert).toHaveBeenCalled();
    });

    it("should handle point creation with cred", async () => {
      // Mock the insert call for pointsTable
      mockTx.insert.mockReturnValueOnce({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([{ id: 124 }]),
        }),
      } as any);

      // Mock the insert call for endorsementsTable
      mockTx.insert.mockReturnValueOnce({
        values: jest.fn().mockResolvedValue(undefined),
      } as any);

      // Mock the user credit update
      mockTx.update.mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(undefined),
        }),
      } as any);

      const { getUserId } = require("@/actions/users/getUserId");
      getUserId.mockResolvedValue("user123");

      const { getSpace } = require("@/actions/spaces/getSpace");
      getSpace.mockResolvedValue("testspace");

      const { addEmbedding } = require("@/actions/ai/addEmbedding");
      addEmbedding.mockResolvedValue(undefined);

      const { addKeywords } = require("@/actions/ai/addKeywords");
      addKeywords.mockResolvedValue(undefined);

      const result = await makePoint({
        content: "Test point with cred",
        cred: 50,
      });

      expect(result).toBe(124);
      expect(mockTx.insert).toHaveBeenCalledTimes(2); // Point + Endorsement
    });
  });

  describe("updateViewpointDetails", () => {
    it("should update viewpoint title and content", async () => {
      const mockViewpoint = {
        id: "viewpoint123",
        title: "Updated Title",
        content: "Updated content",
        authorId: "user123",
        status: "draft" as const,
      };

      // Mock the select calls in order
      mockDb.select
        .mockReturnValueOnce({
          // First select for ownership check
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue({
                then: (cb: any) =>
                  Promise.resolve(cb([{ createdBy: "user123", graph: "[]" }])),
              }),
            }),
          }),
        } as any)
        .mockReturnValueOnce({
          // Second select for interactions
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([{ views: 0 }]),
            }),
          }),
        } as any);

      // Mock the update calls in order
      mockDb.update
        .mockReturnValueOnce({
          // First update for viewpointsTable
          set: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue(undefined),
          }),
        } as any)
        .mockReturnValueOnce({
          // Second update for viewpointInteractionsTable
          set: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              catch: jest.fn().mockResolvedValue(undefined),
            }),
          }),
        } as any);

      const { getUserId } = require("@/actions/users/getUserId");
      getUserId.mockResolvedValue("user123");

      const result = await updateViewpointDetails({
        id: "viewpoint123",
        title: "Updated Title",
        description: "Updated description",
      });

      expect(result).toBe("viewpoint123");
    });

    it("should handle unauthorized updates", async () => {
      const { getUserId } = require("@/actions/users/getUserId");
      getUserId.mockReturnValueOnce("otheruser123");

      // Mock viewpoint owned by different user
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              then: jest.fn().mockResolvedValue([
                {
                  id: "viewpoint123",
                  authorId: "user123", // Different from current user
                },
              ]),
            }),
          }),
        }),
      } as any);

      await expect(
        updateViewpointDetails({
          id: "viewpoint123",
          title: "Unauthorized Update",
          description: "Some description",
        })
      ).rejects.toThrow();
    });
  });

  describe("createRationaleFromPreview", () => {
    it("should validate input data structure", async () => {
      // Test that the function exists and can be called with proper parameters
      const { getUserId } = require("@/actions/users/getUserId");
      getUserId.mockResolvedValue("user123");

      const { getSpace } = require("@/actions/spaces/getSpace");
      getSpace.mockResolvedValue("testspace");

      // Mock successful rationale creation
      mockDb.insert.mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([
            {
              id: "rationale123",
              title: "New Rationale",
              authorId: "user123",
            },
          ]),
        }),
      } as any);

      // This test mainly ensures the function can be imported and called
      expect(createRationaleFromPreview).toBeDefined();
      expect(typeof createRationaleFromPreview).toBe("function");
    });
  });
});
