"use server";

import { PrivyClient } from "@privy-io/server-auth";

let client: PrivyClient | null = null;

export const getPrivyClient = async () => {
  if (client) {
    return client;
  }

  if (!process.env.NEXT_PUBLIC_PRIVY_APP_ID)
    throw new Error("NEXT_PUBLIC_PRIVY_APP_ID is not set.");
  if (!process.env.PRIVY_APP_SECRET)
    throw new Error("PRIVY_APP_SECRET is not set.");

  client = new PrivyClient(
    process.env.NEXT_PUBLIC_PRIVY_APP_ID,
    process.env.PRIVY_APP_SECRET
  );

  return client;
};
