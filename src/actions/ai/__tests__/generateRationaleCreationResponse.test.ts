import { ViewpointGraph } from "@/atoms/viewpointAtoms";
import { GraphCommand } from "@/types/graphCommands";

function testExtractTextAndCommands(
  fullResponse: string,
  fallbackGraph: ViewpointGraph
): {
  textContent: string;
  suggestedGraph: ViewpointGraph;
  commands?: GraphCommand[];
} {
  try {
    const jsonMatch = fullResponse.match(/```json\s*([\s\S]*?)\s*```/);

    if (!jsonMatch) {
      return {
        textContent: fullResponse,
        suggestedGraph: fallbackGraph,
      };
    }

    const textContent = fullResponse
      .substring(0, fullResponse.indexOf("```json"))
      .trim();
    const jsonContent = jsonMatch[1].trim();

    try {
      const parsedContent = JSON.parse(jsonContent);

      if (Array.isArray(parsedContent)) {
        const commands = parsedContent as GraphCommand[];

        for (const cmd of commands) {
          if (!cmd.id || !cmd.type) {
            throw new Error("Command missing required id or type field");
          }
        }

        return {
          textContent,
          suggestedGraph: fallbackGraph,
          commands: commands,
        };
      } else {
        // Legacy graph format
        return {
          textContent,
          suggestedGraph: parsedContent as ViewpointGraph,
        };
      }
    } catch (e) {
      return {
        textContent,
        suggestedGraph: fallbackGraph,
      };
    }
  } catch (error) {
    return {
      textContent: fullResponse,
      suggestedGraph: fallbackGraph,
    };
  }
}

