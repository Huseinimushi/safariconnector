// src/lib/itinerary.ts

/**
 * Removes any leading "Day X", "Day X -", "Day X:", etc.
 * Examples:
 *  - "Day 1 - Arrival in Arusha"  -> "Arrival in Arusha"
 *  - "DAY 02: Lake Manyara"       -> "Lake Manyara"
 *  - "Day 3 Ngorongoro Crater"    -> "Ngorongoro Crater"
 */
export function stripDayPrefix(input: string): string {
  const s = (input || "").trim();

  return s
    .replace(/^day\s*\d+\s*[:\-–—]?\s*/i, "")
    .trim();
}

/**
 * Extra-safe normalization to handle cases like:
 * "Day 1 - Day 1 - Arrival"
 */
export function normalizeItineraryItemTitle(title: string): string {
  let t = stripDayPrefix(title);
  t = stripDayPrefix(t);
  return t.trim();
}

/**
 * Normalizes an itinerary array before saving or rendering.
 * Works with:
 *  - string[]
 *  - { title: string }[]
 *  - mixed legacy formats
 */
export function normalizeItinerary<T extends any>(items: T[]): T[] {
  return (items || []).map((item: any, idx: number) => {
    // If itinerary is just an array of strings
    if (typeof item === "string") {
      return normalizeItineraryItemTitle(item) as any;
    }

    // Object-based itinerary item
    const rawTitle =
      item?.title ??
      item?.name ??
      item?.label ??
      "";

    const cleanTitle = normalizeItineraryItemTitle(String(rawTitle));

    return {
      ...item,
      title: cleanTitle,
      // ensure day_number consistency if used
      day_number: item?.day_number ?? idx + 1,
    };
  });
}
