import { updateRationalePoints } from "../updateRationalePoints";
import { db } from "@/services/db";
import { rationalePointsTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ViewpointGraph } from "@/atoms/viewpointAtoms";

// Mock the database
jest.mock("@/services/db", () => ({
  db: {
    transaction: jest.fn(),
    delete: jest.fn(),
    insert: jest.fn(),
  },
}));

// Mock drizzle-orm functions
jest.mock("drizzle-orm", () => ({
  eq: jest.fn(),
}));

// Mock the schema
jest.mock("@/db/schema", () => ({
  rationalePointsTable: {
    rationaleId: { name: "rationaleId" },
    pointId: { name: "pointId" },
  },
}));

const mockDb = db as jest.Mocked<typeof db>;

describe("updateRationalePoints", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    console.log = jest.fn();
    console.error = jest.fn();
  });

  const mockGraph: ViewpointGraph = {
    nodes: [
      {
        id: "statement",
        type: "statement",
        position: { x: 0, y: 0 },
        data: { statement: "Test statement" },
      },
      {
        id: "node1",
        type: "point",
        position: { x: 100, y: 100 },
        data: { pointId: 123, parentId: "statement" },
      },
      {
        id: "node2",
        type: "point",
        position: { x: 200, y: 200 },
        data: { pointId: 456, parentId: "node1" },
      },
      {
        id: "node3",
        type: "point",
        position: { x: 300, y: 300 },
        data: { pointId: 789, parentId: "statement" },
      },
    ],
    edges: [],
  };

  it("should extract point IDs from graph and update rationale_points table", async () => {
    const mockValues = jest.fn();
    const mockDelete = jest.fn().mockReturnValue({ where: jest.fn() });
    const mockInsert = jest.fn().mockReturnValue({ values: mockValues });

    mockDb.transaction.mockImplementation(async (callback) => {
      return await callback({
        delete: mockDelete,
        insert: mockInsert,
      } as any);
    });

    await updateRationalePoints("rationale123", mockGraph);

    expect(mockDb.transaction).toHaveBeenCalledTimes(1);
    expect(mockDelete).toHaveBeenCalledWith(rationalePointsTable);
    expect(mockInsert).toHaveBeenCalledWith(rationalePointsTable);

    // Verify the values passed to insert
    expect(mockValues).toHaveBeenCalledWith([
      { rationaleId: "rationale123", pointId: 123 },
      { rationaleId: "rationale123", pointId: 456 },
      { rationaleId: "rationale123", pointId: 789 },
    ]);

    expect(console.log).toHaveBeenCalledWith(
      "[updateRationalePoints] Updated 3 point mappings for rationale rationale123"
    );
  });

  it("should handle graph with no point nodes", async () => {
    const emptyGraph: ViewpointGraph = {
      nodes: [
        {
          id: "statement",
          type: "statement",
          position: { x: 0, y: 0 },
          data: { statement: "Test statement" },
        },
      ],
      edges: [],
    };

    const mockTransaction = jest.fn();
    const mockDelete = jest.fn().mockReturnValue({ where: jest.fn() });

    mockDb.transaction.mockImplementation(async (callback) => {
      return await callback({
        delete: mockDelete,
        insert: jest.fn(),
      } as any);
    });

    await updateRationalePoints("rationale123", emptyGraph);

    expect(mockDb.transaction).toHaveBeenCalledTimes(1);
    expect(mockDelete).toHaveBeenCalledWith(rationalePointsTable);

    expect(console.log).toHaveBeenCalledWith(
      "[updateRationalePoints] Updated 0 point mappings for rationale rationale123"
    );
  });

  it("should handle graph with invalid point IDs", async () => {
    const invalidGraph: ViewpointGraph = {
      nodes: [
        {
          id: "node1",
          type: "point",
          position: { x: 100, y: 100 },
          data: { pointId: NaN, parentId: "statement" },
        },
        {
          id: "node2",
          type: "point",
          position: { x: 200, y: 200 },
          data: { pointId: 0, parentId: "statement" },
        },
        {
          id: "node3",
          type: "point",
          position: { x: 300, y: 300 },
          data: { pointId: undefined as any, parentId: "statement" }, // No pointId
        },
        {
          id: "node4",
          type: "point",
          position: { x: 400, y: 400 },
          data: { pointId: 999, parentId: "statement" }, // Valid
        },
      ],
      edges: [],
    };

    const mockValues = jest.fn();
    const mockDelete = jest.fn().mockReturnValue({ where: jest.fn() });
    const mockInsert = jest.fn().mockReturnValue({ values: mockValues });

    mockDb.transaction.mockImplementation(async (callback) => {
      return await callback({
        delete: mockDelete,
        insert: mockInsert,
      } as any);
    });

    await updateRationalePoints("rationale123", invalidGraph);

    // Should only process the valid pointId (999)
    expect(mockValues).toHaveBeenCalledWith([
      { rationaleId: "rationale123", pointId: 999 },
    ]);

    expect(console.log).toHaveBeenCalledWith(
      "[updateRationalePoints] Updated 1 point mappings for rationale rationale123"
    );
  });

  it("should handle null or undefined graph", async () => {
    const mockTransaction = jest.fn();
    const mockDelete = jest.fn().mockReturnValue({ where: jest.fn() });

    mockDb.transaction.mockImplementation(async (callback) => {
      return await callback({
        delete: mockDelete,
        insert: jest.fn(),
      } as any);
    });

    await updateRationalePoints("rationale123", null as any);

    expect(mockDb.transaction).toHaveBeenCalledTimes(1);
    expect(console.log).toHaveBeenCalledWith(
      "[updateRationalePoints] Updated 0 point mappings for rationale rationale123"
    );
  });

  it("should handle database errors gracefully", async () => {
    const errorMessage = "Database connection failed";
    mockDb.transaction.mockRejectedValue(new Error(errorMessage));

    await updateRationalePoints("rationale123", mockGraph);

    expect(console.error).toHaveBeenCalledWith(
      "[updateRationalePoints] Failed to update rationale points for rationaleId:",
      "rationale123",
      "Error:",
      "Database connection failed"
    );

    // Should not throw error
    expect(true).toBe(true);
  });

  it("should handle duplicate point IDs in the same graph", async () => {
    const duplicateGraph: ViewpointGraph = {
      nodes: [
        {
          id: "node1",
          type: "point",
          position: { x: 100, y: 100 },
          data: { pointId: 123, parentId: "statement" },
        },
        {
          id: "node2",
          type: "point",
          position: { x: 200, y: 200 },
          data: { pointId: 123, parentId: "statement" }, // Duplicate
        },
        {
          id: "node3",
          type: "point",
          position: { x: 300, y: 300 },
          data: { pointId: 456, parentId: "statement" },
        },
      ],
      edges: [],
    };

    const mockValues = jest.fn();
    const mockDelete = jest.fn().mockReturnValue({ where: jest.fn() });
    const mockInsert = jest.fn().mockReturnValue({ values: mockValues });

    mockDb.transaction.mockImplementation(async (callback) => {
      return await callback({
        delete: mockDelete,
        insert: mockInsert,
      } as any);
    });

    await updateRationalePoints("rationale123", duplicateGraph);

    // Should deduplicate the point IDs
    expect(mockValues).toHaveBeenCalledWith([
      { rationaleId: "rationale123", pointId: 123 },
      { rationaleId: "rationale123", pointId: 456 },
    ]);

    expect(console.log).toHaveBeenCalledWith(
      "[updateRationalePoints] Updated 2 point mappings for rationale rationale123"
    );
  });

  it("should handle non-point nodes correctly", async () => {
    const mixedGraph: ViewpointGraph = {
      nodes: [
        {
          id: "statement",
          type: "statement",
          position: { x: 0, y: 0 },
          data: { statement: "Test statement" },
        },
        {
          id: "addNode",
          type: "addPoint",
          position: { x: 100, y: 100 },
          data: { parentId: "statement", content: "", hasContent: false },
        },
        {
          id: "point1",
          type: "point",
          position: { x: 200, y: 200 },
          data: { pointId: 123, parentId: "statement" },
        },
      ],
      edges: [],
    };

    const mockValues = jest.fn();
    const mockDelete = jest.fn().mockReturnValue({ where: jest.fn() });
    const mockInsert = jest.fn().mockReturnValue({ values: mockValues });

    mockDb.transaction.mockImplementation(async (callback) => {
      return await callback({
        delete: mockDelete,
        insert: mockInsert,
      } as any);
    });

    await updateRationalePoints("rationale123", mixedGraph);

    // Should only process point nodes
    expect(mockValues).toHaveBeenCalledWith([
      { rationaleId: "rationale123", pointId: 123 },
    ]);

    expect(console.log).toHaveBeenCalledWith(
      "[updateRationalePoints] Updated 1 point mappings for rationale rationale123"
    );
  });
});
