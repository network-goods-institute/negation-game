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
  } catch (error) {
    console.error("Error verifying Privy auth token:", error);
    // Clear invalid cookie
    // eslint-disable-next-line drizzle/enforce-delete-with-where
    await cookieStore.delete("privy-token");
    return null;
  }
}
