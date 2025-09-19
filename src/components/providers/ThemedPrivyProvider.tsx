"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { useTheme } from "next-themes";
import { PropsWithChildren, useEffect, useMemo, useState } from "react";
import { mainnet } from "viem/chains";

export const ThemedPrivyProvider = ({ children }: PropsWithChildren) => {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const config = useMemo(() => ({
    appearance: {
      theme: (resolvedTheme as "light" | "dark" | undefined) || "light",
      accentColor: "#7c3aed",
      logo: "/img/negation-game.png",
    },
    embeddedWallets: {
      createOnLogin: "off" as const,
    },
    defaultChain: mainnet,
    supportedChains: [mainnet],
    session: {
      autoRefresh: true,
      refreshInterval: 300000, // 5 minutes
    },
  }), [resolvedTheme]);

  if (!mounted) return null;

  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
      clientId={process.env.NEXT_PUBLIC_PRIVY_CLIENT_ID!}
      config={config as any}
    >
      {children}
    </PrivyProvider>
  );
};
