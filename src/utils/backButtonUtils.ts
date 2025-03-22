import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

/**
 * Checks if a referrer URL is from the same domain as the current site,
 * including handling localhost as a special case.
 *
 * @param referrer The referrer URL to check
 * @returns boolean indicating if the referrer is from the same domain
 */
export function isSameDomain(referrer: string): boolean {
  // Check if referrer exists
  if (!referrer) return false;

  try {
    // Extract hostname from referrer
    const referrerUrl = new URL(referrer);
    const currentHost = window.location.hostname;

    // Consider localhost as same domain (for development environments)
    return (
      referrerUrl.hostname === currentHost ||
      referrerUrl.hostname.includes("localhost")
    );
  } catch (e) {
    // If URL parsing fails, assume different domain
    return false;
  }
}

/**
 * Handles navigation when a back button is clicked, with multiple fallbacks:
 * 1. Uses window.history.back() if browser history exists
 * 2. Checks if the referrer is from the same domain or localhost
 * 3. Falls back to navigating to the home page as a last resort
 *
 * @param router Next.js router instance
 * @param homePath Optional homepage path to redirect to (defaults to '/')
 */
export function handleBackNavigation(
  router: AppRouterInstance,
  homePath: string = "/"
): void {
  // Try using native browser history first if it exists
  if (window.history.length > 1) {
    window.history.back();
    return;
  }

  // Check if referrer is from the same domain using our helper
  if (isSameDomain(document.referrer)) {
    router.back();
  } else {
    router.push(homePath);
  }
}

/**
 * Returns a click handler function for back button navigation
 *
 * @param router Next.js router instance
 * @param homePath Optional homepage path to redirect to (defaults to '/')
 * @returns Click handler function
 */
export function getBackButtonHandler(
  router: AppRouterInstance,
  homePath: string = "/"
): () => void {
  return () => handleBackNavigation(router, homePath);
}
