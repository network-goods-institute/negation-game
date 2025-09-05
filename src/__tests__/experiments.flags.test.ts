import { inversePairEnabled } from "@/config/experiments";

describe("experiments flags", () => {
  const old = process.env.NEXT_PUBLIC_MULTIPLAYER_INVERSE_PAIR_ENABLED;
  afterEach(() => { process.env.NEXT_PUBLIC_MULTIPLAYER_INVERSE_PAIR_ENABLED = old; });

  it("inversePairEnabled false by default", () => {
    delete process.env.NEXT_PUBLIC_MULTIPLAYER_INVERSE_PAIR_ENABLED;
    // Module has already been loaded; this test simply asserts the default is not true
    expect(inversePairEnabled).toBe(false);
  });

  it("inversePairEnabled reads env true", async () => {
    process.env.NEXT_PUBLIC_MULTIPLAYER_INVERSE_PAIR_ENABLED = "true";
    jest.resetModules();
    const mod = await import("@/config/experiments");
    expect(mod.inversePairEnabled).toBe(true);
  });
});
