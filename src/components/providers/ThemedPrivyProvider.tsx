"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { useTheme } from "next-themes";
import { PropsWithChildren, useEffect, useMemo, useState } from "react";
import { mainnet } from "viem/chains";

const isLocalNetwork = typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' ||
   window.location.hostname.startsWith('192.168.') ||
   window.location.hostname.startsWith('10.') ||
   window.location.hostname.startsWith('172.'));

export const ThemedPrivyProvider = ({ children }: PropsWithChildren) => {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const config = useMemo(() => ({
    appearance: {
      theme: (resolvedTheme as "light" | "dark" | undefined) || "light",
      accentColor: "#7c3aed",
      logo: "/img/negation-game.png",
      walletList: isLocalNetwork ? [] : undefined, // Hide wallet UI on local network
    },
    embeddedWallets: {
      createOnLogin: "off" as const,
      noPromptOnSignature: true,
      requireUserPasswordOnCreate: false,
    },
    loginMethods: isLocalNetwork
      ? ['email', 'sms', 'google', 'twitter', 'discord', 'github', 'linkedin', 'apple']
      : ['email', 'sms', 'wallet', 'google', 'twitter', 'discord', 'github', 'linkedin', 'apple'],
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
