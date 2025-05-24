import { notFound } from "next/navigation";

/**
 * Check if data exists and throw a 404 if it doesn't
 * This is a server-side utility to show the Next.js 404 page
 */
export function throwNotFoundIfNull<T>(
  data: T | null | undefined,
  message = "Resource not found"
): asserts data is T {
  if (data === null || data === undefined) {
    console.warn(`404 Error: ${message}`);
    notFound();
  }
}

/**
 * Check if IDs match any existing records, throw 404 if none found
 * Useful when fetching points, rationales, or spaces
 */
export function throwNotFoundIfEmpty<T>(
  items: T[],
  ids: (string | number)[],
  itemType = "resource"
): asserts items is [T, ...T[]] {
  if (!items || items.length === 0) {
    const idsStr = ids.join(", ");
    console.warn(`404 Error: No ${itemType}(s) found with ID(s): ${idsStr}`);
    notFound();
  }
}

/**
 * Client-side utility to redirect to 404 if data is missing
 * For use in client components where notFound() can't be called directly
 */
export function checkNotFound<T>(
  data: T | null | undefined,
  router: { notFound: () => void },
  fallback?: React.ReactNode
): data is T {
  if (data === null || data === undefined) {
    router.notFound();
    return false;
  }
  return true;
}
