// src/app/faq/page.tsx
import type { Metadata } from "next";

const BRAND_GREEN = "#0B6B3A";
const BG_SAND = "#F4F3ED";

export const metadata: Metadata = {
  title: "Safari Connector FAQs | Answers to Common Questions",
  description:
    "Find answers to the most common questions about using Safari Connector, booking safaris and working with local tour operators.",
};

export const dynamic = "force-dynamic";

const faqItems = [
  {
    q: "Is Safari Connector a tour operator?",
    a: "No, Safari Connector is a marketplace. We connect you to vetted local tour operators who design and run the safaris. You communicate and confirm directly with them.",
  },
  {
    q: "Do I pay extra by using Safari Connector?",
    a: "Our goal is operator-direct pricing. In most cases you pay the same (or very close) as booking with the operator directly, while gaining tools that make research and comparison easier.",
  },
  {
    q: "How are operators vetted?",
    a: "We review licences where applicable, check online reputation and speak to operators before they go live. We also monitor traveller feedback and may pause profiles if serious issues appear.",
  },
  {
    q: "Can you help me create a custom itinerary?",
    a: "Yes. You can use the AI Trip Builder to design a starting itinerary and then send it as an enquiry, or simply describe your dream trip in a quote request and operators will respond with ideas.",
  },
  {
    q: "What if I have a problem during my safari?",
    a: "First contact your operator or guide—they are on the ground. If you still need help, contact Safari Connector support with as many details as possible so we can investigate.",
  },
];

export default function FaqPage() {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  };

  return (
    <div style={{ backgroundColor: BG_SAND, minHeight: "100vh" }}>
      <main
        style={{
          maxWidth: 920,
          margin: "0 auto",
          padding: "40px 16px 80px",
        }}
      >
        {/* JSON-LD for SEO */}
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />

        {/* HERO */}
        <section
          style={{
            marginBottom: 22,
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
              textTransform: "uppercase",
              letterSpacing: "0.18em",
              color: "#6B7280",
            }}
          >
            FAQs
          </p>
          <h1
            style={{
              margin: "8px 0 8px",
              fontSize: 30,
              fontWeight: 800,
              color: BRAND_GREEN,
            }}
          >
            Frequently asked questions
          </h1>
          <p
            style={{
              margin: 0,
              fontSize: 14,
              lineHeight: 1.7,
              color: "#374151",
            }}
          >
            Quick answers to the most common questions about Safari Connector,
            safaris and working with local operators.
          </p>
        </section>

        {/* FAQ LIST */}
        <section>
          {faqItems.map((item) => (
            <details
              key={item.q}
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: 18,
                border: "1px solid #E5E7EB",
                padding: "10px 16px",
                marginBottom: 10,
              }}
            >
              <summary
                style={{
                  cursor: "pointer",
                  listStyle: "none",
                  fontWeight: 600,
                  color: "#111827",
                  fontSize: 14,
                }}
              >
                {item.q}
              </summary>
              <p
                style={{
                  marginTop: 8,
                  marginBottom: 4,
                  fontSize: 14,
                  lineHeight: 1.7,
                  color: "#374151",
                }}
              >
                {item.a}
              </p>
            </details>
          ))}
        </section>

        {/* CTA */}
        <section
          style={{
            marginTop: 24,
            borderRadius: 18,
            padding: "16px 18px",
            background:
              "linear-gradient(135deg, rgba(11,107,58,0.12), rgba(11,107,58,0.02))",
            border: "1px solid #D1FAE5",
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 14,
              color: "#022C22",
            }}
          >
            Still not sure?{" "}
            <a
              href="/contact"
              style={{
                color: "#022C22",
                fontWeight: 600,
                textDecoration: "underline",
              }}
            >
              Send us a quick message
            </a>{" "}
            and we&apos;ll help you figure it out.
          </p>
        </section>
      </main>
    </div>
  );
}
