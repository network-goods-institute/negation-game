/**
 * Safe wrappers for Next.js cache functions that work in both runtime and test environments
 */

import { unstable_cache as nextUnstableCache, revalidateTag as nextRevalidateTag } from "next/cache";

/**
 * Dynamically detect if we're in a test environment
 */
function isTestEnvironment(): boolean {
  return process.env.NODE_ENV === 'test' || typeof jest !== 'undefined';
}

/**
 * Safely calls unstable_cache, falling back to direct execution in test environments
 */
export function safeUnstableCache<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  keys: string[],
  options?: {
    tags?: string[];
    revalidate?: number | false;
  }
): T {
  // Check environment dynamically each time
  if (isTestEnvironment()) {
    return fn;
  }

  try {
    return nextUnstableCache(fn, keys, options) as T;
  } catch (e) {
    // Fallback if cache isn't available
    return fn;
  }
}

/**
 * Safely calls revalidateTag, no-op in test environments
 */
export function safeRevalidateTag(tag: string): void {
  // Check environment dynamically each time
  if (isTestEnvironment()) {
    return;
  }

  try {
    nextRevalidateTag(tag);
  } catch (e) {
    // In non-test environments, silently fail if cache isn't available
  }
}
