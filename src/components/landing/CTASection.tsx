"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

interface CTASectionProps {
  onLogin?: () => void;
}

export function CTASection({ onLogin }: CTASectionProps) {
  return (
    <section id="start" className="px-8 py-20">
      <div className="mx-auto max-w-[1200px]">
        <div className="bg-gradient-to-br from-[#4285f4]/5 via-[#ea4c89]/5 to-[#4285f4]/5 border border-[#e1e4e8] rounded-3xl p-16 sm:p-20 text-center">
          <h2 className="mb-4 text-[clamp(30px,4vw,44px)] font-bold tracking-[-0.6px]">
            Start pressure-testing decisions
          </h2>
          <p className="mx-auto mb-8 max-w-[560px] text-lg text-[#5a6370]">
            Surface the strongest objections early, when {"they're"} still actionable.
            Build a record that holds up later.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Button onClick={onLogin} size="lg" className="bg-[#4285f4] hover:bg-[#3367d6] text-white text-base font-semibold px-7 rounded-lg">
              Get started free
            </Button>
          <Button asChild variant="outline" size="lg" className="text-base font-semibold px-7 rounded-lg">
            <Link href="#how">See the example</Link>
          </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
