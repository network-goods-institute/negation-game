// Mock Next.js Web API globals before any imports
global.Request = jest.fn().mockImplementation((input, init) => ({
  json: jest.fn().mockResolvedValue({}),
  text: jest.fn().mockResolvedValue(""),
  formData: jest.fn().mockResolvedValue(new FormData()),
  url: input,
  method: init?.method || "GET",
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
  fetchUserAssignments: jest.fn(),
}));

jest.mock("@/actions/users/getUserId", () => ({
  getUserId: jest.fn(),
}));

import { GET } from "../route";
import { fetchUserAssignments } from "@/actions/topics/manageRationaleAssignments";
import { getUserId } from "@/actions/users/getUserId";

const mockFetchUserAssignments = fetchUserAssignments as jest.Mock;
const mockGetUserId = getUserId as jest.Mock;

describe("/api/user/assignments", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET", () => {
    it("should return user assignments when authenticated", async () => {
      mockGetUserId.mockResolvedValue("user-123");

      const mockAssignments = [
        {
          id: "assignment-1",
          topicId: 1,
          topicName: "Test Topic",
          spaceId: "test-space",
          promptMessage: "Test prompt",
          completed: false,
          createdAt: "2024-01-01T00:00:00Z",
        },
      ];

      mockFetchUserAssignments.mockResolvedValue(mockAssignments);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockAssignments);
      expect(mockFetchUserAssignments).toHaveBeenCalledWith("user-123");
    });

    it("should return 401 when user is not authenticated", async () => {
      mockGetUserId.mockResolvedValue(null);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 500 when database error occurs", async () => {
      mockGetUserId.mockResolvedValue("user-123");
      mockFetchUserAssignments.mockRejectedValue(new Error("Database error"));

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Database error");
    });
  });
});
