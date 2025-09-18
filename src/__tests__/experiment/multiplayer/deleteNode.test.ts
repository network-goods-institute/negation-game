import { createDeleteNode } from "@/utils/experiment/multiplayer/graphOperations";

describe("createDeleteNode", () => {
  let mockNodes: any[];
  let mockEdges: any[];
  let mockSetNodes: jest.Mock;
  let mockSetEdges: jest.Mock;
  let deleteNode: (nodeId: string) => void;

  beforeEach(() => {
    mockNodes = [];
    mockEdges = [];
    mockSetNodes = jest.fn((updater) => {
      if (typeof updater === "function") {
        mockNodes = updater(mockNodes);
      }
    });
    mockSetEdges = jest.fn((updater) => {
      if (typeof updater === "function") {
        mockEdges = updater(mockEdges);
      }
    });

    deleteNode = createDeleteNode(
      mockNodes,
      mockEdges,
      null, // yNodesMap
      null, // yEdgesMap
      null, // yTextMap
      null, // ydoc
      true, // canWrite
      {}, // localOrigin
      mockSetNodes,
      mockSetEdges,
      undefined, // isLockedForMe
      undefined // getLockOwner
    );
  });

  describe("when deleting an edge", () => {
    it("should delete the edge and associated objection nodes", () => {
      // Setup test data
      const edgeId = "test-edge-1";
      const anchorId = `anchor:${edgeId}`;
      const objectionId = "o-123-456";
      const objectionEdgeId = "obj-edge-1";

      mockEdges = [
        {
          id: edgeId,
          source: "source-node",
          target: "target-node",
          type: "negation",
        },
        {
          id: objectionEdgeId,
          source: objectionId,
          target: anchorId,
          type: "objection",
        },
      ];

      mockNodes = [
        {
          id: anchorId,
          type: "edge_anchor",
          data: { parentEdgeId: edgeId },
        },
        {
          id: objectionId,
          type: "objection",
          data: { content: "Test objection", parentEdgeId: edgeId },
        },
        {
          id: "other-node",
          type: "point",
          data: { content: "Other node" },
        },
      ];

      // Update the deleteNode function with current mock data
      deleteNode = createDeleteNode(
        mockNodes,
        mockEdges,
        null, // yNodesMap
        null, // yEdgesMap
        null, // yTextMap
        null, // ydoc
        true, // canWrite
        {}, // localOrigin
        mockSetNodes,
        mockSetEdges,
        undefined, // isLockedForMe
        undefined // getLockOwner
      );

      // Execute delete
      deleteNode(edgeId);

      // Verify edges were deleted
      expect(mockSetEdges).toHaveBeenCalledWith(expect.any(Function));

      // Simulate the setEdges call
      const setEdgesUpdater = mockSetEdges.mock.calls[0][0];
      const updatedEdges = setEdgesUpdater(mockEdges);
      expect(updatedEdges).toHaveLength(0); // All edges should be deleted

      // Verify nodes were deleted
      expect(mockSetNodes).toHaveBeenCalledWith(expect.any(Function));

      // Simulate the setNodes call
      const setNodesUpdater = mockSetNodes.mock.calls[0][0];
      const updatedNodes = setNodesUpdater(mockNodes);
      expect(updatedNodes).toHaveLength(1); // Only the unrelated node should remain
      expect(updatedNodes[0].id).toBe("other-node");
    });

    it("should handle edges without objection nodes", () => {
      const edgeId = "test-edge-2";

      mockEdges = [
        {
          id: edgeId,
          source: "source-node",
          target: "target-node",
          type: "negation",
        },
      ];

      mockNodes = [
        {
          id: "other-node",
          type: "point",
          data: { content: "Other node" },
        },
      ];

      // Update the deleteNode function with current mock data
      deleteNode = createDeleteNode(
        mockNodes,
        mockEdges,
        null, // yNodesMap
        null, // yEdgesMap
        null, // yTextMap
        null, // ydoc
        true, // canWrite
        {}, // localOrigin
        mockSetNodes,
        mockSetEdges,
        undefined, // isLockedForMe
        undefined // getLockOwner
      );

      // Execute delete
      deleteNode(edgeId);

      // Verify edges were deleted
      expect(mockSetEdges).toHaveBeenCalledWith(expect.any(Function));

      // Simulate the setEdges call
      const setEdgesUpdater = mockSetEdges.mock.calls[0][0];
      const updatedEdges = setEdgesUpdater(mockEdges);
      expect(updatedEdges).toHaveLength(0); // Edge should be deleted

      // Verify no nodes were deleted
      expect(mockSetNodes).toHaveBeenCalledWith(expect.any(Function));

      // Simulate the setNodes call
      const setNodesUpdater = mockSetNodes.mock.calls[0][0];
      const updatedNodes = setNodesUpdater(mockNodes);
      expect(updatedNodes).toHaveLength(1); // No nodes should be deleted
      expect(updatedNodes[0].id).toBe("other-node");
    });

    it("should handle multiple objection nodes on the same edge", () => {
      const edgeId = "test-edge-3";
      const anchorId = `anchor:${edgeId}`;
      const objectionId1 = "o-123-456";
      const objectionId2 = "o-789-012";
      const objectionEdgeId1 = "obj-edge-1";
      const objectionEdgeId2 = "obj-edge-2";

      mockEdges = [
        {
          id: edgeId,
          source: "source-node",
          target: "target-node",
          type: "negation",
        },
        {
          id: objectionEdgeId1,
          source: objectionId1,
          target: anchorId,
          type: "objection",
        },
        {
          id: objectionEdgeId2,
          source: objectionId2,
          target: anchorId,
          type: "objection",
        },
      ];

      mockNodes = [
        {
          id: anchorId,
          type: "edge_anchor",
          data: { parentEdgeId: edgeId },
        },
        {
          id: objectionId1,
          type: "objection",
          data: { content: "Test objection 1", parentEdgeId: edgeId },
        },
        {
          id: objectionId2,
          type: "objection",
          data: { content: "Test objection 2", parentEdgeId: edgeId },
        },
        {
          id: "other-node",
          type: "point",
          data: { content: "Other node" },
        },
      ];

      // Update the deleteNode function with current mock data
      deleteNode = createDeleteNode(
        mockNodes,
        mockEdges,
        null, // yNodesMap
        null, // yEdgesMap
        null, // yTextMap
        null, // ydoc
        true, // canWrite
        {}, // localOrigin
        mockSetNodes,
        mockSetEdges,
        undefined, // isLockedForMe
        undefined // getLockOwner
      );

      // Execute delete
      deleteNode(edgeId);

      // Verify edges were deleted
      expect(mockSetEdges).toHaveBeenCalledWith(expect.any(Function));

      // Simulate the setEdges call
      const setEdgesUpdater = mockSetEdges.mock.calls[0][0];
      const updatedEdges = setEdgesUpdater(mockEdges);
      expect(updatedEdges).toHaveLength(0); // All edges should be deleted

      // Verify nodes were deleted
      expect(mockSetNodes).toHaveBeenCalledWith(expect.any(Function));

      // Simulate the setNodes call
      const setNodesUpdater = mockSetNodes.mock.calls[0][0];
      const updatedNodes = setNodesUpdater(mockNodes);
      expect(updatedNodes).toHaveLength(1); // Only the unrelated node should remain
      expect(updatedNodes[0].id).toBe("other-node");
    });
  });

  describe("when deleting a node", () => {
    it("should delete the node and its incident edges", () => {
      const nodeId = "test-node-1";

      mockEdges = [
        {
          id: "edge-1",
          source: nodeId,
          target: "other-node",
          type: "negation",
        },
        {
          id: "edge-2",
          source: "another-node",
          target: nodeId,
          type: "negation",
        },
        {
          id: "edge-3",
          source: "unrelated-1",
          target: "unrelated-2",
          type: "negation",
        },
      ];

      mockNodes = [
        {
          id: nodeId,
          type: "point",
          data: { content: "Test node" },
        },
        {
          id: "other-node",
          type: "point",
          data: { content: "Other node" },
        },
        {
          id: "another-node",
          type: "point",
          data: { content: "Another node" },
        },
      ];

      // Update the deleteNode function with current mock data
      deleteNode = createDeleteNode(
        mockNodes,
        mockEdges,
        null, // yNodesMap
        null, // yEdgesMap
        null, // yTextMap
        null, // ydoc
        true, // canWrite
        {}, // localOrigin
        mockSetNodes,
        mockSetEdges,
        undefined, // isLockedForMe
        undefined // getLockOwner
      );

      // Execute delete
      deleteNode(nodeId);

      // Verify edges were deleted
      expect(mockSetEdges).toHaveBeenCalledWith(expect.any(Function));

      // Simulate the setEdges call
      const setEdgesUpdater = mockSetEdges.mock.calls[0][0];
      const updatedEdges = setEdgesUpdater(mockEdges);
      expect(updatedEdges).toHaveLength(1); // Only unrelated edge should remain
      expect(updatedEdges[0].id).toBe("edge-3");

      // Verify nodes were deleted
      expect(mockSetNodes).toHaveBeenCalledWith(expect.any(Function));

      // Simulate the setNodes call
      const setNodesUpdater = mockSetNodes.mock.calls[0][0];
      const updatedNodes = setNodesUpdater(mockNodes);
      expect(updatedNodes).toHaveLength(2); // Only unrelated nodes should remain
      expect(updatedNodes.map((n: any) => n.id)).toEqual(
        expect.arrayContaining(["other-node", "another-node"])
      );
    });
  });
});

