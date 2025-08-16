import { validateAndCleanGraph } from "../validateAndCleanGraph";
import { validatePointsExistence } from "@/actions/points/validatePointsExistence";
import { ViewpointGraph } from "@/atoms/viewpointAtoms";

// Mock the validatePointsExistence function
jest.mock("@/actions/points/validatePointsExistence");
const mockValidatePointsExistence = validatePointsExistence as jest.MockedFunction<typeof validatePointsExistence>;

describe("validateAndCleanGraph", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should remove deleted points, their child nodes, and all connected edges", async () => {
    // Setup mock: point 1 exists, point 2 is deleted
    mockValidatePointsExistence.mockResolvedValue(new Set([1]));

    const graph: ViewpointGraph = {
      nodes: [
        {
          id: "statement",
          type: "statement",
          position: { x: 0, y: 0 },
          data: { statement: "Test statement" }
        },
        {
          id: "point-1",
          type: "point",
          position: { x: 0, y: 100 },
          data: { pointId: 1 }
        },
        {
          id: "point-2",
          type: "point", 
          position: { x: 0, y: 200 },
          data: { pointId: 2 }
        },
        {
          id: "point-3",
          type: "point",
          position: { x: 0, y: 300 },
          data: { pointId: 3 }
        }
      ],
      edges: [
        {
          id: "edge-1",
          source: "point-1",
          target: "statement",
          type: "negation"
        },
        {
          id: "edge-2", 
          source: "point-2",
          target: "statement",
          type: "negation"
        },
        {
          id: "edge-3",
          source: "point-3",
          target: "point-2",
          type: "negation"
        }
      ]
    };

    const result = await validateAndCleanGraph(graph);

    // Should call validation with all point IDs
    expect(mockValidatePointsExistence).toHaveBeenCalledWith([1, 2, 3]);

    // Should keep statement and point-1, but remove point-2 and point-3 (child of deleted point-2)
    expect(result.nodes).toHaveLength(2);
    expect(result.nodes.find(n => n.id === "statement")).toBeDefined();
    expect(result.nodes.find(n => n.id === "point-1")).toBeDefined();
    expect(result.nodes.find(n => n.id === "point-2")).toBeUndefined(); // deleted
    expect(result.nodes.find(n => n.id === "point-3")).toBeUndefined(); // child of deleted

    // Should only keep edge-1, remove all edges connected to deleted nodes
    expect(result.edges).toHaveLength(1);
    expect(result.edges.find(e => e.id === "edge-1")).toBeDefined();
    expect(result.edges.find(e => e.id === "edge-2")).toBeUndefined(); // connected to deleted point-2
    expect(result.edges.find(e => e.id === "edge-3")).toBeUndefined(); // connected to deleted points
  });

  it("should return graph unchanged if no point nodes exist", async () => {
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

    const result = await validateAndCleanGraph(graph);

    // Should not call validation since no point nodes
    expect(mockValidatePointsExistence).not.toHaveBeenCalled();
    
    // Should return graph unchanged
    expect(result).toEqual(graph);
  });

  it("should return graph unchanged if all points exist", async () => {
    // Setup mock: both points exist
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
      edges: [
        {
          id: "edge-1",
          source: "point-1",
          target: "point-2", 
          type: "negation"
        }
      ]
    };

    const result = await validateAndCleanGraph(graph);

    // Should call validation
    expect(mockValidatePointsExistence).toHaveBeenCalledWith([1, 2]);
    
    // Should return graph unchanged
    expect(result).toEqual(graph);
  });

  it("should handle complex nested deletion cascades", async () => {
    // Setup: Only point 1 exists, points 2, 3, 4, 5 are deleted
    mockValidatePointsExistence.mockResolvedValue(new Set([1]));

    const graph: ViewpointGraph = {
      nodes: [
        {
          id: "statement",
          type: "statement",
          position: { x: 0, y: 0 },
          data: { statement: "Root statement" }
        },
        {
          id: "point-1",
          type: "point",
          position: { x: 0, y: 100 },
          data: { pointId: 1 }
        },
        {
          id: "point-2",
          type: "point",
          position: { x: 0, y: 200 },
          data: { pointId: 2 } // This will be deleted
        },
        {
          id: "point-3",
          type: "point",
          position: { x: -100, y: 300 },
          data: { pointId: 3 } // Child of point-2
        },
        {
          id: "point-4",
          type: "point",
          position: { x: 100, y: 300 },
          data: { pointId: 4 } // Another child of point-2
        },
        {
          id: "point-5",
          type: "point",
          position: { x: 0, y: 400 },
          data: { pointId: 5 } // Child of point-3
        }
      ],
      edges: [
        { id: "e1", source: "point-1", target: "statement", type: "negation" },
        { id: "e2", source: "point-2", target: "statement", type: "negation" },
        { id: "e3", source: "point-3", target: "point-2", type: "negation" },
        { id: "e4", source: "point-4", target: "point-2", type: "negation" },
        { id: "e5", source: "point-5", target: "point-3", type: "negation" }
      ]
    };

    const result = await validateAndCleanGraph(graph);

    // Should only keep statement and point-1
    expect(result.nodes).toHaveLength(2);
    expect(result.nodes.find(n => n.id === "statement")).toBeDefined();
    expect(result.nodes.find(n => n.id === "point-1")).toBeDefined();
    
    // All deleted points should be removed
    expect(result.nodes.find(n => n.id === "point-2")).toBeUndefined();
    expect(result.nodes.find(n => n.id === "point-3")).toBeUndefined();
    expect(result.nodes.find(n => n.id === "point-4")).toBeUndefined();
    expect(result.nodes.find(n => n.id === "point-5")).toBeUndefined();

    // Should only keep edge from point-1 to statement
    expect(result.edges).toHaveLength(1);
    expect(result.edges[0].id).toBe("e1");
  });

  it("should handle multiple unrelated deleted points", async () => {
    // Setup: points 1 and 3 exist, points 2 and 4 are deleted
    mockValidatePointsExistence.mockResolvedValue(new Set([1, 3]));

    const graph: ViewpointGraph = {
      nodes: [
        {
          id: "statement",
          type: "statement",
          position: { x: 0, y: 0 },
          data: { statement: "Root statement" }
        },
        {
          id: "point-1",
          type: "point",
          position: { x: -100, y: 100 },
          data: { pointId: 1 }
        },
        {
          id: "point-2",
          type: "point",
          position: { x: -100, y: 200 },
          data: { pointId: 2 } // Deleted
        },
        {
          id: "point-3",
          type: "point",
          position: { x: 100, y: 100 },
          data: { pointId: 3 }
        },
        {
          id: "point-4",
          type: "point",
          position: { x: 100, y: 200 },
          data: { pointId: 4 } // Deleted
        }
      ],
      edges: [
        { id: "e1", source: "point-1", target: "statement", type: "negation" },
        { id: "e2", source: "point-2", target: "point-1", type: "negation" },
        { id: "e3", source: "point-3", target: "statement", type: "negation" },
        { id: "e4", source: "point-4", target: "point-3", type: "negation" }
      ]
    };

    const result = await validateAndCleanGraph(graph);

    // Should keep statement, point-1, and point-3
    expect(result.nodes).toHaveLength(3);
    expect(result.nodes.find(n => n.id === "statement")).toBeDefined();
    expect(result.nodes.find(n => n.id === "point-1")).toBeDefined();
    expect(result.nodes.find(n => n.id === "point-3")).toBeDefined();
    
    // Should remove deleted points
    expect(result.nodes.find(n => n.id === "point-2")).toBeUndefined();
    expect(result.nodes.find(n => n.id === "point-4")).toBeUndefined();

    // Should keep edges e1 and e3, remove e2 and e4
    expect(result.edges).toHaveLength(2);
    expect(result.edges.find(e => e.id === "e1")).toBeDefined();
    expect(result.edges.find(e => e.id === "e3")).toBeDefined();
    expect(result.edges.find(e => e.id === "e2")).toBeUndefined();
    expect(result.edges.find(e => e.id === "e4")).toBeUndefined();
  });

  it("should preserve graph metadata and properties", async () => {
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
          id: "point-2",
          type: "point",
          position: { x: 0, y: 100 },
          data: { pointId: 2 } // Will be deleted
        }
      ],
      edges: [
        {
          id: "edge-1",
          source: "point-2", 
          target: "point-1",
          type: "negation"
        }
      ],
      description: "Test description",
      linkUrl: "https://example.com",
      topic: "Test topic"
    };

    const result = await validateAndCleanGraph(graph);

    // Should preserve metadata
    expect(result.description).toBe("Test description");
    expect(result.linkUrl).toBe("https://example.com");
    expect(result.topic).toBe("Test topic");
    
    // Should clean nodes and edges appropriately
    expect(result.nodes).toHaveLength(1);
    expect(result.edges).toHaveLength(0);
  });

  it("should handle nodes with invalid or missing pointId data", async () => {
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
          data: { pointId: "not-a-number" as any } // Invalid pointId type
        },
        {
          id: "statement",
          type: "statement",
          position: { x: 0, y: 300 },
          data: { statement: "Test" }
        }
      ],
      edges: [
        { id: "e1", source: "point-1", target: "statement", type: "negation" },
        { id: "e2", source: "point-invalid-1", target: "statement", type: "negation" },
        { id: "e3", source: "point-invalid-2", target: "statement", type: "negation" }
      ]
    };

    const result = await validateAndCleanGraph(graph);

    // Should only validate point-1 (only valid pointId)
    expect(mockValidatePointsExistence).toHaveBeenCalledWith([1]);

    // Should keep all nodes (invalid point nodes are kept as they're not considered deletable)
    expect(result.nodes).toHaveLength(4);
    expect(result.edges).toHaveLength(3);
  });

  it("should handle circular references without infinite loops", async () => {
    // Point 2 is deleted, creating a potential circular reference scenario
    mockValidatePointsExistence.mockResolvedValue(new Set([1, 3]));

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
          data: { pointId: 3 }
        }
      ],
      edges: [
        { id: "e1", source: "point-1", target: "point-2", type: "negation" },
        { id: "e2", source: "point-2", target: "point-3", type: "negation" },
        { id: "e3", source: "point-3", target: "point-1", type: "negation" } // Creates cycle
      ]
    };

    const result = await validateAndCleanGraph(graph);

    // Should complete without hanging and remove all point nodes
    // In this circular case, point-1 points to deleted point-2, making it a child
    // point-2 points to point-3, making it a child  
    // point-3 points to point-1, but point-1 is already marked for removal
    // So all point nodes should be removed
    expect(result.nodes).toHaveLength(0);
    expect(result.nodes.find(n => n.id === "point-1")).toBeUndefined();
    expect(result.nodes.find(n => n.id === "point-3")).toBeUndefined();
    expect(result.nodes.find(n => n.id === "point-2")).toBeUndefined();

    // Should have no edges remaining
    expect(result.edges).toHaveLength(0);
  });

  it("should handle empty graphs gracefully", async () => {
    const graph: ViewpointGraph = {
      nodes: [],
      edges: []
    };

    const result = await validateAndCleanGraph(graph);

    // Should not call validation
    expect(mockValidatePointsExistence).not.toHaveBeenCalled();
    
    // Should return unchanged
    expect(result).toEqual(graph);
  });

  it("should handle database validation errors gracefully", async () => {
    mockValidatePointsExistence.mockRejectedValue(new Error("Database error"));

    const graph: ViewpointGraph = {
      nodes: [
        {
          id: "point-1",
          type: "point",
          position: { x: 0, y: 0 },
          data: { pointId: 1 }
        }
      ],
      edges: []
    };

    // Should throw the error (let the caller handle it)
    await expect(validateAndCleanGraph(graph)).rejects.toThrow("Database error");
  });

  it("should handle deeply nested child hierarchies", async () => {
    // Only point 1 exists, creating a deep chain of deleted children
    mockValidatePointsExistence.mockResolvedValue(new Set([1]));

    const graph: ViewpointGraph = {
      nodes: [
        {
          id: "statement",
          type: "statement", 
          position: { x: 0, y: 0 },
          data: { statement: "Root" }
        },
        {
          id: "point-1",
          type: "point",
          position: { x: 0, y: 100 },
          data: { pointId: 1 }
        },
        {
          id: "point-2",
          type: "point",
          position: { x: 0, y: 200 },
          data: { pointId: 2 } // Deleted
        },
        {
          id: "point-3",
          type: "point", 
          position: { x: 0, y: 300 },
          data: { pointId: 3 } // Child of deleted point-2
        },
        {
          id: "point-4",
          type: "point",
          position: { x: 0, y: 400 },
          data: { pointId: 4 } // Child of point-3 (grandchild of deleted)
        },
        {
          id: "point-5",
          type: "point",
          position: { x: 0, y: 500 },
          data: { pointId: 5 } // Child of point-4 (great-grandchild of deleted)
        }
      ],
      edges: [
        { id: "e1", source: "point-1", target: "statement", type: "negation" },
        { id: "e2", source: "point-2", target: "statement", type: "negation" },
        { id: "e3", source: "point-3", target: "point-2", type: "negation" },
        { id: "e4", source: "point-4", target: "point-3", type: "negation" },
        { id: "e5", source: "point-5", target: "point-4", type: "negation" }
      ]
    };

    const result = await validateAndCleanGraph(graph);

    // Should only keep statement and point-1
    expect(result.nodes).toHaveLength(2);
    expect(result.nodes.find(n => n.id === "statement")).toBeDefined();
    expect(result.nodes.find(n => n.id === "point-1")).toBeDefined();

    // All the chain of deleted/child nodes should be removed
    expect(result.nodes.find(n => n.id === "point-2")).toBeUndefined();
    expect(result.nodes.find(n => n.id === "point-3")).toBeUndefined();
    expect(result.nodes.find(n => n.id === "point-4")).toBeUndefined();
    expect(result.nodes.find(n => n.id === "point-5")).toBeUndefined();

    // Should only keep one edge
    expect(result.edges).toHaveLength(1);
    expect(result.edges[0].id).toBe("e1");
  });

  it("should handle mixed node types correctly", async () => {
    mockValidatePointsExistence.mockResolvedValue(new Set([1]));

    const graph: ViewpointGraph = {
      nodes: [
        {
          id: "statement",
          type: "statement",
          position: { x: 0, y: 0 },
          data: { statement: "Root statement" }
        },
        {
          id: "comment-1",
          type: "comment",
          position: { x: 100, y: 0 },
          data: { content: "A comment node" }
        },
        {
          id: "point-1",
          type: "point",
          position: { x: 0, y: 100 },
          data: { pointId: 1 }
        },
        {
          id: "point-2",
          type: "point",
          position: { x: 0, y: 200 },
          data: { pointId: 2 } // Deleted
        },
        {
          id: "add-point",
          type: "addPoint",
          position: { x: 200, y: 100 },
          data: { parentId: "statement", content: "", hasContent: false }
        }
      ],
      edges: [
        { id: "e1", source: "point-1", target: "statement", type: "negation" },
        { id: "e2", source: "point-2", target: "statement", type: "negation" },
        { id: "e3", source: "comment-1", target: "statement", type: "support" }
      ]
    };

    const result = await validateAndCleanGraph(graph);

    // Should keep all non-point nodes and existing point
    expect(result.nodes).toHaveLength(4);
    expect(result.nodes.find(n => n.id === "statement")).toBeDefined();
    expect(result.nodes.find(n => n.id === "comment-1")).toBeDefined();
    expect(result.nodes.find(n => n.id === "point-1")).toBeDefined();
    expect(result.nodes.find(n => n.id === "add-point")).toBeDefined();
    expect(result.nodes.find(n => n.id === "point-2")).toBeUndefined();

    // Should keep edges not connected to deleted point
    expect(result.edges).toHaveLength(2);
    expect(result.edges.find(e => e.id === "e1")).toBeDefined();
    expect(result.edges.find(e => e.id === "e3")).toBeDefined();
    expect(result.edges.find(e => e.id === "e2")).toBeUndefined();
  });
});