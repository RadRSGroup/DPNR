import Link from 'next/link'

export default function PrivacyPage() {
  return (
    <div className="relative min-h-screen max-w-[680px] mx-auto px-5 pb-20">
      <div className="absolute inset-0 bg-gradient-to-b from-[#1a0826] via-[#0d0818] to-[#0a0a0f] -z-10" />

      <div className="pt-14 pb-8">
        <Link href="/signup" className="text-purple-400 text-sm">← Back</Link>
        <p className="text-purple-400 text-xs tracking-widest uppercase mt-6 mb-2">DPNR · Decision Room</p>
        <h1 className="text-white text-2xl font-light">Privacy & Data Policy</h1>
        <p className="text-white/30 text-xs mt-2">Effective date: June 2026 · Last updated: June 2026</p>
      </div>

      <div className="space-y-8 text-white/70 text-sm leading-relaxed">

        <Section title="What We Collect">
          <p>When you use Decision Room we collect:</p>
          <ul>
            <li><strong className="text-white/90">Account data:</strong> Email address, hashed password (or OAuth token), and subscription tier.</li>
            <li><strong className="text-white/90">Decision content:</strong> Titles, narratives, option descriptions, emotion maps, tags, projections, journal check-ins, and outcomes — everything you type into the app.</li>
            <li><strong className="text-white/90">Usage data:</strong> AI token consumption per session, step completion events, and timestamps.</li>
            <li><strong className="text-white/90">Payment data:</strong> Subscription status and billing history. Card details are held exclusively by Grow (our payment processor) — we never store raw card numbers.</li>
          </ul>
        </Section>

        <Section title="How We Use Your Data">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-2 pr-4 text-white/50 font-medium">Purpose</th>
                <th className="text-left py-2 text-white/50 font-medium">Legal basis</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {[
                ['Deliver the 7-step decision flow and AI responses', 'Contractual necessity'],
                ['Store and display your decisions and history', 'Contractual necessity'],
                ['Process subscription payments', 'Contractual necessity'],
                ['Anonymised analysis to improve AI prompts and product design', 'Legitimate interest (opt-out available)'],
                ['Aggregate usage reporting (no individual attribution)', 'Legitimate interest'],
                ['Email transactional messages (account confirmation, billing)', 'Contractual necessity'],
              ].map(([purpose, basis]) => (
                <tr key={purpose}>
                  <td className="py-2 pr-4 text-white/60">{purpose}</td>
                  <td className="py-2 text-white/40">{basis}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        <Section title="Anonymised Analysis">
          <p>We use anonymised, aggregated data to understand how people use the app and to improve the AI models and prompts. Specifically:</p>
          <ul>
            <li>All personal identifiers are stripped before analysis.</li>
            <li>We look at patterns — e.g. which lens types are most used, common emotional themes — never at individual narratives.</li>
            <li>Aggregated findings may inform product decisions, published research, or AI model improvements.</li>
            <li>You can opt out by emailing <span className="text-purple-400">privacy@dpnr.app</span> with the subject "Opt out of analytics".</li>
          </ul>
        </Section>

        <Section title="AI Processing">
          <p>Your decision content is sent to OpenAI's API to generate reflections and suggestions. OpenAI processes this data under their <a href="https://openai.com/policies/api-data-usage-policies" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300">API Data Usage Policy</a>, which states that API inputs and outputs are not used to train OpenAI models by default.</p>
          <p>We do not send your email address or account ID to OpenAI — only the decision content needed to generate a response.</p>
        </Section>

        <Section title="Data Sharing">
          <p>We share data only with:</p>
          <ul>
            <li><strong className="text-white/90">Supabase</strong> — database and authentication hosting (EU region)</li>
            <li><strong className="text-white/90">OpenAI</strong> — AI response generation (content only, no PII)</li>
            <li><strong className="text-white/90">Grow</strong> — Israeli payment processing (billing data only)</li>
            <li><strong className="text-white/90">Vercel</strong> — application hosting</li>
          </ul>
          <p>We do not sell personal data to third parties.</p>
        </Section>

        <Section title="Data Retention">
          <ul>
            <li>Your decisions and reflections are retained for as long as your account is active.</li>
            <li>When you delete your account, all personal data is permanently deleted within 30 days.</li>
            <li>Anonymised, aggregated analytics data (no personal identifiers) may be retained indefinitely.</li>
            <li>Payment records are retained for 7 years as required by Israeli accounting law.</li>
          </ul>
        </Section>

        <Section title="Your Rights">
          <p>Under applicable data protection law you have the right to:</p>
          <ul>
            <li><strong className="text-white/90">Access:</strong> See all data we hold about you (use "Download my data" in account settings)</li>
            <li><strong className="text-white/90">Portability:</strong> Export your data as machine-readable JSON</li>
            <li><strong className="text-white/90">Erasure:</strong> Delete your account and all associated data (use "Delete my account" in account settings)</li>
            <li><strong className="text-white/90">Correction:</strong> Edit your decisions and reflections directly in the app</li>
            <li><strong className="text-white/90">Restriction:</strong> Ask us to pause processing while a dispute is resolved</li>
            <li><strong className="text-white/90">Objection:</strong> Opt out of legitimate-interest processing (analytics)</li>
          </ul>
          <p>To exercise rights not covered in-app: <span className="text-purple-400">privacy@dpnr.app</span></p>
        </Section>

        <Section title="Security">
          <p>All data is encrypted in transit (TLS) and at rest. Row-Level Security (RLS) policies in our database ensure each user can only access their own data. Passwords are never stored in plain text.</p>
        </Section>

        <Section title="Cookies">
          <p>We use a single session cookie for authentication (set by Supabase). We do not use tracking or advertising cookies.</p>
        </Section>

        <Section title="Changes">
          <p>We'll notify you by email at least 14 days before any material change to this policy.</p>
        </Section>

        <div className="pt-4 border-t border-white/10">
          <p className="text-white/30 text-xs">Data controller: DPNR Ltd · Tel Aviv, Israel · <span className="text-purple-400">privacy@dpnr.app</span></p>
          <div className="flex gap-4 mt-3">
            <Link href="/terms" className="text-purple-400 text-xs hover:text-purple-300">Terms of Use →</Link>
            <Link href="/account" className="text-purple-400 text-xs hover:text-purple-300">Account Settings →</Link>
          </div>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h2 className="text-white text-base font-medium">{title}</h2>
      <div className="space-y-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_li]:text-white/70">{children}</div>
    </div>
  )
}
