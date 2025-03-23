import { isWithinDeletionTimelock } from "../deleteTimelock";

describe("isWithinDeletionTimelock", () => {
  // Define a fixed date for testing (2023-01-01 12:00:00 UTC)
  const fixedDate = new Date("2023-01-01T12:00:00Z");
  const fixedTimestamp = fixedDate.getTime();

  beforeEach(() => {
    // Mock Date.now to return our fixed timestamp
    jest.spyOn(Date, "now").mockImplementation(() => fixedTimestamp);

    // Mock Date constructor to return our fixed date when called without args
    const originalDate = global.Date;
    global.Date = class extends originalDate {
      constructor(arg?: string | number | Date) {
        super(arg as any);
        if (arg === undefined) {
          return fixedDate;
        }
      }
    } as DateConstructor;
  });

  afterEach(() => {
    jest.restoreAllMocks();
    // Restore the original Date constructor
    global.Date = Date;
  });

  it("should return true for a point created less than 8 hours ago", () => {
    // Point created 7 hours ago
    const pointCreatedAt = new Date(fixedTimestamp - 7 * 60 * 60 * 1000);

    const result = isWithinDeletionTimelock(pointCreatedAt);

    expect(result).toBe(true);
  });

  it("should return false for a point created more than 8 hours ago", () => {
    // Point created 9 hours ago
    const pointCreatedAt = new Date(fixedTimestamp - 9 * 60 * 60 * 1000);

    const result = isWithinDeletionTimelock(pointCreatedAt);

    expect(result).toBe(false);
  });

  it("should return true for a point created exactly 8 hours ago", () => {
    // Point created exactly 8 hours ago
    const pointCreatedAt = new Date(fixedTimestamp - 8 * 60 * 60 * 1000);

    const result = isWithinDeletionTimelock(pointCreatedAt);

    expect(result).toBe(true);
  });

  it("should handle date objects correctly", () => {
    // Point created 6 hours ago using timestamp
    const pointCreatedAt = new Date(fixedTimestamp - 6 * 60 * 60 * 1000);

    const result = isWithinDeletionTimelock(pointCreatedAt);

    expect(result).toBe(true);
  });
});
