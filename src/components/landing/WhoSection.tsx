export function WhoSection() {
  return (
    <section id="who" className="px-8 py-20">
      <div className="mx-auto max-w-[1200px]">
        <div className="text-center mb-16">
          <div className="inline-block mb-4 text-sm font-bold uppercase tracking-[0.6px] text-[#4285f4]">
            Who {"it's"} for
          </div>
          <h2 className="mb-4 text-[clamp(32px,4vw,48px)] font-[750] tracking-[-0.6px]">
            Built for leaders who need signal
          </h2>
          <p className="mx-auto max-w-[680px] text-lg text-[#5a6370]">
            Product organizations and public institutions share the same problem: high-stakes decisions under pluralism.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="bg-white p-8 rounded-xl border border-[#e1e4e8] shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all hover:shadow-[0_8px_32px_rgba(0,0,0,0.12)] hover:-translate-y-1">
            <div className="mb-5 w-14 h-14 rounded-xl bg-[#4285f4]/10 flex items-center justify-center">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="3" y="6" width="18" height="13" rx="2" stroke="#4285f4" strokeWidth="2"/>
                <path d="M3 9h18" stroke="#4285f4" strokeWidth="2"/>
                <circle cx="8" cy="13" r="1.5" fill="#4285f4"/>
                <circle cx="16" cy="13" r="1.5" fill="#4285f4"/>
              </svg>
            </div>
            <h3 className="mb-3 text-lg font-[750] tracking-[-0.2px]">
              Product & Strategy Leaders
            </h3>
            <p className="mb-3 text-[15px] text-[#5a6370] leading-[1.6]">
              Pressure-test roadmap decisions before momentum locks in.
              Surface hidden assumptions across engineering, design, legal, and GTM.
            </p>
            <p className="text-sm text-[#8f95a1]">
              Create room for serious dissent without undermining execution.
            </p>
          </div>

          <div className="bg-white p-8 rounded-xl border border-[#e1e4e8] shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all hover:shadow-[0_8px_32px_rgba(0,0,0,0.12)] hover:-translate-y-1">
            <div className="mb-5 w-14 h-14 rounded-xl bg-[#34a853]/10 flex items-center justify-center">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="4" y="11" width="16" height="9" rx="1" stroke="#34a853" strokeWidth="2"/>
                <path d="M7 11V8a5 5 0 0110 0v3" stroke="#34a853" strokeWidth="2"/>
                <circle cx="12" cy="15" r="1.5" fill="#34a853"/>
              </svg>
            </div>
            <h3 className="mb-3 text-lg font-[750] tracking-[-0.2px]">
              Public & Civic Decision-makers
            </h3>
            <p className="mb-3 text-[15px] text-[#5a6370] leading-[1.6]">
              Translate stakeholder input into legible objections.
              Surface legitimate risks without amplifying bad-faith dynamics.
            </p>
            <p className="text-sm text-[#8f95a1]">
              Make pluralistic decisions that are transparent and defensible.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
