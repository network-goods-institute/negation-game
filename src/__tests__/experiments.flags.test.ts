import { inversePairEnabled } from "@/config/experiments";

describe("experiments flags", () => {
  const old = process.env.NEXT_PUBLIC_MULTIPLAYER_INVERSE_PAIR_ENABLED;
  afterEach(() => { process.env.NEXT_PUBLIC_MULTIPLAYER_INVERSE_PAIR_ENABLED = old; });
  

  it("inversePairEnabled reads env true", async () => {
    process.env.NEXT_PUBLIC_MULTIPLAYER_INVERSE_PAIR_ENABLED = "true";
    jest.resetModules();
    const mod = await import("@/config/experiments");
    expect(mod.inversePairEnabled).toBe(true);
  });
});
