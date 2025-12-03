// src/components/ui/Textarea.tsx
"use client";

import * as React from "react";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={
        "w-full min-h-[100px] rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm placeholder-gray-400 focus:border-green-700 focus:ring-1 focus:ring-green-700 focus:outline-none transition " +
        (className ?? "")
      }
      {...props}
    />
  )
);

Textarea.displayName = "Textarea";
