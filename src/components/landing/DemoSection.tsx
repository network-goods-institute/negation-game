export function DemoSection() {
  return (
    <section id="demo" className="px-8 py-20">
      <div className="mx-auto max-w-[1200px]">
        <div className="text-center mb-16">
          <div className="inline-block mb-4 text-sm font-bold uppercase tracking-[0.6px] text-[#4285f4]">
            See it in action
          </div>
          <h2 className="mb-4 text-[clamp(32px,4vw,48px)] font-[750] tracking-[-0.6px]">
            Real objections on real decisions
          </h2>
          <p className="mx-auto max-w-[680px] text-lg text-[#5a6370]">
            Structure makes disagreement legible. Everyone points to the same thing.
          </p>
        </div>

        <div className="bg-white border border-[#e1e4e8] rounded-2xl p-10 shadow-[0_4px_16px_rgba(0,0,0,0.08)] max-w-[900px] mx-auto">
          <div className="mb-5 text-[13px] font-bold uppercase tracking-[0.5px] text-[#4285f4]">
            Product Decision
          </div>

          {/* Graph-style layout */}
          <div className="relative min-h-[280px]">
            {/* Central Claim */}
            <div className="absolute left-8 top-1/2 -translate-y-1/2 bg-white border-2 border-stone-200 rounded-lg px-4 py-3 shadow-md max-w-[280px]">
              <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-gray-500">Claim</div>
              <div className="mb-3 text-[15px] font-medium leading-tight">
                &ldquo;Ship the new onboarding flow to 100% next week.&rdquo;
              </div>
              <div className="text-[12px] text-gray-500 leading-relaxed">
                Criteria: reduce time-to-activation by 15% without increasing support tickets.
              </div>
            </div>

            {/* Objection */}
            <div className="absolute right-8 top-1/2 -translate-y-1/2 bg-amber-100 border-2 border-amber-300 rounded-xl px-4 py-3 shadow-md max-w-[280px] text-amber-900">
              <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-amber-700">Objection</div>
              <div className="mb-3 text-[15px] font-medium leading-tight">
                &ldquo;If we ship without fixing edge-case X, enterprise users will hit a dead-end and churn.&rdquo;
              </div>
              <div className="text-[12px] text-amber-700 leading-relaxed">
                Condition: accounts with SSO + legacy role mapping. Consequence: support load + expansion risk.
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
