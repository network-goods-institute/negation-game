import { ConnectButton } from "@/components/ConnectButton";
import { QueryClientProvider } from "@/components/providers/QueryClientProvider";
import { ThemedPrivyProvider } from "@/components/providers/ThemedPrivyProvider";
import { ModeToggle } from "@/components/ui/ModeToggle";
import { ThemeProvider } from "@/components/ui/ThemeProvider";
import { Toaster } from "@/components/ui/sonner";
import { Dynamic } from "@/components/utils/Dynamic";
import { cn } from "@/lib/cn";
import { Analytics } from "@vercel/analytics/react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { TooltipProvider } from "@/components/ui/tooltip";
import { DevOnly } from "@/components/utils/DevOnly";
import { ToggleableReactQueryDevTools } from "@/components/utils/ToggleableReactQueryDevTools";
import "@xyflow/react/dist/style.css";
import Link from "next/link";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Negation Game",
  description: "Learning through dissent",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="h-full">
      <body className={cn(inter.className, "h-full flex flex-col")}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ThemedPrivyProvider>
            <QueryClientProvider>
              <TooltipProvider>
                <header className="sticky top-0 z-20 border-b py-sm flex justify-between container-padding items-center w-full bg-background h-[var(--header-height)]">
                  <div className="flex items-center">
                    <div className="flex items-center">
                      <Link href="/" className="font-bold">
                        Negation Game
                      </Link>
                      <div id="space-header" className="flex items-center ml-2"></div>
                    </div>
                  </div>
                  <div className="flex gap-sm">
                    <Dynamic>
                      <ModeToggle className="col-start-3 justify-self-end" />
                    </Dynamic>
                    <ConnectButton />
                  </div>
                </header>

                {children}

                <Toaster />
                <Analytics />
              </TooltipProvider>
              <DevOnly>
                <ToggleableReactQueryDevTools />
              </DevOnly>
            </QueryClientProvider>
          </ThemedPrivyProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
