// src/components/RatingStars.tsx
"use client";
import React from "react";
import { Star } from "lucide-react";

export function RatingStars({ value = 0, size = 16 }: { value?: number; size?: number }) {
  const full = Math.floor(value ?? 0);
  const half = (value ?? 0) - full >= 0.5;
  return (
    <div style={{ display: "flex", gap: 4 }}>
      {Array.from({ length: 5 }).map((_, i) => {
        const filled = i < full || (i === full && half);
        return (
          <Star
            key={i}
            size={size}
            className={filled ? "" : "text-gray-300"}
            style={filled ? { color: "#F4A01C", fill: "#F4A01C" } : { color: "#D1D5DB" }}
          />
        );
      })}
    </div>
  );
}
