import { setPrivyToken, __resetSetPrivyTokenStateForTests } from "@/lib/privy/setPrivyToken";

jest.mock("@privy-io/react-auth", () => ({
  getAccessToken: jest.fn(),
}));

jest.mock("@/actions/users/auth", () => ({
  setPrivyCookie: jest.fn(),
}));

const { getAccessToken } = jest.requireMock("@privy-io/react-auth");
const { setPrivyCookie } = jest.requireMock("@/actions/users/auth");

const getAccessTokenMock = getAccessToken as jest.Mock;
const setPrivyCookieMock = setPrivyCookie as jest.Mock;

describe("setPrivyToken", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __resetSetPrivyTokenStateForTests();
  });

  it("stores the token when immediately available", async () => {
    getAccessTokenMock.mockResolvedValueOnce("token-123");

    const result = await setPrivyToken({ retryDelayMs: 0 });

    expect(result).toBe(true);
    expect(getAccessTokenMock).toHaveBeenCalledTimes(1);
    expect(setPrivyCookieMock).toHaveBeenCalledWith("token-123");
  });

  it("retries until a token is returned", async () => {
    getAccessTokenMock
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce("final-token");

    const result = await setPrivyToken({ maxAttempts: 5, retryDelayMs: 0, force: true });

    expect(result).toBe(true);
    expect(getAccessTokenMock).toHaveBeenCalledTimes(3);
    expect(setPrivyCookieMock).toHaveBeenCalledWith("final-token");
  });

  it("returns false if no token is available after retries", async () => {
    getAccessTokenMock.mockResolvedValue(null);

    const result = await setPrivyToken({ maxAttempts: 2, retryDelayMs: 0, force: true });

    expect(result).toBe(false);
    expect(getAccessTokenMock).toHaveBeenCalledTimes(2);
    expect(setPrivyCookieMock).not.toHaveBeenCalled();
  });

  it("returns false if fetching the token throws", async () => {
    const error = new Error("network down");
    getAccessTokenMock.mockRejectedValue(error);

    const result = await setPrivyToken({ maxAttempts: 1, retryDelayMs: 0, force: true });

    expect(result).toBe(false);
    expect(getAccessTokenMock).toHaveBeenCalledTimes(1);
    expect(setPrivyCookieMock).not.toHaveBeenCalled();
  });
});
