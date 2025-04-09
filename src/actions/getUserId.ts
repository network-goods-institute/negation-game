"use server";

import { getPrivyClient } from "@/lib/privy/getPrivyClient";
import { cookies } from "next/headers";

export const getUserId = async (): Promise<string | null> => {
  const privyToken = (await cookies()).get("privy-token")?.value;
  if (!privyToken) {
    console.warn("No Privy token found in cookies during getUserId call");
    return null;
  }

  const privyClient = await getPrivyClient();

  try {
    const verificationResult = await privyClient.verifyAuthToken(privyToken);
    return verificationResult.userId;
  } catch (error) {
    // Log the error for debugging
    console.warn("Error verifying Privy token:", error);

    // If we get an invalid auth token error, return null to trigger re-auth
    if (
      error instanceof Error &&
      error.message.toLowerCase().includes("invalid auth token")
    ) {
      console.warn("Invalid auth token detected during getUserId call");
      return null;
    }

    // For other errors, return null but log details
    console.warn("Unknown error during Privy token verification:", error);
    return null;
  }
};
