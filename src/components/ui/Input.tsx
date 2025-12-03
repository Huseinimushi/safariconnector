// src/components/ui/Input.tsx
"use client";
import React from "react";

const base: React.CSSProperties = {
  width: "100%",
  height: 44,
  borderRadius: 12,
  border: "1px solid #E5E7EB",
  background: "#fff",
  padding: "0 14px",
  fontSize: 14,
  outline: "none",
};

export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = ({
  className = "",
  style,
  ...props
}) => (
  <input
    className={`sc-input ${className}`}
    style={{ ...base, ...style }}
    {...props}
  />
);
