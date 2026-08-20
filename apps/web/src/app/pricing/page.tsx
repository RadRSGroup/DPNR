'use client'
import Link from 'next/link'

const TIERS = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    period: '',
    tokens: '15,000',
    sessions: '~7',
    features: ['~7 AI-guided decisions/mo', 'Full 7-step flow', 'Basic history'],
    cta: null,
    highlight: false,
  },
  {
    id: 'core',
    name: 'Core',
    price: '$15',
    period: '/mo',
    tokens: '150,000',
    sessions: '~55',
    features: ['~55 AI-guided decisions/mo', 'Full 7-step flow', 'Full history', 'Priority AI response'],
    cta: 'Upgrade to Core',
    highlight: true,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$25',
    period: '/mo',
    tokens: '400,000',
    sessions: 'Unlimited',
    features: ['Unlimited AI-guided decisions', 'Full 7-step flow', 'Full history', 'Priority AI response', 'Early access to new features'],
    cta: 'Upgrade to Pro',
    highlight: false,
  },
]

export default function PricingPage() {
  return (
    <div className="relative min-h-screen max-w-[393px] mx-auto px-5 pb-16">
      <div className="absolute inset-0 bg-gradient-to-b from-[#1a0826] via-[#0d0818] to-[#0a0a0f] -z-10" />

      <div className="pt-14 pb-8">
        <Link href="/dashboard" className="text-purple-400 text-sm">← Back</Link>
        <h1 className="text-white text-2xl font-light mt-6">Choose your plan</h1>
        <p className="text-white/40 text-sm mt-2">Billed monthly in Israeli Shekel (ILS)</p>
      </div>

      <div className="mb-5 bg-purple-900/20 border border-purple-700/30 rounded-2xl px-4 py-3">
        <p className="text-purple-300 text-sm">Paid plans are coming soon during Beta — everyone is on Free for now.</p>
      </div>

      <div className="space-y-4">
        {TIERS.map(tier => (
          <div
            key={tier.id}
            className={`rounded-3xl p-5 border transition-all ${
              tier.highlight
                ? 'bg-purple-900/30 border-purple-500/50'
                : 'bg-white/5 border-white/10'
            }`}
          >
            {tier.highlight && (
              <div className="mb-3">
                <span className="text-xs bg-purple-600 text-white px-2.5 py-1 rounded-full font-medium">Most popular</span>
              </div>
            )}
            <div className="flex items-end justify-between mb-4">
              <div>
                <h2 className="text-white font-medium text-lg">{tier.name}</h2>
                <p className="text-white/40 text-xs mt-0.5">{tier.tokens} tokens · {tier.sessions} decisions/mo</p>
              </div>
              <div className="text-right">
                <span className="text-white text-2xl font-light">{tier.price}</span>
                <span className="text-white/40 text-sm">{tier.period}</span>
              </div>
            </div>

            <ul className="space-y-2 mb-5">
              {tier.features.map(f => (
                <li key={f} className="flex items-center gap-2 text-sm text-white/60">
                  <span className="text-purple-400 text-xs">✓</span>
                  {f}
                </li>
              ))}
            </ul>

            {tier.cta ? (
              <button
                disabled
                className="w-full rounded-2xl px-5 py-3.5 text-sm font-medium bg-white/5 text-white/30 cursor-not-allowed"
              >
                Coming soon
              </button>
            ) : (
              <div className="w-full rounded-2xl px-5 py-3.5 text-sm text-white/30 text-center bg-white/5">
                Current plan
              </div>
            )}
          </div>
        ))}
      </div>

      <p className="text-center text-white/20 text-xs mt-8">
        We&apos;ll email everyone when paid plans open up.
      </p>
    </div>
  )
}
