// src/app/admin/(protected)/page.tsx
export default function AdminDashboardPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "32px 24px",
        backgroundColor: "#F4F3ED",
      }}
    >
      <div
        style={{
          maxWidth: 960,
          margin: "0 auto",
          backgroundColor: "#FFFFFF",
          borderRadius: 16,
          padding: "24px 20px",
          border: "1px solid #E5E7EB",
          boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)",
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: 22,
            fontWeight: 800,
            color: "#0B6B3A",
          }}
        >
          Safari Connector Admin
        </h1>
        <p
          style={{
            marginTop: 6,
            fontSize: 14,
            color: "#4B5563",
          }}
        >
          Admin dashboard placeholder. Routing is working; we will plug in the
          real widgets and stats here after we finish stabilizing auth.
        </p>
      </div>
    </main>
  );
}
