import { QueryClientProvider } from "@/components/providers/QueryClientProvider";
import { ThemeProvider } from "@/components/ui/ThemeProvider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { KnowledgeBaseProvider } from "@/components/contexts/KnowledgeBaseContext";
import { WriteupProvider } from "@/components/contexts/WriteupContext";
import { OnboardingProvider } from "@/components/contexts/OnboardingContext";
import React from 'react';

export default function EmbedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <QueryClientProvider>
        <KnowledgeBaseProvider>
          <WriteupProvider>
            <OnboardingProvider>
              <TooltipProvider>
                {children}
              </TooltipProvider>
            </OnboardingProvider>
          </WriteupProvider>
        </KnowledgeBaseProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}