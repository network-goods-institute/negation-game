import Link from "next/link";

export function LandingFooter() {
  return (
    <footer className="border-t border-[#e1e4e8] px-8 py-16 text-[#5a6370] text-sm">
      <div className="mx-auto max-w-[1400px]">
        <div className="flex flex-wrap items-center justify-between gap-8">
          <div className="text-base font-bold text-[#1a1d21]">Negation Game</div>

          <nav className="flex flex-wrap gap-6">
            <Link href="#how" className="hover:text-[#1a1d21] transition-colors">
              How it works
            </Link>
            <Link href="#demo" className="hover:text-[#1a1d21] transition-colors">
              See it in action
            </Link>
            <Link href="#who" className="hover:text-[#1a1d21] transition-colors">
              Who {"it's"} for
            </Link>
            <a href="mailto:support@networkgoods.institute" className="hover:text-[#1a1d21] transition-colors">
              Contact
            </a>
          </nav>

          <div>© 2025 Negation Game</div>
        </div>
      </div>
    </footer>
  );
}
