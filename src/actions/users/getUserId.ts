"use server";

import { getPrivyClient } from "@/lib/privy/getPrivyClient";
import { cookies } from "next/headers";import { logger } from "@/lib/logger";

export const getUserId = async (): Promise<string | null> => {
  const privyToken = (await cookies()).get("privy-token")?.value;
  if (!privyToken) {
    logger.warn("No Privy token found in cookies during getUserId call");
    return null;
  }

  const privyClient = await getPrivyClient();

  try {
    const verificationResult = await privyClient.verifyAuthToken(privyToken);
    return verificationResult.userId;
  } catch (error) {
    logger.warn("Error verifying Privy token:", error);

    // If token expired, return null to trigger re-auth
    if (
      (error as any).name === "JWTExpired" ||
      (error as any).code === "ERR_JWT_EXPIRED"
    ) {
      logger.warn("Privy token expired");
      return null;
    }

    // If we get an invalid auth token error, return null to trigger re-auth
    if (
      error instanceof Error &&
      error.message.toLowerCase().includes("invalid auth token")
    ) {
      logger.warn("Invalid auth token detected during getUserId call");
      return null;
    }

    // For other errors, return null but log details
    logger.warn("Unknown error during Privy token verification:", error);
    return null;
  }
};
