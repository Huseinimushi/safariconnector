// src/app/operators/[id]/loading.tsx
export default function Loading() {
  return (
    <main style={{ maxWidth: 1120, margin: "0 auto", padding: "16px" }}>
      <div style={{ height: 220, borderRadius: 24, background: "#F3F4F6" }} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 20, marginTop: 20 }}>
        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ height: 160, borderRadius: 16, background: "#F3F4F6" }} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 16 }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} style={{ height: 200, borderRadius: 16, background: "#F3F4F6" }} />
            ))}
          </div>
        </div>
        <div style={{ height: 220, borderRadius: 16, background: "#F3F4F6" }} />
      </div>
    </main>
  );
}
