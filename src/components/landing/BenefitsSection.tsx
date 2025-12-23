const benefits = [
  {
    title: "Resolve critical disagreements",
    description: "Move away from arguing over conclusions to understanding the problem.",
  },
  {
    title: "Derisk Big Bets",
    description: "Stress-test assumptions before engineering writes the first line.",
  },
  {
    title: "More efficient meetings",
    description: "Turn endless discussions or Slack threads into clear argument maps with stakes attached.",
  },
];

export function BenefitsSection() {
  return (
    <section className="px-8 py-20 bg-[#e9f2ff]">
      <div className="mx-auto max-w-[1200px]">
        <div className="mb-6 text-center">
          <div className="inline-block text-sm font-bold uppercase tracking-[0.6px] text-[#4285f4]">
            Benefits
          </div>
        </div>
        <div className="grid gap-6 sm:grid-cols-3">
          {benefits.map((benefit) => (
            <div
              key={benefit.title}
              className="bg-white border border-[#e1e4e8] rounded-xl p-8 shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all hover:shadow-[0_8px_32px_rgba(0,0,0,0.12)] hover:-translate-y-1"
            >
              <h3 className="mb-3 text-lg font-[750] tracking-[-0.2px]">
                {benefit.title}
              </h3>
              <p className="text-[15px] text-[#5a6370] leading-[1.6]">
                {benefit.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
