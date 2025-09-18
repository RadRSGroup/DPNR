"use client";
export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <html>
      <body>
        <div style={{ padding: 24, textAlign: 'center' }}>
          <h2>Application error</h2>
          <p style={{ marginTop: 8, opacity: 0.8 }}>{error?.message || 'Something went wrong.'}</p>
          <button
            onClick={() => reset()}
            style={{ marginTop: 16, padding: '8px 12px', border: '1px solid #ddd', borderRadius: 6 }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
