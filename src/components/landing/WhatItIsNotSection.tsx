const notItems = [
  { label: "Not voting", description: "Structured objection capture" },
  { label: "Not consensus", description: "Legible disagreement mapping" },
  { label: "Not brainstorming", description: "Stress-testing existing proposals" },
  { label: "Not a forum", description: "Focused decision infrastructure" },
  { label: "Not performative feedback", description: "Signal through commitment" },
];

const isItems = [
  { label: "Structured objections", description: "Clear failure modes, conditions, and consequences" },
  { label: "Legible record", description: "What was considered and why, six months later" },
  { label: "Signal over noise", description: "Commitment separates serious concerns from casual takes" },
  { label: "Decision support", description: "Leaders decide with better maps of disagreement" },
];

export function WhatItIsNotSection() {
  return (
    <>
      <section id="what" className="px-8 py-20">
        <div className="mx-auto max-w-[1000px]">
          <div className="text-center mb-16">
            <div className="inline-block mb-4 text-sm font-bold uppercase tracking-[0.6px] text-[#4285f4]">
              What it is
            </div>
            <p className="mx-auto max-w-[680px] text-lg text-[#5a6370]">
              A system to surface objections that matter before decisions become irreversible.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {isItems.map((item) => (
              <div key={item.label} className="bg-white border border-[#e1e4e8] rounded-xl p-7 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                <div className="flex items-center gap-4 mb-3">
                  <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="10" cy="10" r="8" stroke="#4285f4" strokeWidth="2"/>
                    <path d="M6 10l2.5 2.5L14 7" stroke="#4285f4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <div className="text-[17px] font-bold">{item.label}</div>
                </div>
                <div className="text-sm text-[#5a6370] leading-[1.5] pl-9">
                  {item.description}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
