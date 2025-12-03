// src/app/safety/page.tsx
import type { Metadata } from "next";

const BRAND_GREEN = "#0B6B3A";
const BG_SAND = "#F4F3ED";

export const metadata: Metadata = {
  title: "Trust & Safety | Safari Connector",
  description:
    "Learn how Safari Connector vets safari operators, protects your data and responds to safety concerns.",
};

export const dynamic = "force-dynamic";

export default function SafetyPage() {
  return (
    <div style={{ backgroundColor: BG_SAND, minHeight: "100vh" }}>
      <main
        style={{
          maxWidth: 1040,
          margin: "0 auto",
          padding: "40px 16px 80px",
        }}
      >
        {/* HERO */}
        <section
          style={{
            marginBottom: 24,
            padding: "22px 24px 20px",
            borderRadius: 24,
            backgroundColor: "#FFFFFF",
            border: "1px solid #E5E7EB",
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: "0.18em",
              color: "#6B7280",
            }}
          >
            Trust &amp; Safety
          </p>
          <h1
            style={{
              margin: "8px 0 8px",
              fontSize: 30,
              fontWeight: 800,
              color: BRAND_GREEN,
            }}
          >
            Safaris are big trips. Trust matters.
          </h1>
          <p
            style={{
              margin: 0,
              fontSize: 14,
              lineHeight: 1.7,
              color: "#374151",
            }}
          >
            We take a simple approach: be clear about how we vet operators, how
            we protect your information and what to do if something feels wrong.
          </p>
        </section>

        {/* GRID */}
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 16,
            marginBottom: 22,
          }}
        >
          <div style={card}>
            <h2 style={h2}>Operator verification</h2>
            <ul style={list}>
              <li>Check licences and registrations where applicable.</li>
              <li>Review online presence and past traveller feedback.</li>
              <li>Monitor new reviews and complaints over time.</li>
            </ul>
          </div>
          <div style={card}>
            <h2 style={h2}>Safe communication</h2>
            <p style={p}>
              Enquiries are shared only with the operator(s) you select. We
              don&apos;t sell your details to mailing lists or unrelated
              advertisers.
            </p>
          </div>
          <div style={card}>
            <h2 style={h2}>Respect for wildlife & communities</h2>
            <p style={p}>
              We encourage itineraries that respect park rules, wildlife
              distances and local communities. Content that promotes unsafe or
              unethical practices may be removed.
            </p>
          </div>
        </section>

        {/* IF SOMETHING GOES WRONG */}
        <section style={card}>
          <h2 style={h2}>If something feels wrong</h2>
          <p style={p}>
            If you experience misleading information, unsafe practices or
            unprofessional behaviour from an operator found on Safari Connector,
            please tell us. Include dates, operator name, screenshots and any
            booking documents.
          </p>
          <p style={p}>
            Email: <strong>trust@safariconnector.com</strong>
          </p>
        </section>

        {/* EMERGENCY */}
        <section style={{ ...card, marginTop: 16 }}>
          <h2 style={h2}>In case of emergency</h2>
          <p style={p}>
            If you are in immediate danger while on safari, contact local
            emergency services and your tour operator or lodge first. They are
            closest and best placed to act quickly.
          </p>
          <p style={p}>
            Once you are safe, you can share details with Safari Connector so we
            can review the case and, where appropriate, take action on the
            operator&apos;s profile.
          </p>
        </section>
      </main>
    </div>
  );
}

const card: React.CSSProperties = {
  backgroundColor: "#FFFFFF",
  borderRadius: 18,
  border: "1px solid #E5E7EB",
  padding: "16px 18px",
} as const;

const h2: React.CSSProperties = {
  margin: 0,
  marginBottom: 8,
  fontSize: 18,
  fontWeight: 700,
  color: "#111827",
} as const;

const p: React.CSSProperties = {
  margin: 0,
  fontSize: 14,
  color: "#374151",
  lineHeight: 1.7,
} as const;

const list: React.CSSProperties = {
  margin: 0,
  paddingLeft: 18,
  fontSize: 14,
  color: "#374151",
  lineHeight: 1.7,
} as const;
