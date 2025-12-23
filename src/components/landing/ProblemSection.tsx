export function ProblemSection() {
  const showProblemVisual = false;
  const gridClassName = showProblemVisual
    ? "grid gap-16 items-center lg:grid-cols-2"
    : "grid gap-16 items-center";

  return (
    <section id="problem" className="px-8 py-20">
      <div className="mx-auto max-w-[1200px]">
        <div className={gridClassName}>
          <div>
            <div className="inline-block mb-4 text-sm font-bold uppercase tracking-[0.6px] text-[#4285f4]">
              The problem
            </div>
            <h2 className="mb-6 text-[clamp(32px,4vw,48px)] font-[750] tracking-[-0.6px]">
              Most real disagreements stay invisible until {"it's"} expensive.
            </h2>
            <p className="mb-5 text-lg text-[#5a6370] leading-[1.6]">
              Early alignment suppresses objections. Power dynamics distort what gets said.
              Critical concerns surface only after momentum makes them politically or operationally untouchable.
            </p>
            <p className="text-lg text-[#5a6370] leading-[1.6]">
              Negation Game makes dissent legible without making it loud.
            </p>
          </div>
          {showProblemVisual && (
            <div className="flex items-center justify-center bg-white p-16 rounded-2xl border border-[#e1e4e8] shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
              <div className="relative w-full aspect-[3/2] flex items-center justify-center">
                <svg viewBox="0 0 600 400" className="w-full h-full">
                  <defs>
                    <path id="curve" d="M90,220 Q200,140 310,220 T520,220" fill="none" />
                  </defs>
                  <use href="#curve" stroke="#e1e4e8" strokeWidth="2" strokeDasharray="10,6" />
                  <circle cx="110" cy="220" r="44" fill="#4285f4" opacity="0.15" />
                  <circle cx="310" cy="220" r="44" fill="#ff9466" opacity="0.15" />
                  <circle cx="510" cy="220" r="44" fill="#34a853" opacity="0.15" />
                  <rect x="220" y="70" width="160" height="52" rx="12" fill="#f8f9fa" stroke="#e1e4e8" />
                  <text x="300" y="102" fontFamily="Arial" fontSize="14" fill="#666" textAnchor="middle">Objections attached</text>
                </svg>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
