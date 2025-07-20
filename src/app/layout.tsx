import { QueryClientProvider } from "@/components/providers/QueryClientProvider";
import { ThemedPrivyProvider } from "@/components/providers/ThemedPrivyProvider";
import { ThemeProvider } from "@/components/ui/ThemeProvider";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils/cn";
import type { Metadata, Viewport } from "next";
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
import { SpaceSearchProvider } from "@/components/contexts/SpaceSearchContext";
import { HeaderActions } from "@/components/header/HeaderActions";
import {
  DynamicHeaderContent
} from "@/components/header/DynamicHeaderContent";
import { getCurrentUser } from "@/lib/privy/auth";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: {
    default: "Negation Game - Protocol for Reasoned Disagreement",
    template: "%s | Negation Game"
  },
  description: "A protocol layer for reasoned disagreement: powered by economic incentives, governed by epistemic values, and designed for minds willing to change. Transform debates into structured, accountable discussions.",
  keywords: [
    "debate platform",
    "reasoned disagreement",
    "epistemic discourse",
    "structured arguments",
    "intellectual honesty",
    "commitment mechanisms",
    "economic incentives",
    "discourse platform",
    "argument mapping",
    "collaborative reasoning",
    "decision making",
    "democratic discourse"
  ],
  authors: [{ name: "Negation Game Team" }],
  creator: "Negation Game",
  publisher: "Negation Game",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NODE_ENV === "development"
    ? "http://localhost:3000"
    : `https://${process.env.NEXT_PUBLIC_DOMAIN || "negationgame.com"}`
  ),
  alternates: {
    canonical: "/",
  },
  other: {
    "theme-color": "#667eea",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": "Negation Game",
    "mobile-web-app-capable": "yes",
    "msapplication-TileColor": "#667eea",
    "msapplication-TileImage": "/img/negation-game.png",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    title: "Negation Game - Protocol for Reasoned Disagreement",
    description: "A revolutionary protocol that transforms debates into structured, accountable discussions. Drive better decision-making through incentivized intellectual honesty.",
    siteName: "Negation Game",
    images: [
      {
        url: "/img/negation-game.png",
        width: 1200,
        height: 630,
        alt: "Negation Game - Protocol for Reasoned Disagreement",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Negation Game - Protocol for Reasoned Disagreement",
    description: "A revolutionary protocol that transforms debates into structured, accountable discussions. Drive better decision-making through incentivized intellectual honesty.",
    site: "@negationgame",
    creator: "@negationgame",
    images: ["/img/negation-game.png"],
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
  },
  category: "technology",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();

  // Structured data for the organization
  const organizationStructuredData = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Negation Game",
    "url": process.env.NODE_ENV === "development"
      ? "http://localhost:3000"
      : `https://${process.env.NEXT_PUBLIC_DOMAIN || "negationgame.com"}`,
    "logo": `${process.env.NODE_ENV === "development"
      ? "http://localhost:3000"
      : `https://${process.env.NEXT_PUBLIC_DOMAIN || "negationgame.com"}`}/img/negation-game.png`,
    "description": "A protocol layer for reasoned disagreement: powered by economic incentives, governed by epistemic values, and designed for minds willing to change.",
    "foundingDate": "2024",
    "applicationCategory": "CommunicationApplication",
    "keywords": ["discourse platform", "reasoned disagreement", "epistemic values", "commitment mechanisms", "intellectual honesty"],
    "sameAs": [
      "https://t.me/+a0y-MpvjAchkM2Qx"
    ]
  };

  return (
    <html lang="en-US" suppressHydrationWarning className="h-full">
      <head>

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationStructuredData),
          }}
        />
        {/* Preconnect for Google Fonts to speed up font loading */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      </head>
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
                    <SpaceSearchProvider>
                      <TooltipProvider>
                        <header className="fixed top-0 z-20 border-b py-sm grid grid-cols-3 container-padding items-center w-full bg-background h-[var(--header-height)]">
                          <div className="flex items-center min-w-0" id="header-container">
                            <div className="flex items-center min-w-0 overflow-hidden" id="dynamic-header-content">
                              <DynamicHeaderContent />
                            </div>
                          </div>
                          <div className="flex justify-center px-4" id="header-search-container">
                            {/* Search will be rendered here via HeaderActions */}
                          </div>
                          <div className="flex justify-end">
                            <HeaderActions />
                          </div>
                        </header>

                        <div className="pt-[var(--header-height)]">
                          {children}
                        </div>

                      <Toaster />
                      <GlobalDialogs />
                    </TooltipProvider>
                    </SpaceSearchProvider>
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