describe("generateRationaleCreationResponse parsing", () => {
  let fallbackGraph: ViewpointGraph;

  beforeEach(() => {
    fallbackGraph = {
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
      ],
      edges: [],
    };
  });

  describe("command parsing", () => {
    it("should parse command-based responses", () => {
      const aiResponse = `Okay. I've done that for you. You should see the updated graph now.

That's a great counterargument. What do you think about exploring potential objections to this new point?

\`\`\`json
[
  {
    "id": "cmd-1",
    "type": "add_point",
    "nodeId": "point-new-1",
    "content": "TypeScript has better tooling support",
    "cred": 5
  },
  {
    "id": "cmd-2",
    "type": "add_edge",
    "edgeId": "edge-new-1",
    "source": "point-flexibility",
    "target": "point-new-1",
    "edgeType": "negation"
  }
]
\`\`\``;

      const result = testExtractTextAndCommands(aiResponse, fallbackGraph);

      expect(result.commands).toBeDefined();
      expect(result.commands).toHaveLength(2);

      const addPointCommand = result.commands![0];
      expect(addPointCommand.type).toBe("add_point");
      expect(addPointCommand.id).toBe("cmd-1");
      expect((addPointCommand as any).nodeId).toBe("point-new-1");
      expect((addPointCommand as any).content).toBe(
        "TypeScript has better tooling support"
      );
      expect((addPointCommand as any).cred).toBe(5);

      const addEdgeCommand = result.commands![1];
      expect(addEdgeCommand.type).toBe("add_edge");
      expect(addEdgeCommand.id).toBe("cmd-2");
      expect((addEdgeCommand as any).edgeId).toBe("edge-new-1");
      expect((addEdgeCommand as any).source).toBe("point-flexibility");
      expect((addEdgeCommand as any).target).toBe("point-new-1");
      expect((addEdgeCommand as any).edgeType).toBe("negation");

      expect(result.textContent).toContain("Okay. I've done that for you");
      expect(result.textContent).toContain("What do you think about exploring");
      expect(result.textContent).not.toContain("```json");
    });

    it("should handle responses without JSON blocks", () => {
      const aiResponse =
        "That's an interesting point. Have you considered how it might relate to the main argument? We could potentially add a counterargument - would you like me to do that?";

      const result = testExtractTextAndCommands(aiResponse, fallbackGraph);

      expect(result.commands).toBeUndefined();
      expect(result.textContent).toBe(aiResponse);
      expect(result.suggestedGraph).toBe(fallbackGraph);
    });

    it("should handle legacy complete graph responses", () => {
      const aiResponse = `I've updated the graph with your suggestion.

\`\`\`json
{
  "nodes": [
    {
      "id": "statement",
      "type": "statement", 
      "data": { "statement": "Updated Topic" }
    }
  ],
  "edges": []
}
\`\`\``;

      const result = testExtractTextAndCommands(aiResponse, fallbackGraph);

      expect(result.commands).toBeUndefined();
      expect(result.suggestedGraph).toBeDefined();
      expect(result.suggestedGraph.nodes).toHaveLength(1);
      expect((result.suggestedGraph.nodes[0].data as any).statement).toBe(
        "Updated Topic"
      );
      expect(result.textContent).toBe(
        "I've updated the graph with your suggestion."
      );
    });

    it("should handle malformed JSON gracefully", () => {
      const aiResponse = `Here's the update:

\`\`\`json
{
  "invalid": "json",
  "missing": comma
}
\`\`\``;

      const result = testExtractTextAndCommands(aiResponse, fallbackGraph);

      expect(result.commands).toBeUndefined();
      expect(result.suggestedGraph).toBe(fallbackGraph);
      expect(result.textContent).toBe("Here's the update:");
    });

    it("should validate command structure", () => {
      const aiResponse = `Here are the commands:

\`\`\`json
[
  {
    "type": "add_point",
    "nodeId": "point-1"
  }
]
\`\`\``;

      const result = testExtractTextAndCommands(aiResponse, fallbackGraph);

      // Should fail validation due to missing 'id' field
      expect(result.commands).toBeUndefined();
      expect(result.suggestedGraph).toBe(fallbackGraph);
    });

    it("should handle empty command arrays", () => {
      const aiResponse = `No changes needed.

\`\`\`json
[]
\`\`\``;

      const result = testExtractTextAndCommands(aiResponse, fallbackGraph);

      expect(result.commands).toBeDefined();
      expect(result.commands).toHaveLength(0);
      expect(result.textContent).toBe("No changes needed.");
    });

    it("should handle multiple command types", () => {
      const aiResponse = `I'll make several updates:

\`\`\`json
[
  {
    "id": "cmd-1",
    "type": "add_point",
    "nodeId": "point-new",
    "content": "New argument"
  },
  {
    "id": "cmd-2", 
    "type": "set_cred",
    "nodeId": "point-1",
    "cred": 10
  },
  {
    "id": "cmd-3",
    "type": "update_statement",
    "statement": "Updated topic"
  },
  {
    "id": "cmd-4",
    "type": "mark_objection",
    "nodeId": "point-2",
    "objectionTargetId": 123,
    "objectionContextId": 456
  }
]
\`\`\``;

      const result = testExtractTextAndCommands(aiResponse, fallbackGraph);

      expect(result.commands).toHaveLength(4);

      const types = result.commands!.map((cmd) => cmd.type);
      expect(types).toEqual([
        "add_point",
        "set_cred",
        "update_statement",
        "mark_objection",
      ]);

      // Check specific command properties
      const objectionCmd = result.commands!.find(
        (cmd) => cmd.type === "mark_objection"
      ) as any;
      expect(objectionCmd.objectionTargetId).toBe(123);
      expect(objectionCmd.objectionContextId).toBe(456);
    });
  });

  describe("text extraction", () => {
    it("should extract text before JSON block", () => {
      const aiResponse = `Here's my analysis of the situation.

This is a multi-line response with various thoughts and explanations.

\`\`\`json
[{"id": "cmd-1", "type": "add_point", "nodeId": "test"}]
\`\`\``;

      const result = testExtractTextAndCommands(aiResponse, fallbackGraph);

      expect(result.textContent).toBe(`Here's my analysis of the situation.

This is a multi-line response with various thoughts and explanations.`);
      expect(result.textContent).not.toContain("```json");
    });

    it("should handle responses with no text before JSON", () => {
      const aiResponse = `\`\`\`json
[{"id": "cmd-1", "type": "add_point", "nodeId": "test", "content": "test"}]
\`\`\``;

      const result = testExtractTextAndCommands(aiResponse, fallbackGraph);

      expect(result.textContent).toBe("");
      expect(result.commands).toHaveLength(1);
    });
  });
});
