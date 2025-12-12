// src/types/inbox.ts

export type OperatorInboxItem = {
  id: string;
  source: "manual" | "ai";
  operator_id: string;
  trip_id: string | null;
  trip_title: string | null;
  traveller_name: string | null;
  traveller_email: string | null;
  status: string | null;
  created_at: string;       // timestamptz → string kwa frontend
  updated_at: string | null;
};
