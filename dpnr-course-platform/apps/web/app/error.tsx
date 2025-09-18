'use client';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="p-8 max-w-3xl mx-auto text-center">
      <h2 className="text-xl font-semibold">Something went wrong</h2>
      <p className="mt-2 text-muted-foreground">{error?.message || 'An unexpected error occurred.'}</p>
      <button className="mt-6 px-4 py-2 rounded border" onClick={() => reset()}>Try again</button>
    </div>
  );
}

