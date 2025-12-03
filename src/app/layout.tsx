// src/app/layout.tsx
import type { Metadata } from "next";
import React from "react";

import { AuthProvider } from "@/components/AuthProvider";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Safari Connector",
  description: "AI powered safari marketplace",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Global stylesheet served from /public */}
        <link rel="stylesheet" href="/sc-globals.css" />
      </head>
      <body>
        {/* 🔐 Global auth (session available every page) */}
        <AuthProvider>
          {/* 🔝 Your existing header/nav */}
          <Nav />

          {/* 📄 Page content */}
          <main>{children}</main>

          {/* 🔚 Your existing footer */}
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
