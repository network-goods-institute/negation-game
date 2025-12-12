import {
  isVercelPreviewDomain,
  setPrivyCookie,
  clearPrivyCookie,
} from "../auth";
import { cookies, headers } from "next/headers";

jest.mock("next/headers", () => ({
  cookies: jest.fn(),
  headers: jest.fn(),
}));

jest.mock("@/lib/privy/getPrivyClient", () => ({
  getPrivyClient: jest.fn(),
}));

describe("auth", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("isVercelPreviewDomain", () => {
    let mockHeaders: any;

    beforeEach(() => {
      mockHeaders = {
        get: jest.fn(),
      };
      (headers as jest.Mock).mockResolvedValue(mockHeaders);
    });

    it("returns true for vercel.app domains", async () => {
      mockHeaders.get.mockReturnValue("my-app-abc123.vercel.app");
      expect(await isVercelPreviewDomain()).toBe(true);
    });

    it("returns true for nested vercel.app subdomains", async () => {
      mockHeaders.get.mockReturnValue("preview-branch-abc123.vercel.app");
      expect(await isVercelPreviewDomain()).toBe(true);
    });

    it("returns true for vercel.app domains with port", async () => {
      mockHeaders.get.mockReturnValue("preview-branch-abc123.vercel.app:443");
      expect(await isVercelPreviewDomain()).toBe(true);
    });

    it("returns true for uppercase vercel.app hosts", async () => {
      mockHeaders.get.mockReturnValue("PREVIEW-BRANCH-ABC123.VERCEL.APP");
      expect(await isVercelPreviewDomain()).toBe(true);
    });

    it("returns false for production domain", async () => {
      mockHeaders.get.mockReturnValue("negationgame.com");
      expect(await isVercelPreviewDomain()).toBe(false);
    });

    it("returns false for localhost", async () => {
      mockHeaders.get.mockReturnValue("localhost:3000");
      expect(await isVercelPreviewDomain()).toBe(false);
    });

    it("returns false when host is null", async () => {
      mockHeaders.get.mockReturnValue(null);
      expect(await isVercelPreviewDomain()).toBe(false);
    });

    it("returns false when host is undefined", async () => {
      mockHeaders.get.mockReturnValue(undefined);
      expect(await isVercelPreviewDomain()).toBe(false);
    });

    it("returns false for domains containing but not ending with vercel.app", async () => {
      mockHeaders.get.mockReturnValue("vercel.app.evil.com");
      expect(await isVercelPreviewDomain()).toBe(false);
    });

    it("returns false for invalid vercel.app label characters", async () => {
      mockHeaders.get.mockReturnValue("my_app.vercel.app");
      expect(await isVercelPreviewDomain()).toBe(false);
    });

    it("returns false for domains with vercel.app in path", async () => {
      mockHeaders.get.mockReturnValue("evil.com/vercel.app");
      expect(await isVercelPreviewDomain()).toBe(false);
    });

    it("returns false for empty string", async () => {
      mockHeaders.get.mockReturnValue("");
      expect(await isVercelPreviewDomain()).toBe(false);
    });
  });

  describe("setPrivyCookie", () => {
    let mockCookieStore: any;
    let mockHeaders: any;

    beforeEach(() => {
      mockCookieStore = {
        set: jest.fn(),
        delete: jest.fn(),
      };
      mockHeaders = {
        get: jest.fn(),
      };
      (cookies as jest.Mock).mockResolvedValue(mockCookieStore);
      (headers as jest.Mock).mockResolvedValue(mockHeaders);
    });

    it("sets cookie with strict sameSite for production domain", async () => {
      mockHeaders.get.mockReturnValue("negationgame.com");
      process.env = { ...originalEnv, NODE_ENV: "production" };

      await setPrivyCookie("test-token");

      expect(mockCookieStore.set).toHaveBeenCalledWith(
        "privy-token",
        "test-token",
        {
          httpOnly: true,
          secure: true,
          sameSite: "strict",
          path: "/",
          maxAge: 24 * 60 * 60,
        }
      );
    });

    it("sets cookie with lax sameSite for vercel.app preview domain", async () => {
      mockHeaders.get.mockReturnValue("my-app-abc123.vercel.app");
      process.env = { ...originalEnv, NODE_ENV: "production" };

      await setPrivyCookie("test-token");

      expect(mockCookieStore.set).toHaveBeenCalledWith(
        "privy-token",
        "test-token",
        {
          httpOnly: true,
          secure: true,
          sameSite: "lax",
          path: "/",
          maxAge: 24 * 60 * 60,
        }
      );
    });

    it("sets cookie with strict sameSite for localhost", async () => {
      mockHeaders.get.mockReturnValue("localhost:3000");
      process.env = { ...originalEnv, NODE_ENV: "development" };

      await setPrivyCookie("test-token");

      expect(mockCookieStore.set).toHaveBeenCalledWith(
        "privy-token",
        "test-token",
        {
          httpOnly: true,
          secure: false,
          sameSite: "strict",
          path: "/",
          maxAge: 24 * 60 * 60,
        }
      );
    });

    it("sets cookie with secure false in development NODE_ENV", async () => {
      mockHeaders.get.mockReturnValue("negationgame.com");
      process.env = { ...originalEnv, NODE_ENV: "development" };

      await setPrivyCookie("test-token");

      expect(mockCookieStore.set).toHaveBeenCalledWith(
        "privy-token",
        "test-token",
        {
          httpOnly: true,
          secure: false,
          sameSite: "strict",
          path: "/",
          maxAge: 24 * 60 * 60,
        }
      );
    });

    it("always sets httpOnly to true", async () => {
      await setPrivyCookie("test-token");

      const callArgs = mockCookieStore.set.mock.calls[0][2];
      expect(callArgs.httpOnly).toBe(true);
    });

    it("always sets path to /", async () => {
      await setPrivyCookie("test-token");

      const callArgs = mockCookieStore.set.mock.calls[0][2];
      expect(callArgs.path).toBe("/");
    });

    it("sets maxAge to 24 hours", async () => {
      await setPrivyCookie("test-token");

      const callArgs = mockCookieStore.set.mock.calls[0][2];
      expect(callArgs.maxAge).toBe(86400);
    });

    it("handles empty token string", async () => {
      await setPrivyCookie("");

      expect(mockCookieStore.set).toHaveBeenCalledWith(
        "privy-token",
        "",
        expect.any(Object)
      );
    });
  });

  describe("clearPrivyCookie", () => {
    let mockCookieStore: any;

    beforeEach(() => {
      mockCookieStore = {
        set: jest.fn(),
        delete: jest.fn(),
      };
      (cookies as jest.Mock).mockResolvedValue(mockCookieStore);
    });

    it("deletes the privy-token cookie", async () => {
      await clearPrivyCookie();
      // eslint-disable-next-line drizzle/enforce-delete-with-where
      expect(mockCookieStore.delete).toHaveBeenCalledWith("privy-token");
    });

    it("calls delete exactly once", async () => {
      await clearPrivyCookie();

      // eslint-disable-next-line drizzle/enforce-delete-with-where
      expect(mockCookieStore.delete).toHaveBeenCalledTimes(1);
    });
  });

  describe("sameSite security", () => {
    let mockCookieStore: any;
    let mockHeaders: any;

    beforeEach(() => {
      mockCookieStore = {
        set: jest.fn(),
      };
      mockHeaders = {
        get: jest.fn(),
      };
      (cookies as jest.Mock).mockResolvedValue(mockCookieStore);
      (headers as jest.Mock).mockResolvedValue(mockHeaders);
    });

    it("never uses sameSite none", async () => {
      mockHeaders.get.mockReturnValue("preview.vercel.app");
      await setPrivyCookie("test-token");

      const callArgs = mockCookieStore.set.mock.calls[0][2];
      expect(callArgs.sameSite).not.toBe("none");
    });

    it("uses strict sameSite by default for non-vercel domains", async () => {
      mockHeaders.get.mockReturnValue("negationgame.com");
      await setPrivyCookie("test-token");

      const callArgs = mockCookieStore.set.mock.calls[0][2];
      expect(callArgs.sameSite).toBe("strict");
    });

    it("preview vercel.app domain uses lax not strict", async () => {
      mockHeaders.get.mockReturnValue("preview.vercel.app");
      await setPrivyCookie("test-token");

      const callArgs = mockCookieStore.set.mock.calls[0][2];
      expect(callArgs.sameSite).toBe("lax");
      expect(callArgs.sameSite).not.toBe("strict");
    });
  });
});
