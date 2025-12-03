// src/app/privacy/page.tsx
import type { Metadata } from "next";

const BRAND_GREEN = "#0B6B3A";
const BG_SAND = "#F4F3ED";

export const metadata: Metadata = {
  title: "Privacy Policy | Safari Connector",
  description:
    "Understand how Safari Connector collects, uses and protects your personal information when you use our platform.",
};

export const dynamic = "force-dynamic";

export default function PrivacyPage() {
  return (
    <div style={{ backgroundColor: BG_SAND, minHeight: "100vh" }}>
      <main
        style={{
          maxWidth: 920,
          margin: "0 auto",
          padding: "40px 16px 80px",
        }}
      >
        <section
          style={{
            marginBottom: 20,
            padding: "22px 22px 20px",
            borderRadius: 24,
            backgroundColor: "#FFFFFF",
            border: "1px solid #E5E7EB",
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 11,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "#6B7280",
            }}
          >
            Privacy Policy
          </p>
          <h1
            style={{
              margin: "8px 0 8px",
              fontSize: 30,
              fontWeight: 800,
              color: BRAND_GREEN,
            }}
          >
            Your data, handled with care
          </h1>
          <p
            style={{
              margin: 0,
              fontSize: 14,
              lineHeight: 1.7,
              color: "#374151",
            }}
          >
            We believe planning a safari should feel exciting, not risky. This
            page explains – in human language – what we collect, why, and how
            you stay in control.
          </p>
        </section>

        {[
          {
            title: "1. Information we collect",
            body: (
              <ul style={list}>
                <li>
                  <strong>Account details</strong> – name, email and password
                  when you create an account.
                </li>
                <li>
                  <strong>Trip information</strong> – enquiry details such as
                  dates, group size, budget range and notes for operators.
                </li>
                <li>
                  <strong>Usage data</strong> – anonymised analytics (pages
                  viewed, buttons clicked) to help us improve Safari Connector.
                </li>
              </ul>
            ),
          },
          {
            title: "2. How we use your information",
            body: (
              <ul style={list}>
                <li>To connect you with suitable tour operators.</li>
                <li>
                  To send essential emails related to enquiries, bookings or
                  security.
                </li>
                <li>To prevent fraud and keep the platform running smoothly.</li>
              </ul>
            ),
          },
          {
            title: "3. Sharing with operators",
            body: (
              <p style={p}>
                When you send an enquiry or booking request, we share the
                necessary details with the operator(s) you selected so they can
                respond. They agree to use your information only for trip
                planning and to respect local data laws.
              </p>
            ),
          },
          {
            title: "4. Data retention & your rights",
            body: (
              <ul style={list}>
                <li>
                  You can request deletion of your account and associated data,
                  except where we must keep records for legal or security
                  reasons.
                </li>
                <li>
                  You can ask for a copy of the personal data we hold about you.
                </li>
                <li>
                  You can unsubscribe from non-essential marketing emails at any
                  time.
                </li>
              </ul>
            ),
          },
          {
            title: "5. Contact for privacy questions",
            body: (
              <p style={p}>
                For anything related to privacy or data protection, email{" "}
                <strong>privacy@safariconnector.com</strong>. We&apos;ll do our
                best to respond promptly and clearly.
              </p>
            ),
          },
        ].map((sec) => (
          <section
            key={sec.title}
            style={{
              marginBottom: 16,
              padding: "16px 20px",
              borderRadius: 18,
              backgroundColor: "#FFFFFF",
              border: "1px solid #E5E7EB",
            }}
          >
            <h2
              style={{
                margin: "0 0 6px",
                fontSize: 18,
                fontWeight: 700,
                color: "#111827",
              }}
            >
              {sec.title}
            </h2>
            {sec.body}
          </section>
        ))}
      </main>
    </div>
  );
}

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
