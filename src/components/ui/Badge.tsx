// src/components/ui/Badge.tsx
"use client";
import React from "react";

export const Badge: React.FC<React.HTMLAttributes<HTMLSpanElement>> = ({
  className = "",
  style,
  children,
  ...props
}) => (
  <span
    className={`sc-badge ${className}`}
    style={{
      display: "inline-flex",
      alignItems: "center",
      borderRadius: 999,
      border: "1px solid #E5E7EB",
      background: "#F9FAFB",
      color: "#374151",
      fontSize: 12,
      fontWeight: 600,
      padding: "4px 8px",
      ...style,
    }}
    {...props}
  >
    {children}
  </span>
);
