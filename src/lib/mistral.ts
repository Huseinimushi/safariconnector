// src/lib/mistral.ts
import "server-only";
import { Mistral } from "@mistralai/mistralai";

export const mistral = new Mistral({
  apiKey: process.env.MISTRAL_API_KEY!,
});
