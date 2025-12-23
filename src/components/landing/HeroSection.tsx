import Link from "next/link";
import { Button } from "@/components/ui/button";

interface HeroSectionProps {
  onLogin?: () => void;
}

export function HeroSection({ onLogin }: HeroSectionProps) {
  return (
    <section className="px-8 py-28 sm:py-32 text-center">
      <div className="mx-auto max-w-[980px]">
        <h1 className="mb-6 text-[clamp(44px,5.8vw,72px)] leading-[1.08] tracking-[-1.5px] font-[750]">
          Make decisions you {"don't"} regret.
        </h1>

        <p className="mx-auto mb-9 max-w-[760px] text-[#5a6370] text-xl leading-[1.55]">
          Regular meetings waste time when opinions diverge and no one can see the whole picture.
          Negation Game is a decision-aid tool for product managers to analyse ideas, identify constraints,
          discover solutions, and make better decisions with their teams and stakeholders.
        </p>

        <div className="flex items-center justify-center gap-3 mb-6 flex-wrap">
          <Button onClick={onLogin} size="lg" className="bg-[#4285f4] hover:bg-[#3367d6] text-white text-base font-semibold px-5 h-11 rounded-lg">
            Try it free
          </Button>
          <Button asChild variant="outline" size="lg" className="text-base font-semibold px-5 h-11 rounded-lg">
            <Link href="#how">See it in action</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
