import { HeroSection } from "./HeroSection";
import { BenefitsSection } from "./BenefitsSection";
import { ShowcaseSection } from "./ShowcaseSection";
import { ProblemSection } from "./ProblemSection";
import { ProcessSection } from "./ProcessSection";
import { WhoSection } from "./WhoSection";
import { WhatItIsNotSection } from "./WhatItIsNotSection";
import { CTASection } from "./CTASection";
import { LandingFooter } from "./LandingFooter";
import { LandingHeader } from "./LandingHeader";

interface LandingPageProps {
  onLogin?: () => void;
}

export function LandingPage({ onLogin }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-[#fafbfc]">
      <LandingHeader onLogin={onLogin} />
      <main id="top" className="pt-[72px]">
        <HeroSection onLogin={onLogin} />
        <BenefitsSection />
        <ShowcaseSection />
        <ProblemSection />
        <ProcessSection />
        <WhoSection />
        <WhatItIsNotSection />
        <CTASection onLogin={onLogin} />
      </main>
      <LandingFooter />
    </div>
  );
}
