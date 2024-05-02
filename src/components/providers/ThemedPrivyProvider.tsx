"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { useTheme } from "next-themes";
import { PropsWithChildren } from "react";

export const ThemedPrivyProvider = ({ children }: PropsWithChildren) => {
  const { resolvedTheme } = useTheme();
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
      config={{
        appearance: {
          theme: (resolvedTheme as "light" | "dark" | undefined) || "light",
          accentColor: "#2563eb",
          logo: "/img/anagogic.png",
        },
        embeddedWallets: {
          createOnLogin: "off",
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
};
