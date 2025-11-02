import { USER_HEADER } from "@/constants/config";
import { User } from "@privy-io/server-auth";
import { headers } from "next/headers";import { logger } from "@/lib/logger";

export async function getUser(): Promise<User | null> {
  const headersList = await headers();
  const userHeader = headersList.get(USER_HEADER);

  if (!userHeader) {
    return null;
  }

  try {
    return JSON.parse(userHeader);
  } catch (error) {
    logger.error("Failed to parse user from headers:", error);
    return null;
  }
}
