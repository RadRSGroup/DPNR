export default function LotusIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12 21c-3.5-1.4-6-4.3-6-8.2 0-2.7 1.4-4.9 3-6.3-.4 2-.1 4 1.2 5.6-.9-2.2-.6-4.7.9-6.7.7-.9 1.6-1.7 2.9-2.4 1.3.7 2.2 1.5 2.9 2.4 1.5 2 1.8 4.5.9 6.7 1.3-1.6 1.6-3.6 1.2-5.6 1.6 1.4 3 3.6 3 6.3 0 3.9-2.5 6.8-6 8.2-.5.2-1.1.2-1.6 0Z"
        fill="currentColor"
        opacity="0.9"
      />
      <path d="M6 12.8C6 15 7 16.8 8.6 18M18 12.8c0 2.2-1 4-2.6 5.2" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.5" />
    </svg>
  )
}
