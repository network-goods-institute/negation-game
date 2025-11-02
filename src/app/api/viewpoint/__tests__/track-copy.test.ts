// Mock NextRequest and NextResponse
jest.mock("next/server", () => ({
  NextRequest: jest.fn().mockImplementation((url) => ({
    url,
    nextUrl: new URL(url),
  })),
  NextResponse: {
    json: jest.fn((data, options) => ({
      status: options?.status || 200,
      json: async () => data,
    })),
  },
}));

// Mock trackViewpointCopy action
jest.mock("@/actions/viewpoints/trackViewpointCopy", () => ({
  trackViewpointCopy: jest.fn(),
}));

// Mock logger
jest.mock("@/lib/logger", () => ({
  logger: {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

// Import modules after mocking
import { POST } from "../track-copy/route";
import { trackViewpointCopy } from "@/actions/viewpoints/trackViewpointCopy";
import { NextRequest } from "next/server";import { logger } from "@/lib/logger";

describe("/api/viewpoint/track-copy", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return 400 if viewpoint ID is missing", async () => {
    // Create a mock request without an ID
    const req = new NextRequest("https://example.com/api/viewpoint/track-copy");

    // Call the route handler
    const response = await POST(req);

    // Verify the response
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data).toEqual({ error: "Missing viewpoint ID" });

    // trackViewpointCopy should not be called
    expect(trackViewpointCopy).not.toHaveBeenCalled();
  });

  it("should track a copy for a valid viewpoint ID", async () => {
    // Mock trackViewpointCopy to return success
    (trackViewpointCopy as jest.Mock).mockResolvedValue(true);

    // Create a mock request with a valid ID
    const req = new NextRequest(
      "https://example.com/api/viewpoint/track-copy?id=test-id"
    );

    // Call the route handler
    const response = await POST(req);

    // Verify the response
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual({ success: true });

    // trackViewpointCopy should be called with the ID
    expect(trackViewpointCopy).toHaveBeenCalledWith("test-id");
  });

  it("should handle errors in the tracking action", async () => {
    // Mock trackViewpointCopy to throw an error
    (trackViewpointCopy as jest.Mock).mockRejectedValue(
      new Error("Failed to track copy")
    );

    // Mock logger.error to prevent test output pollution
    jest.spyOn(console, "error").mockImplementation(() => {});

    // Create a mock request with a valid ID
    const req = new NextRequest(
      "https://example.com/api/viewpoint/track-copy?id=test-id"
    );

    // Call the route handler
    const response = await POST(req);

    // Verify the response
    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data).toEqual({ error: "Failed to track viewpoint copy" });

    // trackViewpointCopy should be called, but logger.error should log the error
    expect(trackViewpointCopy).toHaveBeenCalledWith("test-id");
    expect(logger.error).toHaveBeenCalled();
  });
});
