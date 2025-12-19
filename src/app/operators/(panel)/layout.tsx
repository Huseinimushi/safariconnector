// src/app/operators/(panel)/layout.tsx

import type { ReactNode } from "react";

type OperatorPanelLayoutProps = {
  children: ReactNode;
};

/**
 * Layout for operator "(panel)" routes only.
 * Haina <html>/<body> kwa sababu hizo zipo kwenye root app/layout.tsx.
 */
export default function OperatorPanelLayout({
  children,
}: OperatorPanelLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-50">
      {children}
    </div>
  );
}
