"use server";

import { getPrivyClient } from "@/lib/privy/getPrivyClient";
import { cookies } from "next/headers";

export const getUserId = async (): Promise<string | null> => {
  const privyToken = (await cookies()).get("privy-token")?.value;
  if (!privyToken) {
    return null;
  }

  const privyClient = await getPrivyClient();

  try {
    const verificationResult = await privyClient.verifyAuthToken(privyToken);
    return verificationResult.userId;
  } catch (error) {
    // If we get an invalid auth token error, return null to trigger re-auth
    if (
      error instanceof Error &&
      error.message.toLowerCase().includes("invalid auth token")
    ) {
      return null;
    }

    return null;
  }
};
