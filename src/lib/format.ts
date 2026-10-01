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
