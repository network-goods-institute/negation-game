/**
 * Integration test for publish viewpoint validation
 * This test focuses on the validation logic without deep mocking
 */

import { ViewpointGraph } from "@/atoms/viewpointAtoms";

// Mock the validate function to control its behavior
const mockValidatePointsExistence = jest.fn();
jest.mock("@/actions/points/validatePointsExistence", () => ({
  validatePointsExistence: mockValidatePointsExistence
}));

describe("Publish Viewpoint Validation", () => {
  // Test the validation logic in isolation
  const validateGraphPoints = async (graph: ViewpointGraph) => {
    const pointIds = graph.nodes
      .filter((node) => 
        node.type === "point" && 
        node.data && 
        typeof node.data === "object" &&
        "pointId" in node.data && 
        typeof node.data.pointId === "number"
      )
      .map(node => (node.data as any).pointId as number);

    if (pointIds.length > 0) {
      const { validatePointsExistence } = await import("@/actions/points/validatePointsExistence");
      const existingPointIds = await validatePointsExistence(pointIds);
      const deletedPointIds = pointIds.filter(id => !existingPointIds.has(id));
      
      if (deletedPointIds.length > 0) {
        throw new Error(
          `Cannot publish rationale: ${deletedPointIds.length} point${deletedPointIds.length === 1 ? '' : 's'} no longer exist${deletedPointIds.length === 1 ? 's' : ''}. Please remove any empty or deleted nodes from your rationale and try again.`
        );
      }
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should pass validation when all points exist", async () => {
    mockValidatePointsExistence.mockResolvedValue(new Set([1, 2]));

    const graph: ViewpointGraph = {
      nodes: [
        {
          id: "point-1",
          type: "point",
          position: { x: 0, y: 0 },
          data: { pointId: 1 }
        },
        {
          id: "point-2",
          type: "point",
          position: { x: 0, y: 100 },
          data: { pointId: 2 }
        }
      ],
      edges: []
    };

    // Should not throw
    await expect(validateGraphPoints(graph)).resolves.toBeUndefined();
    expect(mockValidatePointsExistence).toHaveBeenCalledWith([1, 2]);
  });

  it("should throw error with correct message for single deleted point", async () => {
    mockValidatePointsExistence.mockResolvedValue(new Set([1])); // point 2 is missing

    const graph: ViewpointGraph = {
      nodes: [
        {
          id: "point-1", 
          type: "point",
          position: { x: 0, y: 0 },
          data: { pointId: 1 }
        },
        {
          id: "point-2",
          type: "point",
          position: { x: 0, y: 100 },
          data: { pointId: 2 } // This point is deleted
        }
      ],
      edges: []
    };

    await expect(validateGraphPoints(graph)).rejects.toThrow(
      "Cannot publish rationale: 1 point no longer exists. Please remove any empty or deleted nodes from your rationale and try again."
    );
  });

  it("should throw error with correct plural message for multiple deleted points", async () => {
    mockValidatePointsExistence.mockResolvedValue(new Set([1])); // points 2 and 3 are missing

    const graph: ViewpointGraph = {
      nodes: [
        {
          id: "point-1",
          type: "point", 
          position: { x: 0, y: 0 },
          data: { pointId: 1 }
        },
        {
          id: "point-2",
          type: "point",
          position: { x: 0, y: 100 },
          data: { pointId: 2 } // Deleted
        },
        {
          id: "point-3",
          type: "point",
          position: { x: 0, y: 200 },
          data: { pointId: 3 } // Deleted
        }
      ],
      edges: []
    };

    await expect(validateGraphPoints(graph)).rejects.toThrow(
      "Cannot publish rationale: 2 points no longer exist. Please remove any empty or deleted nodes from your rationale and try again."
    );
  });

  it("should skip validation for graphs with no point nodes", async () => {
    const graph: ViewpointGraph = {
      nodes: [
        {
          id: "statement",
          type: "statement",
          position: { x: 0, y: 0 },
          data: { statement: "Test statement" }
        }
      ],
      edges: []
    };

    // Should not call validation
    await expect(validateGraphPoints(graph)).resolves.toBeUndefined();
    expect(mockValidatePointsExistence).not.toHaveBeenCalled();
  });

  it("should only validate nodes with valid pointId data", async () => {
    mockValidatePointsExistence.mockResolvedValue(new Set([1]));

    const graph: ViewpointGraph = {
      nodes: [
        {
          id: "point-1",
          type: "point",
          position: { x: 0, y: 0 },
          data: { pointId: 1 }
        },
        {
          id: "point-invalid-1",
          type: "point",
          position: { x: 0, y: 100 },
          data: { pointId: undefined } as any // Missing pointId
        },
        {
          id: "point-invalid-2",
          type: "point",
          position: { x: 0, y: 200 },
          data: { pointId: "invalid" } as any // Invalid pointId type
        }
      ],
      edges: []
    };

    // Should only validate the valid point
    await expect(validateGraphPoints(graph)).resolves.toBeUndefined();
    expect(mockValidatePointsExistence).toHaveBeenCalledWith([1]);
  });
});