const steps = [
  {
    number: 1,
    title: "Set the question",
    description: "Write the proposal, success criteria, and irreversibility horizon in plain language.",
    color: "bg-[#4285f4]/10",
  },
  {
    number: 2,
    title: "Invite your team",
    description: "What might break, under what conditions, and why the downside matters.",
    color: "bg-[#34a853]/10",
  },
  {
    number: 3,
    title: "Add considerations",
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
    <section id="process" className="px-8 py-20">
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

        <div className="bg-white border border-[#e1e4e8] rounded-2xl px-10 py-8 shadow-[0_4px_16px_rgba(0,0,0,0.08)] max-w-[760px] mx-auto">
          <div className="space-y-6">
            {steps.map((step, index) => (
              <div key={step.number}>
                <div className="grid grid-cols-[52px_1fr] gap-4 items-center">
                  <div className={`w-12 h-12 rounded-[12px] ${step.color} flex items-center justify-center text-[20px] font-bold`}>
                    {step.number}
                  </div>
                  <div>
                    <h3 className="text-[19px] font-[750] tracking-[-0.2px] leading-tight">
                      {step.title}
                    </h3>
                  </div>
                </div>
                {index < steps.length - 1 && <div className="mt-6 h-px bg-[#e1e4e8]"></div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
