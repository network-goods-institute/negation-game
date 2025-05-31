import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

/**
 * Checks if a referrer URL is from the same domain as the current site,
 * including handling localhost as a special case.
 *
 * @param referrer The referrer URL to check
 * @returns boolean indicating if the referrer is from the same domain
 */
export function isSameDomain(referrer: string): boolean {
  if (!referrer) return false;

  try {
    const referrerUrl = new URL(referrer);
    const currentHost = window.location.hostname;

    return (
      referrerUrl.hostname === currentHost ||
      referrerUrl.hostname.includes("localhost")
    );
  } catch (e) {
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
 * Handles navigation when a back button is clicked, using Jotai state for initial tab.
 * 1. For rationale pages, sets atom to 'rationales' and navigates to space.
 * 2. For point pages, sets atom to 'points' and navigates to space.
 * 3. Uses window.history.back() if possible.
 * 4. Checks referrer.
 * 5. Falls back to home.
 *
 * @param router Next.js router instance
 * @param setInitialTab Jotai setter for initialSpaceTabAtom
 * @param homePath Optional homepage path
 */
export function handleBackNavigation(
  router: AppRouterInstance,
  setInitialTab: (update: "points" | "rationales" | null) => void,
  homePath: string = "/"
): void {
  if (typeof window === "undefined") {
    router.push(homePath);
    return;
  }

  const pathname = window.location.pathname;
  const pathParts = pathname.split("/").filter(Boolean);

  // Early return for profile pages to prevent recursive calls
  // This ensures we don't try to navigate to the same profile page
  if (pathParts[0] === "profile") {
    setInitialTab(null);
    // If we have history, just go back
    if (window.history.length > 1) {
      window.history.back();
      return;
    }
    // Otherwise go to home
    router.push(homePath);
    return;
  }

  if (pathname.includes("/rationale")) {
    const currentSpace = getSpaceFromUrl();
    if (currentSpace) {
      setInitialTab("rationales");
      router.push(`/s/${currentSpace}`);
      return;
    }
  }

  if (
    pathParts.length === 3 &&
    pathParts[0] === "s" &&
    !pathname.includes("/profile/")
  ) {
    const currentSpace = pathParts[1];
    setInitialTab("points");
    router.push(`/s/${currentSpace}`);
    return;
  }

  // No default space fallback for single-segment paths; fall through to history or home handling

  setInitialTab(null);

  if (window.history.length > 1) {
    window.history.back();
    return;
  }

  if (isSameDomain(document.referrer)) {
    router.back();
    return;
  }

  router.push(homePath);
}

/**
 * Returns a click handler function for back button navigation using Jotai state.
 *
 * @param router Next.js router instance
 * @param setInitialTab Jotai setter for initialSpaceTabAtom
 * @param homePath Optional homepage path
 * @returns Click handler function
 */
export function getBackButtonHandler(
  router: AppRouterInstance,
  setInitialTab: (update: "points" | "rationales" | null) => void,
  homePath: string = "/"
): () => void {
  return () => handleBackNavigation(router, setInitialTab, homePath);
}
