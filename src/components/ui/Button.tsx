// src/components/ui/Button.tsx
"use client";
import React from "react";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "solid" | "outline" | "ghost";
};

const base: React.CSSProperties = {
  borderRadius: 12,
  padding: "10px 16px",
  fontSize: 14,
  fontWeight: 600,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
  cursor: "pointer",
};

export const Button: React.FC<Props> = ({
  className = "",
  style,
  variant = "solid",
  children,
  ...props
}) => {
  const solid: React.CSSProperties = {
    background: "#0B7A53",
    color: "#fff",
  };
  const outline: React.CSSProperties = {
    background: "#fff",
    color: "#0B7A53",
    border: "1px solid #0B7A53",
  };
  const ghost: React.CSSProperties = {
    background: "transparent",
    color: "#0B7A53",
  };

  const map = { solid, outline, ghost } as const;
  return (
    <button
      className={`sc-btn ${className}`}
      style={{ ...base, ...map[variant], ...style }}
      {...props}
    >
      {children}
    </button>
  );
};
