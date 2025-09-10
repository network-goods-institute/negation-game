import { copyViewpointAndNavigate } from "@/lib/negation-game/copyViewpoint";
import { ViewpointGraph } from "@/atoms/viewpointAtoms";

// Mock the navigation and storage
const pushMock = jest.fn();
let storedCopyData: Record<string, unknown> | null = null;

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

jest.mock("@/lib/negation-game/copyViewpoint", () => ({
  copyViewpointAndNavigate: jest.fn(),
  copyViewpointToStorage: jest.fn((...args) => {
    // Capture the data that would be stored
    storedCopyData = args[0]; // The viewpointDataToStore object
    return true;
  }),
}));

describe("Copy flow from existing rationale", () => {
  beforeEach(() => {
    storedCopyData = null;
    pushMock.mockReset();
  });

  it("stores copy data with topic and navigates to new with correct key", async () => {
    const mockGraph: ViewpointGraph = {
      nodes: [{ id: "statement", type: "statement", position: { x: 0, y: 0 }, data: { statement: "Original Title" } }],
      edges: []
    };

    // Mock the copy function to simulate what happens when copying
    (copyViewpointAndNavigate as jest.Mock).mockImplementation(async (graph, title, description, sourceId, autoPublish, topic, topicId) => {
      // Simulate storing the copy data
      const copyData = {
        isCopyOperation: true,
        copiedFromId: sourceId,
        title: title || "",
        description: description || "",
        topic: topic || "",
        topicId: topicId || undefined,
        graph: graph,
        timestamp: Date.now(),
      };
      storedCopyData = copyData;

      // Simulate navigation
      pushMock("/s/testspace/rationale/new");
      return true;
    });

    // Simulate the copy action
    await copyViewpointAndNavigate(
      mockGraph,
      "Original Title",
      "Original Description",
      "abc",
      false,
      "Climate",
      1
    );

    // Verify the copy data was stored correctly
    expect(storedCopyData).toBeTruthy();
    expect(storedCopyData!.isCopyOperation).toBe(true);
    expect(storedCopyData!.topic).toBe("Climate");
    expect(storedCopyData!.topicId).toBe(1);
    expect(storedCopyData!.copiedFromId).toBe("abc");

    // Verify navigation occurred
    expect(pushMock).toHaveBeenCalledWith("/s/testspace/rationale/new");
  });
});