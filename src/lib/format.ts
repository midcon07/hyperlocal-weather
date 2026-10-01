export function celsiusToFahrenheit(c: number | null): number | null {
  return c === null ? null : (c * 9) / 5 + 32;
}

export function fmt(value: number | null | undefined, digits = 1, unit = ""): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${value.toFixed(digits)}${unit}`;
}

// Rough local-time heuristic (no sunrise/sunset lookup) for picking a sun
// vs. moon icon variant when a reading doesn't carry its own day/night flag.
export function isLikelyDaytime(date: Date): boolean {
  const hour = date.getHours();
  return hour >= 6 && hour < 20;
}

// Short relative time for compact UI ("just now", "2m ago") rather than a
// full clock timestamp.
export function relativeTimeFromNow(date: Date): string {
  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 45) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  return `${hours}h ago`;
}
