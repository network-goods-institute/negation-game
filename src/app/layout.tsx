import { QueryClientProvider } from "@/components/providers/QueryClientProvider";
import { ThemedPrivyProvider } from "@/components/providers/ThemedPrivyProvider";
import { ThemeProvider } from "@/components/ui/ThemeProvider";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/cn";
import { Analytics } from "@vercel/analytics/react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { GlobalDialogs } from "@/components/GlobalDialogs";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DevOnly } from "@/components/utils/DevOnly";
import { ToggleableReactQueryDevTools } from "@/components/utils/ToggleableReactQueryDevTools";
import "@xyflow/react/dist/style.css";
import "./globals.css";
import { OnboardingProvider } from "@/components/contexts/OnboardingContext";
import { HeaderActions } from "@/components/layout/HeaderActions";
import {
  DynamicHeaderContent

} from "@/components/layout/DynamicHeaderContent";
const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Negation Game",
  description: "A protocol layer for reasoned disagreement: powered by economic incentives, governed by epistemic values, and designed for minds willing to change.",
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
              <OnboardingProvider>
                <TooltipProvider>
                  <header className="sticky top-0 z-20 border-b py-sm flex justify-between container-padding items-center w-full bg-background h-[var(--header-height)]">
                    <div className="flex items-center min-w-0" id="header-container">
                      <div className="flex items-center min-w-0 overflow-hidden" id="dynamic-header-content">
                        <DynamicHeaderContent />
                      </div>
                    </div>
                    <HeaderActions />
                  </header>

                  {children}

                  <Toaster />
                  <GlobalDialogs />
                  <Analytics />
                </TooltipProvider>
                <DevOnly>
                  <ToggleableReactQueryDevTools />
                </DevOnly>
              </OnboardingProvider>
            </QueryClientProvider>
          </ThemedPrivyProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
