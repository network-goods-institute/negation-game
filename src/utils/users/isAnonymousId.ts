/**
 * Check if a user ID is anonymous
 * Client-side utility function
 */
export const isAnonymousId = (userId: string): boolean => {
  return userId.startsWith("anon-");
};
