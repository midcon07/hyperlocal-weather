import type { LiveSourceState } from "../hooks/useLiveSource";
import type { NwsData, NwsObservation, StationReading } from "../types/weather";

// An NWS station's reading, shaped like the personal station's so the same
// dials can show it. NWS gives metric units (and no daily rain total or UV),
// so those are converted or left empty.

const KMH_TO_MPH = 0.621371;
const PA_TO_INHG = 1 / 3386.389;

const num = (v: number | null | undefined) => (typeof v === "number" && Number.isFinite(v) ? v : null);

export function readingFromObservation(o: NwsObservation): StationReading {
  const tempC = num(o.temperatureC);
  const speed = num(o.windSpeedKmh);
  const gust = num(o.windGustKmh);
  const pressurePa = num(o.seaLevelPressurePa) ?? num(o.barometricPressurePa);
  return {
    timestamp: o.timestamp,
    temperatureF: tempC === null ? null : (tempC * 9) / 5 + 32,
    humidityPct: num(o.relativeHumidity),
    windSpeedMph: speed === null ? null : speed * KMH_TO_MPH,
    windGustMph: gust === null ? null : gust * KMH_TO_MPH,
    windDirectionDeg: num(o.windDirectionDeg),
    rainRateInPerHr: null,
    rainDayIn: num(o.precip24hIn),
    barometricPressureInHg: pressurePa === null ? null : pressurePa * PA_TO_INHG,
    uvIndex: null,
    solarRadiationWm2: null,
  };
}

// The NWS feed re-presented as a "station" feed (same refresh timing, same
// loading and error state).
export function nwsAsStation(nws: LiveSourceState<NwsData>): LiveSourceState<StationReading> {
  const obs = nws.data?.observation ?? null;
  return { ...nws, data: obs ? readingFromObservation(obs) : null };
}

// "DuPage Airport (KDPA), 4 mi away"
export function describeStation(o: NwsObservation | null | undefined): string | null {
  if (!o) return null;
  const name = o.stationName ? `${o.stationName} (${o.stationId})` : o.stationId;
  const distance = typeof o.stationDistanceMi === "number" ? `, ${Math.max(1, Math.round(o.stationDistanceMi))} mi away` : "";
  return `${name}${distance} · National Weather Service`;
}
