"use client";
import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { RatingStars } from "@/components/RatingStars";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import QuoteModal from "@/components/QuoteModal"; // ✅ IMPORTANT
import type { Operator } from "@/types/operators";

export function OperatorCard({ op }: { op: Operator }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        border: "1px solid #E5E7EB",
        borderRadius: 16,
        background: "#fff",
        overflow: "hidden",
        boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        transition: "all 0.25s ease",
      }}
    >
      {/* Cover */}
      <div style={{ position: "relative", height: 112, background: "#F3F4F6" }}>
        {op.cover_url && (
          <Image
            src={op.cover_url}
            alt={op.name}
            fill
            className="object-cover"
          />
        )}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg,rgba(0,0,0,.08),rgba(0,0,0,.25))",
          }}
        />
      </div>

      {/* Header */}
      <div style={{ position: "relative", padding: "0 16px" }}>
        {/* Logo absolute */}
        <div
          style={{
            position: "absolute",
            top: -24,
            left: 16,
            height: 64,
            width: 64,
            borderRadius: 16,
            overflow: "hidden",
            border: "4px solid #fff",
            background: "#fff",
            zIndex: 2,
            boxShadow: "0 2px 6px rgba(0,0,0,0.06)",
          }}
        >
          {op.logo_url ? (
            <Image
              src={op.logo_url}
              alt={`${op.name} logo`}
              fill
              className="object-contain p-2"
            />
          ) : (
            <div
              style={{
                height: "100%",
                display: "grid",
                placeItems: "center",
                color: "#9CA3AF",
                fontSize: 12,
              }}
            >
              —
            </div>
          )}
        </div>

        {/* Name */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingTop: 52,
            position: "relative",
            zIndex: 1,
          }}
        >
          <Link
            href={`/operators/${op.id}`}
            style={{ textDecoration: "none", flex: 1 }}
          >
            <h3
              style={{
                margin: 0,
                fontSize: 16,
                fontWeight: 800,
                color: "#0a2e24",
                lineHeight: "1.3em",
                wordWrap: "break-word",
                overflowWrap: "break-word",
              }}
            >
              {op.name}
            </h3>
          </Link>

          {op.verified && (
            <span
              style={{
                background: "#D6EFE5",
                color: "#0B7A53",
                fontSize: 12,
                fontWeight: 700,
                padding: "4px 8px",
                borderRadius: 999,
                flexShrink: 0,
              }}
            >
              Verified
            </span>
          )}
        </div>

        {/* Location */}
        <div
          style={{
            marginTop: 2,
            fontSize: 12,
            color: "#4B5563",
          }}
        >
          {op.city ? `${op.city}, ` : ""}
          {op.country ?? ""}
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: 16, flexGrow: 1 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <RatingStars value={op.rating_avg ?? 0} />
            <span style={{ fontSize: 12, color: "#6B7280" }}>
              ({op.rating_count ?? 0})
            </span>
          </div>
          <span style={{ fontSize: 12, color: "#6B7280" }}>
            {op.trips_count ?? 0} trips
          </span>
        </div>

        {op.short_bio && (
          <p
            style={{
              marginTop: 8,
              marginBottom: 0,
              fontSize: 14,
              color: "#374151",
              lineHeight: 1.5,
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {op.short_bio}
          </p>
        )}

        {op.specializations && op.specializations.length > 0 && (
          <div
            style={{
              marginTop: 10,
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            {op.specializations.slice(0, 4).map((tag: string) => (
              <Badge key={tag}>{tag}</Badge>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          borderTop: "1px solid #E5E7EB",
          padding: "10px 12px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 8,
          marginTop: "auto",
        }}
      >
        <Button
          onClick={() => setOpen(true)}
          style={{
            padding: "8px 12px",
            borderRadius: 10,
            fontSize: 13,
            background: "#0B7A53",
          }}
        >
          Request Quote
        </Button>

        <Link
          href={`/trips?operatorId=${encodeURIComponent(op.id)}`}
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: "#0B7A53",
            textDecoration: "none",
          }}
        >
          View Trips →
        </Link>
      </div>

      {/* Quote Modal */}
      <QuoteModal
        open={open}
        onClose={() => setOpen(false)}
        operator={{ id: op.id, name: op.name }}
        sourcePage="operators"
      />
    </div>
  );
}
