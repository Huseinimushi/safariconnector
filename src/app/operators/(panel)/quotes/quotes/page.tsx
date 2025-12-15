// src/app/operators/quotes/page.tsx
import { Suspense } from "react";
import OperatorsQuotesClient from "./OperatorsQuotesClient";

export const dynamic = "force-dynamic";

export default function OperatorQuotesPage() {
  return (
    <Suspense
      fallback={
        <main style={{ maxWidth: 1120, margin: "0 auto", padding: "32px 16px 64px" }}>
          <div
            style={{
              borderRadius: 16,
              border: "1px solid #E5E7EB",
              background: "#FFFFFF",
              padding: 14,
              fontSize: 13,
              color: "#6B7280",
            }}
          >
            Loading enquiries & quotes…
          </div>
        </main>
      }
    >
      <OperatorsQuotesClient />
    </Suspense>
  );
}
