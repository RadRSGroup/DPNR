import Link from 'next/link'

export default function TermsPage() {
  return (
    <div className="relative min-h-screen max-w-[680px] mx-auto px-5 pb-20">
      <div className="absolute inset-0 bg-gradient-to-b from-[#1a0826] via-[#0d0818] to-[#0a0a0f] -z-10" />

      <div className="pt-14 pb-8">
        <Link href="/signup" className="text-purple-400 text-sm">← Back</Link>
        <p className="text-purple-400 text-xs tracking-widest uppercase mt-6 mb-2">DPNR · Workshop Rooms</p>
        <h1 className="text-white text-2xl font-light">Terms of Use</h1>
        <p className="text-white/30 text-xs mt-2">Effective date: June 2026 · Last updated: June 2026</p>
      </div>

      <div className="prose prose-invert prose-sm max-w-none space-y-8 text-white/70 text-sm leading-relaxed">

        <Section title="1. Acceptance of Terms">
          <p>By creating an account or using Workshop Rooms (&quot;the Service&quot;), you agree to be bound by these Terms of Use and our Privacy & Data Policy. If you do not agree, do not use the Service.</p>
          <p>These terms apply to all users, including free-tier and paid subscribers.</p>
        </Section>

        <Section title="2. Description of Service">
          <p>Workshop Rooms is an AI-assisted personal decision-making application. It guides users through a structured 7-step process to explore, map, and reflect on meaningful decisions. The Service uses OpenAI&apos;s language models to generate reflections, suggestions, and projections based on content you provide.</p>
          <p><strong className="text-white/90">The Service is not a mental health service, therapy, or medical advice platform.</strong> It is a self-reflective tool. If you are in distress, please seek professional support.</p>
        </Section>

        <Section title="3. Eligibility">
          <p>You must be at least 16 years old to use Workshop Rooms. By registering, you confirm that you meet this requirement.</p>
        </Section>

        <Section title="4. User Accounts">
          <ul>
            <li>You are responsible for maintaining the security of your account credentials.</li>
            <li>You agree not to share your account with others.</li>
            <li>You may delete your account at any time from your account settings.</li>
            <li>We reserve the right to suspend or terminate accounts that violate these terms.</li>
          </ul>
        </Section>

        <Section title="5. Subscriptions and Payments">
          <ul>
            <li>Free accounts receive a limited monthly AI token allowance (~3 sessions).</li>
            <li>Paid plans (Core $15/mo, Pro $25/mo) are billed monthly via Grow.</li>
            <li>Subscriptions renew automatically unless cancelled before the renewal date.</li>
            <li>Refunds are handled on a case-by-case basis — contact support within 7 days of a charge.</li>
            <li>Prices are inclusive of applicable VAT where required by law.</li>
          </ul>
        </Section>

        <Section title="6. Content You Provide">
          <p>You retain ownership of all content you submit — your decision narratives, reflections, tags, and journal entries (&quot;User Content&quot;).</p>
          <p>By using the Service, you grant DPNR a limited, non-exclusive licence to process your User Content solely to:</p>
          <ul>
            <li>Deliver the Service features (AI responses, storage, display)</li>
            <li>Generate anonymised, aggregated insights to improve the Service (see Section 7)</li>
          </ul>
          <p>We do not sell your personal content or share identified User Content with third parties.</p>
        </Section>

        <Section title="7. Data Use for Service Improvement">
          <p>To improve Workshop Rooms&apos; AI quality, product design, and user experience, we may analyse usage patterns and content in anonymised, aggregated form. This means:</p>
          <ul>
            <li><strong className="text-white/90">Anonymisation:</strong> Personal identifiers (name, email, account ID) are removed before any analytical use.</li>
            <li><strong className="text-white/90">Aggregation:</strong> Insights are derived from patterns across many users — no individual decision narrative is read or attributed.</li>
            <li><strong className="text-white/90">No profiling:</strong> We do not build individual user profiles for advertising or third-party sale.</li>
            <li><strong className="text-white/90">AI training:</strong> Your content may be used in anonymised form to fine-tune or evaluate our internal AI prompts. We do not share raw User Content with OpenAI for training purposes beyond standard API usage under OpenAI&apos;s data terms.</li>
          </ul>
          <p>You may opt out of anonymised analytical use by contacting us. Opting out does not affect your ability to use the Service.</p>
        </Section>

        <Section title="8. Prohibited Use">
          <p>You agree not to:</p>
          <ul>
            <li>Use the Service to generate harmful, abusive, or illegal content</li>
            <li>Attempt to reverse-engineer, scrape, or extract AI prompts or model outputs at scale</li>
            <li>Resell or redistribute the Service without written permission</li>
            <li>Use automated tools to generate fake decisions or abuse free-tier token limits</li>
          </ul>
        </Section>

        <Section title="9. Disclaimers">
          <ul>
            <li>The Service is provided &quot;as is&quot; without warranties of any kind.</li>
            <li>AI-generated content (reflections, suggestions, projections) is illustrative — it may be inaccurate, incomplete, or not suited to your specific situation. Exercise your own judgement.</li>
            <li>We do not guarantee uptime, data retention, or AI response quality.</li>
          </ul>
        </Section>

        <Section title="10. Limitation of Liability">
          <p>To the maximum extent permitted by applicable law, DPNR shall not be liable for any indirect, incidental, or consequential damages arising from your use of the Service, including any decisions you make based on AI-generated content.</p>
        </Section>

        <Section title="11. Your Data Rights">
          <p>You have the right to:</p>
          <ul>
            <li><strong className="text-white/90">Access & Download:</strong> Export all your data as a JSON file from your account settings at any time.</li>
            <li><strong className="text-white/90">Delete:</strong> Permanently delete your account and all associated data from your account settings. Deletion is irreversible.</li>
            <li><strong className="text-white/90">Correct:</strong> Edit your decisions, tags, and reflections directly within the app.</li>
            <li><strong className="text-white/90">Opt out of analytics:</strong> Contact us to exclude your data from anonymised analysis.</li>
          </ul>
          <p>For requests not handled in-app, email: <span className="text-purple-400">privacy@dpnr.app</span></p>
        </Section>

        <Section title="12. Changes to These Terms">
          <p>We may update these terms. We will notify you by email or in-app banner at least 14 days before material changes take effect. Continued use after that date constitutes acceptance.</p>
        </Section>

        <Section title="13. Governing Law">
          <p>These terms are governed by the laws of the State of Israel. Disputes shall be resolved in the competent courts of Tel Aviv.</p>
        </Section>

        <div className="pt-4 border-t border-white/10">
          <p className="text-white/30 text-xs">Questions? Contact us at <span className="text-purple-400">support@dpnr.app</span></p>
          <div className="flex gap-4 mt-3">
            <Link href="/privacy" className="text-purple-400 text-xs hover:text-purple-300">Privacy & Data Policy →</Link>
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
