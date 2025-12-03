// src/app/about/page.tsx
import type { Metadata } from "next";

const BRAND_GREEN = "#0B6B3A";
const BRAND_GOLD = "#D4A017";
const BG_SAND = "#F4F3ED";

export const metadata: Metadata = {
  title: "About Safari Connector | Your Gateway to Authentic Safaris",
  description:
    "Learn how Safari Connector connects global travellers with trusted local safari operators across East Africa.",
};

export const dynamic = "force-dynamic";

export default function AboutPage() {
  return (
    <div style={{ backgroundColor: BG_SAND, minHeight: "100vh" }}>
      <main
        style={{
          maxWidth: 1120,
          margin: "0 auto",
          padding: "40px 16px 80px",
        }}
      >
        {/* HERO */}
        <section
          style={{
            borderRadius: 24,
            padding: "26px 24px 26px",
            background:
              "radial-gradient(circle at top left, rgba(11,107,58,0.12), transparent 60%), #ffffff",
            border: "1px solid #E5E7EB",
            display: "grid",
            gridTemplateColumns: "minmax(0, 2.1fr) minmax(0, 1.3fr)",
            gap: 24,
            marginBottom: 30,
          }}
        >
          <div>
            <p
              style={{
                margin: 0,
                fontSize: 11,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "#6B7280",
              }}
            >
              About Safari Connector
            </p>
            <h1
              style={{
                margin: "8px 0 10px",
                fontSize: 32,
                fontWeight: 800,
                color: BRAND_GREEN,
              }}
            >
              Built in East Africa for travellers everywhere
            </h1>
            <p
              style={{
                margin: 0,
                fontSize: 15,
                lineHeight: 1.7,
                color: "#374151",
              }}
            >
              Safari Connector makes it easy to discover trusted local tour
              operators, compare authentic itineraries and plan your dream
              safari without guesswork. Our team lives close to the parks and
              works daily with operators on the ground.
            </p>
          </div>

          <div
            style={{
              borderRadius: 20,
              backgroundColor: "#022C22",
              color: "white",
              padding: "18px 18px 20px",
              boxShadow: "0 16px 40px rgba(0,0,0,0.22)",
            }}
          >
            <h2
              style={{
                margin: 0,
                marginBottom: 10,
                fontSize: 16,
                fontWeight: 700,
              }}
            >
              Our promise to you
            </h2>
            <ul
              style={{
                margin: 0,
                paddingLeft: 18,
                fontSize: 14,
                lineHeight: 1.7,
              }}
            >
              <li>No pushy sales – just clear information.</li>
              <li>Real local operators, verified by humans.</li>
              <li>Tools that make comparing trips simple and transparent.</li>
            </ul>
          </div>
        </section>

        {/* 3 COLUMNS: HOW IT WORKS */}
        <section style={{ marginBottom: 32 }}>
          <h2
            style={{
              margin: "0 0 14px",
              fontSize: 22,
              fontWeight: 700,
              color: "#111827",
            }}
          >
            How Safari Connector works
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
              gap: 16,
            }}
          >
            {[
              {
                title: "1. Explore trips",
                text: "Browse safaris by parks, budget and style. Each trip card shows clear pricing, duration and what’s included.",
              },
              {
                title: "2. Customise or use AI",
                text: "Use our AI Trip Builder or speak directly with operators to adapt an itinerary to your dates and interests.",
              },
              {
                title: "3. Book with confidence",
                text: "Once you’re happy, you confirm directly with the operator – keeping more of your money in the destination.",
              },
            ].map((b) => (
              <div
                key={b.title}
                style={{
                  backgroundColor: "#FFFFFF",
                  borderRadius: 18,
                  border: "1px solid #E5E7EB",
                  padding: "16px 18px",
                }}
              >
                <h3
                  style={{
                    margin: "0 0 6px",
                    fontSize: 16,
                    fontWeight: 700,
                    color: BRAND_GREEN,
                  }}
                >
                  {b.title}
                </h3>
                <p
                  style={{
                    margin: 0,
                    fontSize: 14,
                    lineHeight: 1.7,
                    color: "#374151",
                  }}
                >
                  {b.text}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* FOR TRAVELLERS & OPERATORS */}
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.3fr) minmax(0, 1.3fr)",
            gap: 18,
            marginBottom: 28,
          }}
        >
          <div
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 18,
              border: "1px solid #E5E7EB",
              padding: "18px 20px",
            }}
          >
            <h2
              style={{
                margin: "0 0 8px",
                fontSize: 18,
                fontWeight: 700,
                color: "#111827",
              }}
            >
              For travellers
            </h2>
            <p
              style={{
                margin: "0 0 8px",
                fontSize: 14,
                lineHeight: 1.7,
                color: "#374151",
              }}
            >
              You get a clear view of routes, lodges and budgets before you
              commit. No more 20 open tabs trying to compare similar safaris.
            </p>
            <ul
              style={{
                margin: 0,
                paddingLeft: 18,
                fontSize: 14,
                color: "#374151",
                lineHeight: 1.7,
              }}
            >
              <li>Compare real itineraries side by side.</li>
              <li>Contact operators without hidden mark-ups.</li>
              <li>Save and tweak trips with our AI tools.</li>
            </ul>
          </div>

          <div
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 18,
              border: "1px solid #E5E7EB",
              padding: "18px 20px",
            }}
          >
            <h2
              style={{
                margin: "0 0 8px",
                fontSize: 18,
                fontWeight: 700,
                color: "#111827",
              }}
            >
              For tour operators
            </h2>
            <p
              style={{
                margin: "0 0 8px",
                fontSize: 14,
                lineHeight: 1.7,
                color: "#374151",
              }}
            >
              We help you reach high-intent travellers who already know what
              they want and understand safari realities.
            </p>
            <ul
              style={{
                margin: 0,
                paddingLeft: 18,
                fontSize: 14,
                color: "#374151",
                lineHeight: 1.7,
              }}
            >
              <li>Showcase your best trips and story.</li>
              <li>Receive structured enquiries straight to your dashboard.</li>
              <li>Respond faster with AI-assisted quoting tools (coming soon).</li>
            </ul>
          </div>
        </section>

        {/* CTA */}
        <section
          style={{
            borderRadius: 20,
            padding: "18px 20px",
            background:
              "linear-gradient(135deg, rgba(11,107,58,0.1), rgba(212,160,23,0.16))",
            border: "1px solid #D1FAE5",
          }}
        >
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: 18,
                  fontWeight: 700,
                  color: "#022C22",
                }}
              >
                Ready to start planning?
              </h2>
              <p
                style={{
                  margin: 0,
                  marginTop: 4,
                  fontSize: 14,
                  color: "#022C22",
                }}
              >
                Browse trips, try the AI Trip Builder or reach out to us for
                guidance – we&apos;re happy to help.
              </p>
            </div>
            <a
              href="/plan"
              style={{
                display: "inline-block",
                padding: "10px 18px",
                borderRadius: 999,
                backgroundColor: BRAND_GOLD,
                color: "#111827",
                fontWeight: 700,
                fontSize: 14,
                textDecoration: "none",
              }}
            >
              Open AI Trip Builder →
            </a>
          </div>
        </section>
      </main>
    </div>
  );
}
