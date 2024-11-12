const minute = 60;
const hour = 60 * minute;
const day = 24 * hour;

export const timelineScale = {
  "1H": { bucketSize: 1 * minute, period: 1 * hour },
  "6H": { bucketSize: 1 * minute, period: 6 * hour },
  "1D": { bucketSize: 1 * minute, period: 1 * day },
  "1W": { bucketSize: 1 * minute, period: 7 * day },
  "1M": { bucketSize: 1 * minute, period: 30 * day },
};
export type TimelineScale = keyof typeof timelineScale | "ALL";

export const timelineScales = [
  ...Object.keys(timelineScale),
  "ALL",
] as TimelineScale[];
