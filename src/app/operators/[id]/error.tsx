"use client";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: 24 }}>
      <div style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 16, padding: 20 }}>
        <h2 style={{ margin: 0 }}>Something went wrong</h2>
        <p style={{ color: "#6B7280" }}>{error.message}</p>
        <button onClick={reset} style={{ marginTop: 12, padding: "8px 12px", borderRadius: 8, border: "1px solid #0B7A53", color: "#0B7A53", background: "#fff", fontWeight: 700 }}>
          Try again
        </button>
      </div>
    </main>
  );
}
