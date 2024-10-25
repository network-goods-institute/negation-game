"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { useTheme } from "next-themes";
import { PropsWithChildren } from "react";
import { mainnet } from "viem/chains";

export const ThemedPrivyProvider = ({ children }: PropsWithChildren) => {
  const { resolvedTheme } = useTheme();
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
      clientId={process.env.NEXT_PUBLIC_PRIVY_CLIENT_ID!}
      config={{
        appearance: {
          theme: (resolvedTheme as "light" | "dark" | undefined) || "light",
          accentColor: "#7c3aed",
          logo: "/img/negation-game.png",
        },
        embeddedWallets: {
          createOnLogin: "off",
        },

        defaultChain: mainnet,
        supportedChains: [mainnet],
      }}
    >
      {children}
    </PrivyProvider>
  );
};
