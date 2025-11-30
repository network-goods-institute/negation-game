"use server";

import { getPrivyClient } from "@/lib/privy/getPrivyClient";
import { cookies, headers } from "next/headers";import { logger } from "@/lib/logger";
import { setPrivyCookie } from "@/actions/users/auth";

function extractBearerToken(rawAuth: string | null): string | null {
  if (!rawAuth) return null;
  const trimmed = rawAuth.trim();
  if (trimmed.toLowerCase().startsWith("bearer ")) {
    return trimmed.slice(7).trim();
  }
  return null;
}

async function tryHeaderFallback(): Promise<string | null> {
  try {
    const hdrs = await headers();
    const authHeader = hdrs.get("authorization");
    const altHeader = hdrs.get("x-privy-token");
    const candidate =
      extractBearerToken(authHeader) || (altHeader ? altHeader.trim() : null);
    if (!candidate) return null;

    const privyClient = await getPrivyClient();
    const verificationResult = await privyClient.verifyAuthToken(candidate);
    await setPrivyCookie(candidate);
    return verificationResult.userId;
  } catch (err) {
    return null;
  }
}

export const getUserId = async (): Promise<string | null> => {
  const cookieStore = await cookies();
  const privyToken = cookieStore.get("privy-token")?.value;

  if (!privyToken) {
    logger.warn("No Privy token found in cookies during getUserId call");
    const refreshed = await tryHeaderFallback();
    if (refreshed) {
      logger.info("Recovered user via Authorization header after missing cookie");
      return refreshed;
    }
    return null;
  }

  const privyClient = await getPrivyClient();

  try {
    const verificationResult = await privyClient.verifyAuthToken(privyToken);
    return verificationResult.userId;
  } catch (error) {
    logger.warn("Error verifying Privy token:", error);

    if (
      (error as any).name === "JWTExpired" ||
      (error as any).code === "ERR_JWT_EXPIRED"
    ) {
      logger.warn("Privy token expired");
      const refreshed = await tryHeaderFallback();
      if (refreshed) {
        logger.info("Auto-refreshed Privy token from Authorization header");
        return refreshed;
      }
      return null;
    }

    if (
      error instanceof Error &&
      error.message.toLowerCase().includes("invalid auth token")
    ) {
      logger.warn("Invalid auth token detected during getUserId call");
      return null;
    }

    logger.warn("Unknown error during Privy token verification:", error);
    return null;
  }
};
