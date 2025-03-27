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
 * Gets the current space from the URL path
 *
 * @returns The space name from URL or null if not found
 */
export function getSpaceFromUrl(): string | null {
  if (typeof window === "undefined") return null;

  const urlParts = window.location.pathname.split("/");
  const spaceIndex = urlParts.indexOf("s") + 1;

  if (
    spaceIndex > 0 &&
    urlParts[spaceIndex] &&
    urlParts[spaceIndex] !== "null" &&
    urlParts[spaceIndex] !== "undefined"
  ) {
    return urlParts[spaceIndex];
  }

  return null;
}

/**
 * Handles navigation when a back button is clicked, with multiple fallbacks:
 * 1. For rationale pages, first tries to navigate to current space page
 * 2. Uses window.history.back() if browser history exists
 * 3. Checks if the referrer is from the same domain or localhost
 * 4. Falls back to navigating to the home page as a last resort
 *
 * @param router Next.js router instance
 * @param homePath Optional homepage path to redirect to (defaults to '/')
 */
export function handleBackNavigation(
  router: AppRouterInstance,
  homePath: string = "/"
): void {
  // For rationale pages, navigate directly to the space page
  if (
    typeof window !== "undefined" &&
    window.location.pathname.includes("/rationale")
  ) {
    const currentSpace = getSpaceFromUrl();
    if (currentSpace) {
      router.push(`/s/${currentSpace}`);
      return;
    }
  }

  // Try using native browser history as fallback if it exists
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
