const steps = [
  {
    number: 1,
    title: "Frame the decision",
    description: "Write the proposal, success criteria, and irreversibility horizon in plain language.",
    color: "bg-[#4285f4]/10",
  },
  {
    number: 2,
    title: "Raise objections",
    description: "What might break, under what conditions, and why the downside matters.",
    color: "bg-[#34a853]/10",
  },
  {
    number: 3,
    title: "Commit to concerns",
    description: "Serious objections persist. Low-effort noise doesn't dominate. Signal becomes visible.",
    color: "bg-[#ff9466]/15",
  },
  {
    number: 4,
    title: "Decide informed",
    description: "See where disagreement lies, what's load-bearing, and what was resolved (or accepted as risk).",
    color: "bg-[#ea4c89]/10",
  },
];

export function ProcessSection() {
  return (
    <section id="how" className="px-8 py-20">
      <div className="mx-auto max-w-[1200px]">
        <div className="text-center mb-16">
          <div className="inline-block mb-4 text-sm font-bold uppercase tracking-[0.6px] text-[#4285f4]">
            The process
          </div>
          <h2 className="mb-4 text-[clamp(32px,4vw,48px)] font-[750] tracking-[-0.6px]">
            Four steps to clarity
          </h2>
          <p className="mx-auto max-w-[680px] text-lg text-[#5a6370]">
            The goal {"isn't"} more debate. {"It's"} a clearer map of what could go wrong - while {"it's"} still actionable.
          </p>
        </div>

        <div className="bg-white border border-[#e1e4e8] rounded-2xl p-12 shadow-[0_4px_16px_rgba(0,0,0,0.08)] max-w-[900px] mx-auto">
          <div className="space-y-8">
            {steps.map((step, index) => (
              <div key={step.number}>
                <div className="grid grid-cols-[60px_1fr] gap-5 items-start">
                  <div className={`w-14 h-14 rounded-[14px] ${step.color} flex items-center justify-center text-[22px] font-bold`}>
                    {step.number}
                  </div>
                  <div>
                    <h3 className="mb-2 text-[19px] font-[750] tracking-[-0.2px]">
                      {step.title}
                    </h3>
                    <p className="text-[#5a6370] text-[15px] leading-[1.6]">
                      {step.description}
                    </p>
                  </div>
                </div>
                {index < steps.length - 1 && <div className="mt-8 h-px bg-[#e1e4e8]"></div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
