/**
 * Validates if a string is a valid space ID format
 * Spaces should be lowercase alphanumeric strings with hyphens
 * and should not match any blacklisted terms
 */
export function isValidSpaceId(id: string): boolean {
  // Check if it's a valid format (lowercase alphanumeric with hyphens)
  const validFormat = /^[a-z0-9-]+$/.test(id);

  // List of reserved keywords that can't be used as space IDs
  const reservedKeywords = [
    "www",
    "api",
    "admin",
    "app",
    "auth",
    "login",
    "signup",
    "signin",
    "register",
    "account",
    "settings",
    "help",
    "support",
    "static",
    "media",
    "assets",
    "images",
    "css",
    "js",
  ];

  const isReserved = reservedKeywords.includes(id);

  return validFormat && !isReserved;
}
