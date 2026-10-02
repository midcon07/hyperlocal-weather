// Low-precision moon math (the standard approximations behind SunCalc:
// good to well under a degree and a few minutes, plenty for a dashboard).

const RAD = Math.PI / 180;
const OBLIQUITY = RAD * 23.4397;
const DAY_MS = 86400000;

function daysSinceJ2000(date: Date): number {
  return date.getTime() / DAY_MS - 10957.5;
}

function rightAscension(l: number, b: number) {
  return Math.atan2(Math.sin(l) * Math.cos(OBLIQUITY) - Math.tan(b) * Math.sin(OBLIQUITY), Math.cos(l));
}

function declination(l: number, b: number) {
  return Math.asin(Math.sin(b) * Math.cos(OBLIQUITY) + Math.cos(b) * Math.sin(OBLIQUITY) * Math.sin(l));
}

function moonCoords(d: number) {
  const L = RAD * (218.316 + 13.176396 * d);
  const M = RAD * (134.963 + 13.064993 * d);
  const F = RAD * (93.272 + 13.22935 * d);
  const l = L + RAD * 6.289 * Math.sin(M);
  const b = RAD * 5.128 * Math.sin(F);
  return {
    ra: rightAscension(l, b),
    dec: declination(l, b),
    dist: 385001 - 20905 * Math.cos(M), // km
  };
}

function sunCoords(d: number) {
  const M = RAD * (357.5291 + 0.98560028 * d);
  const C = RAD * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M));
  const L = M + C + RAD * 102.9372 + Math.PI;
  return { ra: rightAscension(L, 0), dec: declination(L, 0) };
}

// Moon's height above the horizon in degrees, including refraction.
export function moonAltitudeDeg(date: Date, latitude: number, longitude: number): number {
  const d = daysSinceJ2000(date);
  const c = moonCoords(d);
  const sidereal = RAD * (280.16 + 360.9856235 * d) + RAD * longitude;
  const H = sidereal - c.ra;
  const phi = RAD * latitude;
  let h = Math.asin(Math.sin(phi) * Math.sin(c.dec) + Math.cos(phi) * Math.cos(c.dec) * Math.cos(H));
  h += (RAD * 0.017) / Math.tan(h + (RAD * 10.26) / (h + RAD * 5.1));
  return h / RAD;
}

export interface MoonPhase {
  /** 0 new, 0.25 first quarter, 0.5 full, 0.75 last quarter. */
  phase: number;
  /** Fraction of the disc that is lit, 0-1. */
  illumination: number;
  name: string;
}

export function moonPhase(date: Date): MoonPhase {
  const d = daysSinceJ2000(date);
  const s = sunCoords(d);
  const m = moonCoords(d);
  const sunDist = 149598000;
  const phi = Math.acos(
    Math.sin(s.dec) * Math.sin(m.dec) + Math.cos(s.dec) * Math.cos(m.dec) * Math.cos(s.ra - m.ra)
  );
  const inc = Math.atan2(sunDist * Math.sin(phi), m.dist - sunDist * Math.cos(phi));
  const angle = Math.atan2(
    Math.cos(s.dec) * Math.sin(s.ra - m.ra),
    Math.sin(s.dec) * Math.cos(m.dec) - Math.cos(s.dec) * Math.sin(m.dec) * Math.cos(s.ra - m.ra)
  );
  const phase = 0.5 + (0.5 * inc * (angle < 0 ? -1 : 1)) / Math.PI;
  return { phase, illumination: (1 + Math.cos(inc)) / 2, name: phaseName(phase) };
}

function phaseName(p: number): string {
  if (p < 0.03 || p >= 0.97) return "New Moon";
  if (p < 0.22) return "Waxing Crescent";
  if (p < 0.28) return "First Quarter";
  if (p < 0.47) return "Waxing Gibbous";
  if (p < 0.53) return "Full Moon";
  if (p < 0.72) return "Waning Gibbous";
  if (p < 0.78) return "Last Quarter";
  return "Waning Crescent";
}

export interface MoonPass {
  rise: Date;
  set: Date;
  /** Whether the moon is above the horizon right now. */
  isUp: boolean;
}

// The moon rise-to-set pass that matters right now: the one in progress if
// the moon is up, otherwise the next one. Null if the moon never rises or
// sets in the search window (not a concern at mid-latitudes).
export function moonPass(date: Date, latitude: number, longitude: number): MoonPass | null {
  const STEP = 10 * 60000;
  const HORIZON = 0.133;
  const start = date.getTime() - 27 * 3600000;
  const end = date.getTime() + 27 * 3600000;
  const up = (t: number) => moonAltitudeDeg(new Date(t), latitude, longitude) > HORIZON;

  const rises: number[] = [];
  const sets: number[] = [];
  let prevT = start;
  let prevUp = up(start);
  for (let t = start + STEP; t <= end; t += STEP) {
    const nowUp = up(t);
    if (nowUp !== prevUp) {
      let lo = prevT;
      let hi = t;
      for (let i = 0; i < 12; i++) {
        const mid = (lo + hi) / 2;
        if (up(mid) === prevUp) lo = mid;
        else hi = mid;
      }
      (nowUp ? rises : sets).push((lo + hi) / 2);
    }
    prevT = t;
    prevUp = nowUp;
  }

  const now = date.getTime();
  const isUp = up(now);
  if (isUp) {
    const rise = [...rises].reverse().find((t) => t <= now);
    const set = sets.find((t) => t > now);
    return rise !== undefined && set !== undefined ? { rise: new Date(rise), set: new Date(set), isUp } : null;
  }
  const rise = rises.find((t) => t > now);
  const set = rise === undefined ? undefined : sets.find((t) => t > rise);
  return rise !== undefined && set !== undefined ? { rise: new Date(rise), set: new Date(set), isUp } : null;
}
