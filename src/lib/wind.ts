export interface WindCategory {
  label: string;
  level: 0 | 1 | 2 | 3 | 4 | 5;
}

// Simplified Beaufort-style bands; `level` drives the mast's color in CSS.
export function windCategory(speedMph: number | null): WindCategory {
  const s = speedMph ?? 0;
  if (s < 1) return { label: "Calm", level: 0 };
  if (s < 8) return { label: "Light", level: 1 };
  if (s < 15) return { label: "Breezy", level: 2 };
  if (s < 25) return { label: "Windy", level: 3 };
  if (s < 39) return { label: "Strong", level: 4 };
  return { label: "Gale", level: 5 };
}

// The 10-minute high only means something when it's meaningfully above
// the current reading.
export function hasGust(speedMph: number | null, gustMph: number | null | undefined): boolean {
  if (gustMph == null) return false;
  return gustMph >= 5 && Math.round(gustMph) > Math.round(speedMph ?? 0);
}

// Gusty enough to pulse the mast: a sizeable swing above the current speed.
export function isGusty(speedMph: number | null, gustMph: number | null | undefined): boolean {
  return hasGust(speedMph, gustMph) && (gustMph as number) >= 15 && (gustMph as number) - (speedMph ?? 0) >= 5;
}

// Meter scale for the little speed/gust bar.
export const WIND_METER_MAX_MPH = 40;

export function windMeterFraction(mph: number | null | undefined): number {
  if (mph == null || mph <= 0) return 0;
  return Math.min(mph, WIND_METER_MAX_MPH) / WIND_METER_MAX_MPH;
}
