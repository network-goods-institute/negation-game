"use server";

import { PrivyClient } from "@privy-io/server-auth";

let client: PrivyClient | null = null;

export const getPrivyClient = async () => {
  // Prevent initialization during build/static generation
  if (typeof window !== 'undefined' || !process.env.NEXT_PUBLIC_PRIVY_APP_ID) {
    return null;
  }

  if (client) {
    return client;
  }

  if (!process.env.PRIVY_APP_SECRET)
    throw new Error("PRIVY_APP_SECRET is not set.");

  client = new PrivyClient(
    process.env.NEXT_PUBLIC_PRIVY_APP_ID,
    process.env.PRIVY_APP_SECRET
  );

  return client;
};
