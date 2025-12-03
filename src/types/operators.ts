// src/types/operators.ts

export type Operator = {
  id: string;
  name: string;
  country?: string | null;
  city?: string | null;
  rating_avg?: number | null;
  rating_count?: number | null;
  trips_count?: number | null;
  cover_url?: string | null;
  logo_url?: string | null;
  verified?: boolean | null;
  short_bio?: string | null;
  specializations?: string[]; // tags like "Kilimanjaro", "Family Safaris"
};
