import { getMarketView } from "@/actions/market/getMarketView";
import { skipIfCarrollStubbed } from "@/test/utils/skipIfCarrollStubbed";

jest.mock("@/services/db", () => {
  const rows = [
    { securityId: "p-a", amountScaled: (1n * 10n ** 18n).toString() },
    { securityId: "p-b", amountScaled: (2n * 10n ** 18n).toString() },
    {
      securityId: `edge:support:p-a:p-a-source-handle->p-b:p-b-incoming-handle`,
      amountScaled: "0",
    },
  ];
  const chain = {
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockResolvedValue(rows),
  } as any;
  return {
    db: {
      select: jest.fn(() => chain),
    },
  };
});

jest.mock("@/actions/market/reconcileTradableSecurities", () => ({
  reconcileTradableSecurities: async () => ({
    structure: { names: [], edges: [] },
    securities: [],
    persisted: false,
  }),
}));

jest.mock("@/utils/slugResolver", () => ({
  resolveSlugToId: async (x: string) => x,
}));

(skipIfCarrollStubbed ? describe.skip : describe)("getMarketView fallback totals recomputation", () => {
  it("repopulates totals for fallback-rebuilt securities", async () => {
    const view = await getMarketView("doc-fallback-test");
    expect(view).toBeTruthy();
    expect(view.totals["p-a"]).toBe((1n * 10n ** 18n).toString());
    expect(view.totals["p-b"]).toBe((2n * 10n ** 18n).toString());
  });
});
