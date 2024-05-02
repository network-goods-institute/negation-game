"use server";

import { PrivyClient } from "@privy-io/server-auth";

export const getPrivyClient = () => {
  if (!process.env.NEXT_PUBLIC_PRIVY_APP_ID)
    throw new Error("NEXT_PUBLIC_PRIVY_APP_ID is not set.");
  if (!process.env.PRIVY_APP_SECRET)
    throw new Error("PRIVY_APP_SECRET is not set.");

  return new PrivyClient(
    process.env.NEXT_PUBLIC_PRIVY_APP_ID,
    process.env.PRIVY_APP_SECRET
  );
};
