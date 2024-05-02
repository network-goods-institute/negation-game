"use server";

import { getPrivyClient } from "@/lib/privy/getPrivyClient";
import { cookies } from "next/headers";

export const getUserId = async (): Promise<string | null> => {
  const privyToken = cookies().get("privy-token")?.value;
  if (!privyToken) {
    return null;
  }

  const privyClient = getPrivyClient();

  try {
    return (await privyClient.verifyAuthToken(privyToken)).userId;
  } catch (error) {
    console.error("error when verifying user privy token", error);
    return null;
  }
};
