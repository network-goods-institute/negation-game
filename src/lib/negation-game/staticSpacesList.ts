/**
 * Static list of space IDs for middleware
 * 
 * This list is used by the middleware to validate subdomains without
 * requiring database access, which isn't supported in Edge Runtime.
 * 
 * UPDATE THIS LIST when new spaces are added or removed.
 * Run: pnpm tsx scripts/update-spaces-list.ts
 * 
 * For subdomain redirects to function properly, all valid spaces 
 * must be listed here.
 * 
 * Last updated: 2025-04-26T11:45:52.883Z
 */
export const VALID_SPACE_IDS = new Set([
  "global",
  "backpack",
  "ngi",
  "scroll"
]);
