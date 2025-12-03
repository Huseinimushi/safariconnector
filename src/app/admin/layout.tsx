"use client";

import React from "react";

type Props = {
  children: React.ReactNode;
};

export default function AdminLayout({ children }: Props) {
  // ✅ hakuna tena supabase, hakuna redirect, tunapitisha tu content
  return <>{children}</>;
}
