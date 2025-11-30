import { getUserId } from "@/actions/users/getUserId";
import { cookies, headers } from "next/headers";

jest.mock("@/lib/privy/getPrivyClient", () => ({
  getPrivyClient: async () => ({
    verifyAuthToken: jest.fn(async (token: string) => {
      if (token === "freshToken") {
        return { userId: "user-123" };
      }
      throw Object.assign(new Error("invalid"), { name: "InvalidTokenError" });
    }),
  }),
}));

jest.mock("next/headers", () => ({
  cookies: jest.fn(),
  headers: jest.fn(),
}));

describe("getUserId header-based refresh", () => {
  const setMock = jest.fn();
  const getMock = jest.fn();

  beforeEach(() => {
    setMock.mockReset();
    getMock.mockReset();
    (cookies as jest.Mock).mockResolvedValue({
      get: getMock,
      set: setMock,
    });
    (headers as jest.Mock).mockResolvedValue(
      new Map([["authorization", "Bearer freshToken"]])
    );
  });

  it("returns userId and sets cookie when cookie missing but Authorization has a fresh token", async () => {
    getMock.mockReturnValue(undefined);
    const userId = await getUserId();
    expect(userId).toBe("user-123");
    expect(setMock).toHaveBeenCalled();
    const [name, value] = setMock.mock.calls[0];
    expect(name).toBe("privy-token");
    expect(value).toBe("freshToken");
  });
});

