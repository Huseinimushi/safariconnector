// src/components/ui/Select.tsx
"use client";
import React from "react";

const base: React.CSSProperties = {
  width: "100%",
  height: 44,
  borderRadius: 12,
  border: "1px solid #E5E7EB",
  background: "#fff",
  padding: "0 12px",
  fontSize: 14,
  outline: "none",
};

export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = ({
  className = "",
  style,
  children,
  ...props
}) => (
  <select
    className={`sc-select ${className}`}
    style={{ ...base, ...style }}
    {...props}
  >
    {children}
  </select>
);
