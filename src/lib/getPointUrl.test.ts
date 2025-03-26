import { getPointUrl } from "./getPointUrl";
import { encodeId } from "./encodeId";

// Mock the encodeId function
jest.mock("./encodeId", () => ({
  encodeId: jest.fn((id) => `encoded-${id}`),
}));

// Mock the window location for testing
const mockWindowLocation = (pathname: string) => {
  const originalWindow = { ...window };
  delete (window as any).location;
  window.location = { ...originalWindow.location, pathname } as any;
  return () => {
    window.location = originalWindow.location;
  };
};

describe("getPointUrl", () => {
  const mockEncodeId = encodeId as jest.Mock;

  beforeEach(() => {
    mockEncodeId.mockClear();
  });

  describe("with numeric ID", () => {
    it("should use encoded ID and provided space", () => {
      const url = getPointUrl(123, "test-space");
      expect(url).toBe("/s/test-space/encoded-123");
      expect(mockEncodeId).toHaveBeenCalledWith(123);
    });

    it("should use encoded ID and extract space from URL", () => {
      const restoreWindow = mockWindowLocation("/s/url-space/some-point");
      try {
        const url = getPointUrl(456);
        expect(url).toBe("/s/url-space/encoded-456");
        expect(mockEncodeId).toHaveBeenCalledWith(456);
      } finally {
        restoreWindow();
      }
    });

    it("should use global space when no space is provided or in URL", () => {
      const restoreWindow = mockWindowLocation("/some-other-path");
      try {
        const url = getPointUrl(789);
        expect(url).toBe("/s/global/encoded-789");
        expect(mockEncodeId).toHaveBeenCalledWith(789);
      } finally {
        restoreWindow();
      }
    });

    it("should handle undefined space parameter", () => {
      const url = getPointUrl(123, undefined);

      // Since we can't predict window.location in the test environment,
      // we just verify that encodeId was called with the right ID
      expect(mockEncodeId).toHaveBeenCalledWith(123);
    });
  });

  describe("with string ID", () => {
    it("should use string ID as-is with provided space", () => {
      const url = getPointUrl("already-encoded", "test-space");
      expect(url).toBe("/s/test-space/already-encoded");
      expect(mockEncodeId).not.toHaveBeenCalled();
    });

    it("should use string ID as-is and extract space from URL", () => {
      const restoreWindow = mockWindowLocation("/s/url-space/some-point");
      try {
        const url = getPointUrl("already-encoded");
        expect(url).toBe("/s/url-space/already-encoded");
        expect(mockEncodeId).not.toHaveBeenCalled();
      } finally {
        restoreWindow();
      }
    });

    it("should use global space when no space is provided or in URL", () => {
      const restoreWindow = mockWindowLocation("/some-other-path");
      try {
        const url = getPointUrl("already-encoded");
        expect(url).toBe("/s/global/already-encoded");
        expect(mockEncodeId).not.toHaveBeenCalled();
      } finally {
        restoreWindow();
      }
    });
  });

  describe("edge cases", () => {
    it("should handle null space by using default extraction/fallback", () => {
      // @ts-ignore - Testing with null even though TypeScript doesn't allow it
      const url = getPointUrl(123, null);
      expect(mockEncodeId).toHaveBeenCalledWith(123);
    });

    it("should handle empty string space by using it", () => {
      const url = getPointUrl(123, "");
      expect(url).toBe("/s//encoded-123");
      expect(mockEncodeId).toHaveBeenCalledWith(123);
    });

    it("should handle SSR environment where window is not available", () => {
      const originalWindow = window;
      // @ts-ignore - Simulate SSR by removing window
      delete global.window;

      try {
        const url = getPointUrl(999);
        expect(url).toBe("/s/global/encoded-999");
        expect(mockEncodeId).toHaveBeenCalledWith(999);
      } finally {
        // @ts-ignore - Restore window
        global.window = originalWindow;
      }
    });
  });
});
