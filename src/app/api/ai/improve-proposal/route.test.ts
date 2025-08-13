import { improveProposalBodySchema } from "./schema";

describe("improveProposalBodySchema", () => {
  it("accepts a minimal valid payload", () => {
    const parsed = improveProposalBodySchema.safeParse({
      currentText: "x",
      instruction: "y",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects when fields are missing", () => {
    const parsed = improveProposalBodySchema.safeParse({});
    expect(parsed.success).toBe(false);
  });
});
