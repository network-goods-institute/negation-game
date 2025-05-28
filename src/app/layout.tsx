import { QueryClientProvider } from "@/components/providers/QueryClientProvider";
import { ThemedPrivyProvider } from "@/components/providers/ThemedPrivyProvider";
import { ThemeProvider } from "@/components/ui/ThemeProvider";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils/cn";
import { Analytics } from "@vercel/analytics/react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { GlobalDialogs } from "@/components/dialogs/GlobalDialogs";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DevOnly } from "@/components/utils/DevOnly";
import { ToggleableReactQueryDevTools } from "@/components/utils/ToggleableReactQueryDevTools";
import "@xyflow/react/dist/style.css";
import "./globals.css";
import { KnowledgeBaseProvider } from "@/components/contexts/KnowledgeBaseContext";
import { OnboardingProvider } from "@/components/contexts/OnboardingContext";
import { WriteupProvider } from "@/components/contexts/WriteupContext";
import { HeaderActions } from "@/components/header/HeaderActions";
import {
  DynamicHeaderContent
} from "@/components/header/DynamicHeaderContent";
import { getCurrentUser } from "@/actions/users/auth";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Negation Game",
  description: "A protocol layer for reasoned disagreement: powered by economic incentives, governed by epistemic values, and designed for minds willing to change.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();

  return (
    <html lang="en" suppressHydrationWarning className="h-full">
      <body className={cn("font-sans", inter.variable, "h-full flex flex-col")}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ThemedPrivyProvider>
            <QueryClientProvider>
              <KnowledgeBaseProvider>
                <WriteupProvider>
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
                </WriteupProvider>
              </KnowledgeBaseProvider>
            </QueryClientProvider>
          </ThemedPrivyProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
