export function celsiusToFahrenheit(c: number | null): number | null {
  return c === null ? null : (c * 9) / 5 + 32;
}

export function fmt(value: number | null | undefined, digits = 1, unit = ""): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${value.toFixed(digits)}${unit}`;
}
