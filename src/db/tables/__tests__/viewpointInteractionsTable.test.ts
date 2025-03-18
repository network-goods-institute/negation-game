// Mock the table schema
jest.mock("../viewpointInteractionsTable", () => ({
  viewpointInteractionsTable: {
    _: {
      name: "viewpoint_interactions",
      columns: {
        viewpointId: { notNull: true },
        views: { notNull: true },
        copies: { notNull: true },
        lastViewed: { notNull: true },
        lastUpdated: { notNull: true },
      },
    },
  },
}));

import { viewpointInteractionsTable } from "../viewpointInteractionsTable";

describe("viewpointInteractionsTable", () => {
  it("should have the correct table name", () => {
    // Check table name
    expect(viewpointInteractionsTable._.name).toBe("viewpoint_interactions");
  });

  it("should have the expected columns", () => {
    // Check columns exist with correct names
    const columns = viewpointInteractionsTable._.columns;
    expect(columns).toHaveProperty("viewpointId");
    expect(columns).toHaveProperty("views");
    expect(columns).toHaveProperty("copies");
    expect(columns).toHaveProperty("lastViewed");
    expect(columns).toHaveProperty("lastUpdated");
  });

  it("should have required constraints on columns", () => {
    const columns = viewpointInteractionsTable._.columns;
    expect(columns.viewpointId.notNull).toBe(true);
    expect(columns.views.notNull).toBe(true);
    expect(columns.copies.notNull).toBe(true);
    expect(columns.lastViewed.notNull).toBe(true);
    expect(columns.lastUpdated.notNull).toBe(true);
  });
});
