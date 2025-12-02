import { uploadAvatar } from "../uploadAvatar";
import { getUserId } from "../getUserId";
import { db } from "@/services/db";
import { usersTable } from "@/db/schema";
import { checkRateLimit } from "@/lib/rateLimit";

jest.mock("../getUserId");
jest.mock("@/services/db");
jest.mock("@/lib/rateLimit");

const mockGetUserId = getUserId as jest.MockedFunction<typeof getUserId>;
const mockCheckRateLimit = checkRateLimit as jest.MockedFunction<
  typeof checkRateLimit
>;
const mockDb = db as jest.Mocked<typeof db>;

describe("uploadAvatar", () => {
  const originalEnv = { ...process.env };
  const mockFetch = jest.fn();

  beforeAll(() => {
    (global as unknown as { fetch: typeof fetch }).fetch = mockFetch as any;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-key";
    process.env.SUPABASE_CDN_URL = "";
    mockGetUserId.mockResolvedValue("user-123");
    mockCheckRateLimit.mockResolvedValue({
      allowed: true,
      remaining: 0,
      resetTime: Date.now() + 60_000,
    });

    mockDb.select.mockReturnValue({
      from: () => ({
        where: () => ({
          limit: () => [{ avatarUrl: null }],
        }),
      }),
    } as any);

    mockDb.update.mockReturnValue({
      set: () => ({
        where: () => Promise.resolve(),
      }),
    } as any);
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  const createPngFile = () => {
    const header = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      // minimal IHDR chunk start to avoid very short buffers
      0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
    ]);
    const file = new File([header], "avatar.png", { type: "image/png" });
    (file as any).arrayBuffer = async () => header.buffer;
    return file;
  };

  it("rejects when user is unauthorized", async () => {
    mockGetUserId.mockResolvedValueOnce(null as any);

    const result = await uploadAvatar(new FormData());

    expect(result.success).toBe(false);
    expect(result.error).toBe("Unauthorized");
  });

  it("rejects when rate limit is exceeded", async () => {
    mockCheckRateLimit.mockResolvedValueOnce({
      allowed: false,
      remaining: 0,
      resetTime: Date.now() + 5000,
    });

    const form = new FormData();
    form.append("avatar", createPngFile());
    const result = await uploadAvatar(form);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Too many avatar uploads/);
  });

  it("rejects when file content does not match declared type", async () => {
    const invalidBytes = new Uint8Array([0, 1, 2, 3, 4]);
    const file = new File([invalidBytes], "avatar.png", { type: "image/png" });
    (file as any).arrayBuffer = async () => invalidBytes.buffer;
    const form = new FormData();
    form.append("avatar", file);

    const result = await uploadAvatar(form);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Invalid or unsupported image data/);
  });

  it("uploads, updates DB, and deletes previous avatar", async () => {
    const existingUrl =
      "https://example.supabase.co/storage/v1/object/public/profile-pictures/user-123/old.png";
    mockDb.select.mockReturnValue({
      from: () => ({
        where: () => ({
          limit: () => [{ avatarUrl: existingUrl }],
        }),
      }),
    } as any);

    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => "",
      statusText: "OK",
      status: 200,
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: "OK",
      text: async () => "",
    });

    const form = new FormData();
    form.append("avatar", createPngFile());

    const result = await uploadAvatar(form);

    expect(result.success).toBe(true);
    expect(result.avatarUrl).toContain("/profile-pictures/user-123/");
    expect(mockDb.update).toHaveBeenCalledWith(usersTable);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/storage/v1/object/profile-pictures/user-123/"),
      expect.objectContaining({ method: "PUT" })
    );
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/storage/v1/object/profile-pictures/user-123/old.png"),
      expect.objectContaining({ method: "DELETE" })
    );
  });

  it("fails when Supabase env is missing", async () => {
    process.env.SUPABASE_URL = "";
    const form = new FormData();
    form.append("avatar", createPngFile());

    const result = await uploadAvatar(form);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Avatar storage not configured/);
  });
});
