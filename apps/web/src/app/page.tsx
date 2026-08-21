import Link from "next/link";

export default function Home() {
  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center px-6 overflow-hidden">
      {/* Background — replace with galaxy/neural image from Figma */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#1a0a2e] via-[#0a0a1f] to-[#0a0a0f] -z-10" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(120,40,200,0.15)_0%,_transparent_70%)] -z-10" />

      <div className="max-w-sm w-full text-center space-y-8">
        <div className="space-y-2">
          <p className="text-purple-400 text-sm tracking-widest uppercase">DPNR</p>
          <h1 className="text-4xl font-light text-white">Workshop Rooms</h1>
          <p className="text-white/50 text-base mt-3">
            Map your decision.<br />Hear yourself clearly.
          </p>
        </div>

        <div className="space-y-3">
          <Link
            href="/dashboard"
            className="block w-full bg-purple-600 hover:bg-purple-500 text-white rounded-2xl py-4 text-base font-medium transition-colors"
          >
            Start a Decision
          </Link>
          <Link
            href="/login"
            className="block w-full border border-white/20 hover:border-white/40 text-white/70 hover:text-white rounded-2xl py-4 text-base transition-colors"
          >
            Sign In
          </Link>
        </div>

        <p className="text-white/30 text-xs">~25 minutes · Private · AI-assisted</p>
      </div>
    </main>
  );
}
