// src/app/faqs/page.tsx

const BRAND_GREEN = "#0B6B3A";
const BG_SAND = "#F4F3ED";

export const dynamic = "force-dynamic";

const faqs = [
  {
    q: "Is Safari Connector a tour operator?",
    a: "No. Safari Connector is a marketplace that connects you to licensed local tour operators. They run the safaris; we provide the tools to discover, compare and communicate with them.",
  },
  {
    q: "Do I pay extra by booking through Safari Connector?",
    a: "We aim for transparent, operator-direct pricing. In most cases you pay the same, or very close to the same, as booking with the operator directly.",
  },
  {
    q: "How do I know an operator is trusted?",
    a: "Operators go through a review process where we check licences, references and online reputation. We also monitor traveller feedback and can pause profiles if there are serious issues.",
  },
  {
    q: "Can you help me plan a custom itinerary?",
    a: "Yes. Use the AI Trip Builder or enquiry forms to share your dates, budget and interests. Operators can then suggest tailored itineraries and pricing.",
  },
  {
    q: "Where is Safari Connector based?",
    a: "We operate from East Africa, close to the parks and communities featured on the platform.",
  },
];

export default function Faqs() {
  return (
    <div style={{ backgroundColor: BG_SAND, minHeight: "100vh" }}>
      <main
        style={{
          maxWidth: 900,
          margin: "0 auto",
          padding: "32px 16px 80px",
        }}
      >
        <section style={{ marginBottom: 20 }}>
          <p
            style={{
              margin: 0,
              fontSize: 11,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "#6B7280",
            }}
          >
            FAQs
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
            Frequently asked questions
          </h1>
          <p
            style={{
              marginTop: 10,
              fontSize: 14,
              lineHeight: 1.7,
              color: "#374151",
            }}
          >
            Short answers to the questions we hear most often. If you can&apos;t
            find what you&apos;re looking for, contact us and we&apos;ll be
            happy to help.
          </p>
        </section>

        <section>
          {faqs.map((item) => (
            <details
              key={item.q}
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: 16,
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
      </main>
    </div>
  );
}
