import { encodeId } from "@/lib/encodeId";

/**
 * Creates a URL for a point based on the point ID and space
 * @param pointId The ID of the point (number or already encoded string)
 * @param space Optional space parameter, defaults to extracting from current path or 'global'
 * @returns Full URL path to the point
 */
export const getPointUrl = (
  pointId: number | string,
  space?: string
): string => {
  // Handle already encoded string IDs
  if (typeof pointId === "string") {
    const targetSpace =
      space ||
      (typeof window !== "undefined"
        ? window.location.pathname.match(/\/s\/([^/]+)/)?.[1] || "global"
        : "global");
    return `/s/${targetSpace}/${pointId}`;
  }

  // If space is provided, use it
  if (space) {
    return `/s/${space}/${encodeId(pointId)}`;
  }

  // Otherwise extract from current path if available
  if (typeof window !== "undefined") {
    const pathname = window.location.pathname;
    const spaceMatch = pathname.match(/\/s\/([^/]+)/);
    const extractedSpace = spaceMatch ? spaceMatch[1] : "global";
    return `/s/${extractedSpace}/${encodeId(pointId)}`;
  }

  // Default fallback if window is not available (e.g., during SSR)
  return `/s/global/${encodeId(pointId)}`;
};
