import { applyGraphCommands } from "../graphCommandProcessor";
import { ViewpointGraph } from "@/atoms/viewpointAtoms";
import { GraphCommand } from "@/types/graphCommands";

describe("graphCommandProcessor", () => {
  let baseGraph: ViewpointGraph;

  beforeEach(() => {
    baseGraph = {
      nodes: [
        {
          id: "statement",
          type: "statement",
          position: { x: 0, y: 0 },
          data: { statement: "Test Topic" },
          draggable: true,
          selected: false,
          selectable: true,
          connectable: true,
          deletable: true,
        },
        {
          id: "point-1",
          type: "point",
          position: { x: 100, y: 100 },
          data: {
            pointId: 1,
            content: "Original point content",
            viewerCred: 5,
          } as any,
          draggable: true,
          selected: false,
          selectable: true,
          connectable: true,
          deletable: true,
        },
      ],
      edges: [
        {
          id: "edge-1",
          source: "statement",
          target: "point-1",
          type: "statement",
          selected: false,
          animated: false,
          deletable: true,
          data: {},
        },
      ],
    };
  });

  describe("add_point command", () => {
    it("should add a new point node", () => {
      const commands: GraphCommand[] = [
        {
          id: "cmd-1",
          type: "add_point",
          nodeId: "point-new-1",
          content: "New point content",
          cred: 3,
        },
        {
          id: "cmd-2",
          type: "add_edge",
          edgeId: "edge-new-1",
          source: "statement",
          target: "point-new-1",
          edgeType: "statement",
        },
      ];

      const { updatedGraph, errors } = applyGraphCommands(baseGraph, commands);

      expect(errors).toHaveLength(0);
      expect(updatedGraph.nodes).toHaveLength(3);
      expect(updatedGraph.edges).toHaveLength(2);
      
      const newNode = updatedGraph.nodes.find(n => n.id === "point-new-1");
      expect(newNode).toBeDefined();
      expect(newNode?.type).toBe("point");
      expect((newNode?.data as any)?.content).toBe("New point content");
      expect((newNode?.data as any)?.cred).toBe(3);
    });

    it("should handle objection flags", () => {
      const commands: GraphCommand[] = [
        {
          id: "cmd-1",
          type: "add_point",
          nodeId: "point-objection",
          content: "This is an objection",
          isObjection: true,
          objectionTargetId: 1,
          objectionContextId: 2,
        },
        {
          id: "cmd-2",
          type: "add_edge",
          edgeId: "edge-objection",
          source: "point-1",
          target: "point-objection",
          edgeType: "negation",
        },
      ];

      const { updatedGraph, errors } = applyGraphCommands(baseGraph, commands);

      expect(errors).toHaveLength(0);
      const objectionNode = updatedGraph.nodes.find(n => n.id === "point-objection");
      expect((objectionNode?.data as any)?.isObjection).toBe(true);
      expect((objectionNode?.data as any)?.objectionTargetId).toBe(1);
      expect((objectionNode?.data as any)?.objectionContextId).toBe(2);
    });

    it("should auto-generate unique IDs for duplicates", () => {
      const commands: GraphCommand[] = [
        {
          id: "cmd-1",
          type: "add_point",
          nodeId: "point-1", // Already exists
          content: "Duplicate point",
        },
        {
          id: "cmd-2",
          type: "add_edge",
          edgeId: "edge-dup",
          source: "statement",
          target: "point-1-1", // Auto-generated ID
          edgeType: "statement",
        },
      ];

      const { updatedGraph, errors } = applyGraphCommands(baseGraph, commands);

      expect(errors).toHaveLength(0);
      expect(updatedGraph.nodes).toHaveLength(3); // New node with auto-generated ID
      const newNode = updatedGraph.nodes.find(n => n.id === "point-1-1");
      expect(newNode).toBeDefined();
    });
  });

  describe("update_point command", () => {
    it("should update point content and cred", () => {
      const commands: GraphCommand[] = [
        {
          id: "cmd-1",
          type: "update_point",
          nodeId: "point-1",
          content: "Updated content",
          cred: 10,
        },
      ];

      const { updatedGraph, errors } = applyGraphCommands(baseGraph, commands);

      expect(errors).toHaveLength(0);
      const updatedNode = updatedGraph.nodes.find(n => n.id === "point-1");
      expect((updatedNode?.data as any)?.content).toBe("Updated content");
      expect((updatedNode?.data as any)?.cred).toBe(10);
    });

    it("should handle partial updates", () => {
      const commands: GraphCommand[] = [
        {
          id: "cmd-1",
          type: "update_point",
          nodeId: "point-1",
          content: "Only content updated",
          // cred not specified
        },
      ];

      const { updatedGraph, errors } = applyGraphCommands(baseGraph, commands);

      expect(errors).toHaveLength(0);
      const updatedNode = updatedGraph.nodes.find(n => n.id === "point-1");
      expect((updatedNode?.data as any)?.content).toBe("Only content updated");
      expect((updatedNode?.data as any)?.viewerCred).toBe(5); // Original value preserved
    });

    it("should convert update to add for non-existent node IDs", () => {
      const commands: GraphCommand[] = [
        {
          id: "cmd-1",
          type: "update_point",
          nodeId: "non-existent",
          content: "Updated content",
        },
        {
          id: "cmd-2",
          type: "add_edge",
          edgeId: "edge-new-nonexist",
          source: "statement",
          target: "non-existent",
          edgeType: "statement",
        },
      ];

      const { updatedGraph, errors } = applyGraphCommands(baseGraph, commands);

      expect(errors).toHaveLength(0);
      const newNode = updatedGraph.nodes.find(n => n.id === "non-existent");
      expect(newNode).toBeDefined();
      expect((newNode?.data as any)?.content).toBe("Updated content");
    });
  });

  describe("add_edge command", () => {
    it("should add a new negation edge", () => {
      // First add another point to connect to
      const setupCommands: GraphCommand[] = [
        {
          id: "setup-1",
          type: "add_point",
          nodeId: "point-2",
          content: "Second point",
        },
      ];

      const { updatedGraph: graphWithTwoPoints } = applyGraphCommands(baseGraph, setupCommands);

      const commands: GraphCommand[] = [
        {
          id: "cmd-1",
          type: "add_edge",
          edgeId: "edge-negation-1",
          source: "point-1",
          target: "point-2",
          edgeType: "negation",
        },
      ];

      const { updatedGraph, errors } = applyGraphCommands(graphWithTwoPoints, commands);

      expect(errors).toHaveLength(0);
      expect(updatedGraph.edges).toHaveLength(2);
      
      const newEdge = updatedGraph.edges.find(e => e.id === "edge-negation-1");
      expect(newEdge).toBeDefined();
      expect(newEdge?.type).toBe("negation");
      expect(newEdge?.source).toBe("point-1");
      expect(newEdge?.target).toBe("point-2");
    });

    it("should reject edges with non-existent nodes", () => {
      const commands: GraphCommand[] = [
        {
          id: "cmd-1",
          type: "add_edge",
          edgeId: "edge-invalid",
          source: "non-existent",
          target: "point-1",
          edgeType: "negation",
        },
      ];

      const { updatedGraph, errors } = applyGraphCommands(baseGraph, commands);

      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain("not found");
      expect(updatedGraph.edges).toHaveLength(1); // No change
    });
  });

  describe("delete_point command", () => {
    it("should delete point and connected edges", () => {
      const commands: GraphCommand[] = [
        {
          id: "cmd-1",
          type: "delete_point",
          nodeId: "point-1",
        },
      ];

      const { updatedGraph, errors } = applyGraphCommands(baseGraph, commands);

      expect(errors).toHaveLength(0);
      expect(updatedGraph.nodes).toHaveLength(1); // Only statement remains
      expect(updatedGraph.edges).toHaveLength(0); // Connected edge removed
    });
  });

  describe("update_statement command", () => {
    it("should update statement title", () => {
      const commands: GraphCommand[] = [
        {
          id: "cmd-1",
          type: "update_statement",
          statement: "Updated Topic Title",
        },
      ];

      const { updatedGraph, errors } = applyGraphCommands(baseGraph, commands);

      expect(errors).toHaveLength(0);
      const statementNode = updatedGraph.nodes.find(n => n.type === "statement");
      expect((statementNode?.data as any)?.statement).toBe("Updated Topic Title");
    });
  });

  describe("set_cred command", () => {
    it("should update cred value", () => {
      const commands: GraphCommand[] = [
        {
          id: "cmd-1",
          type: "set_cred",
          nodeId: "point-1",
          cred: 15,
        },
      ];

      const { updatedGraph, errors } = applyGraphCommands(baseGraph, commands);

      expect(errors).toHaveLength(0);
      const pointNode = updatedGraph.nodes.find(n => n.id === "point-1");
      expect((pointNode?.data as any)?.cred).toBe(15);
    });
  });

  describe("objection marking commands", () => {
    it("should mark point as objection", () => {
      const commands: GraphCommand[] = [
        {
          id: "cmd-1",
          type: "mark_objection",
          nodeId: "point-1",
          objectionTargetId: 123,
          objectionContextId: 456,
        },
      ];

      const { updatedGraph, errors } = applyGraphCommands(baseGraph, commands);

      expect(errors).toHaveLength(0);
      const pointNode = updatedGraph.nodes.find(n => n.id === "point-1");
      expect((pointNode?.data as any)?.isObjection).toBe(true);
      expect((pointNode?.data as any)?.objectionTargetId).toBe(123);
      expect((pointNode?.data as any)?.objectionContextId).toBe(456);
    });

    it("should unmark objection", () => {
      // First mark as objection
      const setupCommands: GraphCommand[] = [
        {
          id: "setup-1",
          type: "mark_objection",
          nodeId: "point-1",
          objectionTargetId: 123,
          objectionContextId: 456,
        },
      ];

      const { updatedGraph: graphWithObjection } = applyGraphCommands(baseGraph, setupCommands);

      const commands: GraphCommand[] = [
        {
          id: "cmd-1",
          type: "unmark_objection",
          nodeId: "point-1",
        },
      ];

      const { updatedGraph, errors } = applyGraphCommands(graphWithObjection, commands);

      expect(errors).toHaveLength(0);
      const pointNode = updatedGraph.nodes.find(n => n.id === "point-1");
      expect((pointNode?.data as any)?.isObjection).toBe(false);
      expect((pointNode?.data as any)?.objectionTargetId).toBeUndefined();
      expect((pointNode?.data as any)?.objectionContextId).toBeUndefined();
    });
  });

  describe("multiple commands", () => {
    it("should apply multiple commands in sequence", () => {
      const commands: GraphCommand[] = [
        {
          id: "cmd-1",
          type: "add_point",
          nodeId: "point-2",
          content: "Second point",
          cred: 3,
        },
        {
          id: "cmd-2",
          type: "add_edge",
          edgeId: "edge-2",
          source: "point-1",
          target: "point-2",
          edgeType: "negation",
        },
        {
          id: "cmd-3",
          type: "update_point",
          nodeId: "point-1",
          cred: 8,
        },
      ];

      const { updatedGraph, errors } = applyGraphCommands(baseGraph, commands);

      expect(errors).toHaveLength(0);
      expect(updatedGraph.nodes).toHaveLength(3);
      expect(updatedGraph.edges).toHaveLength(2);
      
      const point1 = updatedGraph.nodes.find(n => n.id === "point-1");
      expect((point1?.data as any)?.cred).toBe(8);
      
      const point2 = updatedGraph.nodes.find(n => n.id === "point-2");
      expect((point2?.data as any)?.content).toBe("Second point");
      
      const newEdge = updatedGraph.edges.find(e => e.id === "edge-2");
      expect(newEdge?.type).toBe("negation");
    });

    it("should continue processing after auto-generating IDs", () => {
      const commands: GraphCommand[] = [
        {
          id: "cmd-1",
          type: "add_point",
          nodeId: "point-1", // Duplicate - will auto-generate ID
          content: "Duplicate point",
        },
        {
          id: "cmd-2",
          type: "add_edge",
          edgeId: "edge-dup-test",
          source: "statement",
          target: "point-1-1", // Auto-generated ID
          edgeType: "statement",
        },
        {
          id: "cmd-3",
          type: "update_point",
          nodeId: "point-1",
          cred: 10, // Should succeed
        },
      ];

      const { updatedGraph, errors } = applyGraphCommands(baseGraph, commands);

      expect(errors).toHaveLength(0);
      
      // Second command should still execute
      const point1 = updatedGraph.nodes.find(n => n.id === "point-1");
      expect((point1?.data as any)?.cred).toBe(10);
    });
  });

  describe("unknown command types", () => {
    it("should handle unknown command types gracefully", () => {
      const commands: any[] = [
        {
          id: "cmd-1",
          type: "unknown_command",
        },
      ];

      const { updatedGraph, errors } = applyGraphCommands(baseGraph, commands);

      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain("Unknown command type");
      expect(updatedGraph).toEqual(baseGraph); // No changes
    });
  });
});