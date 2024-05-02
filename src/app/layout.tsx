import { ConnectButton } from "@/components/ConnectButton";
import { Navigation } from "@/components/Navigation/Navigation";
import { QueryClientProvider } from "@/components/providers/QueryClientProvider";
import { ThemedPrivyProvider } from "@/components/providers/ThemedPrivyProvider";
import { ModeToggle } from "@/components/ui/ModeToggle";
import { ThemeProvider } from "@/components/ui/ThemeProvider";
import { Toaster } from "@/components/ui/sonner";
import Dynamic from "@/components/utils/Dynamic";
import { cn } from "@/lib/cn";
import type { Metadata } from "next";
import { Belanosima, Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });
const belanosima = Belanosima({ subsets: ["latin"], weight: "400" });

export const metadata: Metadata = {
  title: "Anagogic",
  description: "Challenge, Rethink, Ascend",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <QueryClientProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <ThemedPrivyProvider>
              <header className="sticky top-0 z-10 shadow-md flex justify-between container-padding items-center w-full bg-secondary h-2xl">
                <p
                  className={cn(
                    belanosima.className,
                    "tracking-wider text-primary-ally"
                  )}
                >
                  ANAGOGIC
                </p>
                <Navigation className="hidden sm:block" />
                <div className="flex gap-sm">
                  <Dynamic>
                    <ModeToggle className="col-start-3 justify-self-end" />
                  </Dynamic>
                  <ConnectButton />
                </div>
              </header>
              {children}
              <Toaster />
              <footer className="sm:hidden sticky bottom-0 bg-secondary h-2xl content-center">
                <Navigation className="sm:hidden" />
              </footer>
            </ThemedPrivyProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </body>
    </html>
  );
}
