// src/app/trust-safety/page.tsx

const BRAND_GREEN = "#0B6B3A";
const BG_SAND = "#F4F3ED";

export const dynamic = "force-dynamic";

export default function TrustSafetyPage() {
  return (
    <div style={{ backgroundColor: BG_SAND, minHeight: "100vh" }}>
      <main
        style={{
          maxWidth: 1000,
          margin: "0 auto",
          padding: "32px 16px 80px",
        }}
      >
        <section style={{ marginBottom: 24 }}>
          <p
            style={{
              margin: 0,
              fontSize: 11,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "#6B7280",
            }}
          >
            Trust &amp; Safety
          </p>
          <h1
            style={{
              margin: 0,
              marginTop: 8,
              fontSize: 30,
              fontWeight: 800,
              color: BRAND_GREEN,
            }}
          >
            How we keep Safari Connector safe
          </h1>
          <p
            style={{
              marginTop: 10,
              fontSize: 14,
              lineHeight: 1.7,
              color: "#374151",
            }}
          >
            Safaris are big, important trips. We take trust seriously – for
            travellers, operators and the communities that host you.
          </p>
        </section>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 16,
            marginBottom: 24,
          }}
        >
          <div style={card}>
            <h2 style={h2}>Operator verification</h2>
            <ul style={list}>
              <li>Basic licence and registration checks where applicable.</li>
              <li>Review of online reputation and references.</li>
              <li>
                Ongoing monitoring of traveller feedback and complaint history.
              </li>
            </ul>
          </div>
          <div style={card}>
            <h2 style={h2}>Secure communication</h2>
            <p style={p}>
              Enquiries are shared only with the operators you choose. We never
              sell your contact details to random third-party marketers.
            </p>
          </div>
          <div style={card}>
            <h2 style={h2}>Responsible content</h2>
            <p style={p}>
              We review trips and photos to discourage unethical wildlife
              practices, off-track driving or disrespectful behaviour towards
              communities and rangers.
            </p>
          </div>
        </section>

        <section style={card}>
          <h2 style={h2}>If something feels wrong</h2>
          <p style={p}>
            If you experience misleading information, unsafe practices or
            unprofessional behaviour from an operator you found on Safari
            Connector, please report it. Include as many details as possible
            (dates, operator name, screenshots, contracts).
          </p>
          <p style={p}>
            Email: <strong>trust@safariconnector.com</strong>
          </p>
        </section>

        <section style={card}>
          <h2 style={h2}>Emergency situations</h2>
          <p style={p}>
            If you are in immediate danger while on safari, contact local
            emergency services and your operator first. After you are safe, let
            us know so we can investigate and take action where appropriate.
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
