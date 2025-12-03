"use client";

import React from "react";

type Props = {
  children: React.ReactNode;
};

export default function OperatorsLayout({ children }: Props) {
  // ✅ hakuna check, dashboard na login zote zinaonekana kama kawaida
  return <>{children}</>;
}
