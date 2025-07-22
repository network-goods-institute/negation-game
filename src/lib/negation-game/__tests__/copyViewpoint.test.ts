import { regenerateGraphIds, prepareGraphForCopy } from "../copyViewpoint";
import { ViewpointGraph } from "@/atoms/viewpointAtoms";

describe("copyViewpoint", () => {
  describe("regenerateGraphIds", () => {
    it("should preserve all edges when regenerating IDs", () => {
      const testGraph: ViewpointGraph = {
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
            data: { content: "Point 1" },
          },
          {
            id: "node2",
            type: "point",
            position: { x: 200, y: 200 },
            data: { content: "Point 2" },
          },
        ] as any,
        edges: [
          {
            id: "edge1",
            source: "statement",
            target: "node1",
            type: "support",
          },
          {
            id: "edge2",
            source: "statement",
            target: "node2",
            type: "oppose",
          },
          {
            id: "edge3",
            source: "node1",
            target: "node2",
            type: "relation",
          },
        ] as any,
      };

      const result = regenerateGraphIds(testGraph);

      // Should preserve all nodes and edges
      expect(result.nodes).toHaveLength(3);
      expect(result.edges).toHaveLength(3);

      // Statement node should keep its ID
      const statementNode = result.nodes.find((n) => n.id === "statement");
      expect(statementNode).toBeDefined();
      expect(statementNode?.type).toBe("statement");

      // All edges should be properly mapped
      result.edges.forEach((edge) => {
        expect(edge.source).toBeDefined();
        expect(edge.target).toBeDefined();
        expect(edge.id).toBeDefined();

        // Source and target should exist in the node list
        const sourceExists = result.nodes.some((n) => n.id === edge.source);
        const targetExists = result.nodes.some((n) => n.id === edge.target);
        expect(sourceExists).toBe(true);
        expect(targetExists).toBe(true);
      });
    });

    it("should not remove edges with different types between same nodes", () => {
      const testGraph: ViewpointGraph = {
        nodes: [
          {
            id: "statement",
            type: "statement",
            position: { x: 0, y: 0 },
            data: { statement: "Test" },
          },
          {
            id: "node1",
            type: "point",
            position: { x: 100, y: 100 },
            data: { content: "Point 1" },
          },
        ] as any,
        edges: [
          {
            id: "edge1",
            source: "statement",
            target: "node1",
            type: "support",
          },
          {
            id: "edge2",
            source: "statement",
            target: "node1",
            type: "oppose", // Different type to same target
          },
        ] as any,
      };

      const result = regenerateGraphIds(testGraph);

      // Should keep both edges since they have different types
      expect(result.edges).toHaveLength(2);

      // Should have one support and one oppose edge
      const edgeTypes = result.edges.map((e) => e.type);
      expect(edgeTypes).toContain("support");
      expect(edgeTypes).toContain("oppose");
    });

    it("should remove truly duplicate edges", () => {
      const testGraph: ViewpointGraph = {
        nodes: [
          {
            id: "statement",
            type: "statement",
            position: { x: 0, y: 0 },
            data: { statement: "Test" },
          },
          {
            id: "node1",
            type: "point",
            position: { x: 100, y: 100 },
            data: { content: "Point 1" },
          },
        ] as any,
        edges: [
          {
            id: "edge1",
            source: "statement",
            target: "node1",
            type: "support",
          },
          {
            id: "edge2",
            source: "statement",
            target: "node1",
            type: "support", // Exact duplicate
          },
        ] as any,
      };

      const result = regenerateGraphIds(testGraph);

      // Should remove the duplicate edge
      expect(result.edges).toHaveLength(1);
      expect(result.edges[0].type).toBe("support");
    });
  });

  describe("prepareGraphForCopy", () => {
    it("should preserve edges when preparing graph", () => {
      const testGraph: ViewpointGraph = {
        nodes: [
          {
            id: "node1",
            type: "point",
            position: { x: 100, y: 100 },
            data: { content: "Point 1" },
          },
          {
            id: "node2",
            type: "point",
            position: { x: 200, y: 200 },
            data: { content: "Point 2" },
          },
        ] as any,
        edges: [
          {
            id: "edge1",
            source: "node1",
            target: "node2",
            type: "relation",
          },
        ] as any,
      };

      const result = prepareGraphForCopy(testGraph, "Test Title");

      // Should add statement node and preserve existing edge
      expect(result.nodes).toHaveLength(3); // 2 original + 1 statement
      expect(result.edges).toHaveLength(1); // Original edge preserved

      // Statement node should be added
      const statementNode = result.nodes.find((n) => n.type === "statement");
      expect(statementNode).toBeDefined();
      expect(statementNode?.type).toBe("statement");

      // Type guard to check statement data
      if (statementNode?.type === "statement") {
        expect((statementNode.data as any).statement).toBe("Test Title");
      }
    });
  });
});
