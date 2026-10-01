const DIRECTIONS = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];

export function degreesToCompass(deg: number | null): string | null {
  if (deg === null || Number.isNaN(deg)) return null;
  const index = Math.round(((deg % 360) / 22.5)) % 16;
  return DIRECTIONS[index < 0 ? index + 16 : index];
}
