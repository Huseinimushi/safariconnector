// src/app/contact/page.tsx
import type { Metadata } from "next";

const BRAND_GREEN = "#0B6B3A";
const BG_SAND = "#F4F3ED";

export const metadata: Metadata = {
  title: "Contact Safari Connector | Get Help with Your Safari Plans",
  description:
    "Contact the Safari Connector team for help with trip planning, bookings, or operator support.",
};

export const dynamic = "force-dynamic";

export default function ContactPage() {
  return (
    <div style={{ backgroundColor: BG_SAND, minHeight: "100vh" }}>
      <main
        style={{
          maxWidth: 960,
          margin: "0 auto",
          padding: "40px 16px 80px",
        }}
      >
        {/* HERO */}
        <section
          style={{
            marginBottom: 26,
            borderRadius: 24,
            padding: "22px 24px 20px",
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
            Contact
          </p>
          <h1
            style={{
              margin: "8px 0 8px",
              fontSize: 30,
              fontWeight: 800,
              color: BRAND_GREEN,
            }}
          >
            Let&apos;s talk about your safari
          </h1>
          <p
            style={{
              margin: 0,
              fontSize: 14,
              lineHeight: 1.7,
              color: "#374151",
            }}
          >
            Share a bit about what you need – a quick question, help with a
            trip, or feedback on the platform. A real human from our team will
            read your message and reply.
          </p>
        </section>

        {/* GRID */}
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1fr)",
            gap: 18,
          }}
        >
          {/* FORM (static – hook to API later) */}
          <div
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 20,
              border: "1px solid #E5E7EB",
              padding: "18px 20px 20px",
            }}
          >
            <h2
              style={{
                margin: "0 0 10px",
                fontSize: 18,
                fontWeight: 700,
                color: "#111827",
              }}
            >
              Send us a message
            </h2>
            <form
              method="post"
              action="/api/contact" // placeholder endpoint
              style={{ display: "grid", gap: 10, marginTop: 4 }}
            >
              <input
                name="name"
                placeholder="Full name"
                required
                style={input}
              />
              <input
                name="email"
                type="email"
                placeholder="Email"
                required
                style={input}
              />
              <input
                name="subject"
                placeholder="Subject (e.g. Kilimanjaro in July)"
                required
                style={input}
              />
              <textarea
                name="message"
                rows={5}
                placeholder="Tell us about your plans, dates, group size and budget…"
                style={{ ...input, resize: "vertical" }}
              />

              <button type="submit" style={btn}>
                Send message
              </button>

              <p
                style={{
                  margin: 0,
                  marginTop: 4,
                  fontSize: 11,
                  color: "#6B7280",
                }}
              >
                We only use these details to respond to your enquiry. For urgent
                booking issues, mention your booking reference.
              </p>
            </form>
          </div>

          {/* CONTACT INFO */}
          <aside
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 20,
              border: "1px solid #E5E7EB",
              padding: "18px 20px",
            }}
          >
            <h2
              style={{
                margin: "0 0 10px",
                fontSize: 18,
                fontWeight: 700,
                color: "#111827",
              }}
            >
              Quick contact details
            </h2>
            <div
              style={{
                fontSize: 14,
                lineHeight: 1.8,
                color: "#374151",
              }}
            >
              <p style={{ margin: "4px 0" }}>
                📧 <strong>Email:</strong> info@safariconnector.com
              </p>
              <p style={{ margin: "4px 0" }}>
                💬 <strong>WhatsApp:</strong> +255 686 032 307
              </p>
              <p style={{ margin: "8px 0" }}>
                🕒 <strong>Hours:</strong> Mon – Sat, 08:00 – 18:00 (EAT)
              </p>
              <p style={{ margin: "8px 0" }}>
                Outside those hours we still monitor for urgent messages from
                guests currently on safari.
              </p>
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}

const input: React.CSSProperties = {
  width: "100%",
  borderRadius: 10,
  border: "1px solid #E5E7EB",
  padding: "9px 11px",
  fontSize: 14,
  backgroundColor: "#FFFFFF",
} as const;

const btn: React.CSSProperties = {
  border: "none",
  borderRadius: 999,
  padding: "10px 18px",
  backgroundColor: BRAND_GREEN,
  color: "#FFFFFF",
  fontWeight: 700,
  fontSize: 14,
  cursor: "pointer",
} as const;
