import { encodeId } from "@/lib/negation-game/encodeId";

/**
 * Creates a URL for a point based on the point ID and optional space
 * @param pointId The ID of the point (number or already encoded string)
 * @param space The space slug (optional; fallback to URL or global)
 * @returns Full URL path to the point
 */
export const getPointUrl = (
  pointId: number | string,
  space?: string
): string => {
  // Determine space: use provided, else extract from window, else default to 'global'
  let resolvedSpace = space;
  if (!resolvedSpace) {
    try {
      if (typeof window !== "undefined" && window.location?.pathname) {
        const match = window.location.pathname.match(/^\/s\/([^/]+)/);
        if (match && match[1]) {
          resolvedSpace = match[1];
        }
      }
    } catch {
      // ignore errors (e.g., SSR)
    }
  }
  if (!resolvedSpace) {
    resolvedSpace = "global";
  }
  const id = typeof pointId === "string" ? pointId : encodeId(pointId);
  return `/s/${resolvedSpace}/${id}`;
};
