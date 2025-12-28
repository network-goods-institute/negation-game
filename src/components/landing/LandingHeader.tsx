"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

interface LandingHeaderProps {
  onLogin?: () => void;
}

export function LandingHeader({ onLogin }: LandingHeaderProps) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 bg-[#fafbfc]/95 backdrop-blur-md border-b transition-all ${scrolled ? 'shadow-sm' : ''}`}>
      <div className="max-w-[1400px] mx-auto px-8">
        <nav className="flex items-center justify-between py-5 gap-8">
          <Link href="#top" className="flex items-center gap-3 text-lg font-bold text-[#1a1d21] tracking-tight hover:opacity-100">
            Negation Game
          </Link>

          <div className="hidden lg:flex items-center gap-2 flex-1 justify-center">
            <Link href="#benefits" className="text-[#5a6370] text-[15px] font-medium px-4 py-2 rounded-lg hover:text-[#1a1d21] hover:bg-black/5 transition">
              Benefits
            </Link>
            <Link href="#how" className="text-[#5a6370] text-[15px] font-medium px-4 py-2 rounded-lg hover:text-[#1a1d21] hover:bg-black/5 transition">
              How it works
            </Link>
            <Link href="#problem" className="text-[#5a6370] text-[15px] font-medium px-4 py-2 rounded-lg hover:text-[#1a1d21] hover:bg-black/5 transition">
              The problem
            </Link>
            <Link href="#process" className="text-[#5a6370] text-[15px] font-medium px-4 py-2 rounded-lg hover:text-[#1a1d21] hover:bg-black/5 transition">
              Process
            </Link>
            <Link href="#who" className="text-[#5a6370] text-[15px] font-medium px-4 py-2 rounded-lg hover:text-[#1a1d21] hover:bg-black/5 transition">
              Who {"it's"} for
            </Link>
            <Link href="#what" className="text-[#5a6370] text-[15px] font-medium px-4 py-2 rounded-lg hover:text-[#1a1d21] hover:bg-black/5 transition">
              What it is
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <Button asChild variant="outline" className="text-[15px] font-semibold rounded-lg">
              <Link href="#how">See it in action</Link>
            </Button>
            <Button onClick={onLogin} className="bg-[#4285f4] hover:bg-[#3367d6] text-white text-[15px] font-semibold rounded-lg">
              Log in
            </Button>
          </div>
        </nav>
      </div>
    </header>
  );
}
