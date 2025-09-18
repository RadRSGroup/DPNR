"use client";
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div style={{ padding: 24, textAlign: 'center' }}>
      <h2>Something went wrong</h2>
      <p style={{ marginTop: 8, opacity: 0.8 }}>{error?.message || 'An unexpected error occurred.'}</p>
      <button
        onClick={() => reset()}
        style={{ marginTop: 16, padding: '8px 12px', border: '1px solid #ddd', borderRadius: 6 }}
      >
        Try again
      </button>
    </div>
  );
}
