// Mock Next.js Web API globals before any imports
global.Request = jest.fn().mockImplementation((input, init) => ({
  json: jest.fn().mockResolvedValue({}),
  text: jest.fn().mockResolvedValue(""),
  formData: jest.fn().mockResolvedValue(new FormData()),
  url: input,
  method: init?.method || "POST",
  headers: new Headers(init?.headers),
}));

(global as any).Response = jest.fn().mockImplementation((body, init) => ({
  json: jest.fn().mockResolvedValue(body ? JSON.parse(body) : {}),
  text: jest.fn().mockResolvedValue(body || ""),
  status: init?.status || 200,
  statusText: init?.statusText || "OK",
  headers: new Headers(init?.headers),
}));

global.Headers = jest.fn().mockImplementation((init) => {
  const headers = new Map();
  if (init) {
    Object.entries(init).forEach(([key, value]) => {
      headers.set(key.toLowerCase(), value);
    });
  }
  return {
    get: (name: string) => headers.get(name.toLowerCase()),
    set: (name: string, value: string) =>
      headers.set(name.toLowerCase(), value),
    has: (name: string) => headers.has(name.toLowerCase()),
    // eslint-disable-next-line drizzle/enforce-delete-with-where
    delete: (name: string) => headers.delete(name.toLowerCase()),
    entries: () => headers.entries(),
    keys: () => headers.keys(),
    values: () => headers.values(),
  };
});

// Mock NextResponse
jest.mock("next/server", () => ({
  NextResponse: {
    json: jest.fn((data, init) => ({
      json: () => Promise.resolve(data),
      status: init?.status || 200,
    })),
  },
}));

jest.mock("@/actions/topics/manageRationaleAssignments", () => ({
  markAssignmentCompleted: jest.fn(),
}));

import { POST } from "../route";
import { markAssignmentCompleted } from "@/actions/topics/manageRationaleAssignments";

const mockMarkAssignmentCompleted = markAssignmentCompleted as jest.Mock;

describe("/api/assignments/[assignmentId]/complete", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST", () => {
    it("should mark assignment as completed", async () => {
      const mockAssignment = {
        id: "assignment-123",
        completed: true,
        completedAt: new Date(),
      };

      mockMarkAssignmentCompleted.mockResolvedValue(mockAssignment);

      const request = new Request("http://localhost");
      const params = Promise.resolve({ assignmentId: "assignment-123" });

      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockAssignment);
      expect(mockMarkAssignmentCompleted).toHaveBeenCalledWith(
        "assignment-123"
      );
    });

    it("should return 404 when assignment not found", async () => {
      mockMarkAssignmentCompleted.mockResolvedValue(null);

      const request = new Request("http://localhost");
      const params = Promise.resolve({ assignmentId: "nonexistent" });

      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Assignment not found or not authorized");
    });

    it("should return 500 when error occurs", async () => {
      mockMarkAssignmentCompleted.mockRejectedValue(
        new Error("Database error")
      );

      const request = new Request("http://localhost");
      const params = Promise.resolve({ assignmentId: "assignment-123" });

      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Database error");
    });
  });
});
