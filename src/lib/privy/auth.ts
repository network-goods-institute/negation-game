import { getUser } from "@/hooks/auth/useUser";

/**
 * Retrieve the current user session from the request headers.
 */
export function getCurrentUser() {
  return getUser();
}
