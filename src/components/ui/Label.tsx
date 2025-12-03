// src/components/ui/Label.tsx
"use client";
import React from "react";
export const Label: React.FC<React.LabelHTMLAttributes<HTMLLabelElement>> = ({
  className = "",
  ...props
}) => <label className={`block text-sm font-medium text-gray-700 ${className}`} {...props} />;
