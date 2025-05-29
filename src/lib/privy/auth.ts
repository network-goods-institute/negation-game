import { cookies } from "next/headers";
import { getPrivyClient } from "@/lib/privy/getPrivyClient";

/**
 * Retrieve the current user session from Privy using the stored token
 */
export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("privy-token")?.value;
  if (!token) return null;

  const client = await getPrivyClient();
  try {
    const session = await client.verifyAuthToken(token);
    return session;
  } catch (error: any) {
    // If token has expired, silently return null
    if (error?.name === "JWTExpired") {
      return null;
    }
    console.error("Error verifying Privy auth token:", error);
    return null;
  }
}
