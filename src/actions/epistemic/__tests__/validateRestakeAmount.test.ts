import { validateRestakeAmount } from "../enforceRestakeCap";

// Mocks
jest.mock("@/services/db", () => ({
  db: {
    select: jest.fn().mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue([{ cred: 100 }]),
        }),
      }),
    }),
  },
}));

describe("validateRestakeAmount", () => {
  it("returns valid=true when proposed amount ≤ endorsement", async () => {
    const result = await validateRestakeAmount("user1", 123, 80);
    expect(result.valid).toBe(true);
    expect(result.maxAllowed).toBe(100);
    expect(result.endorseAmount).toBe(100);
  });

  it("returns valid=false when proposed amount > endorsement", async () => {
    const result = await validateRestakeAmount("user1", 123, 120);
    expect(result.valid).toBe(false);
    expect(result.maxAllowed).toBe(100);
    expect(result.endorseAmount).toBe(100);
  });
});
