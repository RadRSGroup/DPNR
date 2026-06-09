'use client'

interface Props {
  onNext: () => void
}

export default function MomentScreen({ onNext }: Props) {
  return (
    <div className="relative min-h-screen max-w-[393px] mx-auto flex flex-col items-center justify-center px-6">
      <div className="absolute inset-0 bg-gradient-to-b from-[#1a0826] via-[#0d0818] to-[#0a0a0f] -z-10" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(120,40,200,0.12)_0%,_transparent_70%)] -z-10" />

      <div className="w-full backdrop-blur-sm bg-white/5 border border-white/15 rounded-3xl px-6 py-10 text-center shadow-2xl">
        <h1 className="text-white text-2xl font-light leading-snug mb-3">
          A moment before<br />We Begin
        </h1>
        <p className="text-white/50 text-sm leading-relaxed mb-10">
          Welcome to the Decision Room, a space where we explore the choices in front of you, deepen your alignment, and help you make decisions that reflect your true self.
        </p>

        <button
          onClick={onNext}
          className="w-full bg-white/90 hover:bg-white active:scale-[0.98] text-[#1a0826] font-medium rounded-2xl py-4 text-base transition-all"
        >
          Make a decision
        </button>
      </div>
    </div>
  )
}
