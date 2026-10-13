// Fetches forecast/observation data directly from api.weather.gov in the
// browser (no API key needed, and NWS's API allows cross-origin requests).
// This bypasses the GitHub Actions pipeline entirely, so it can refresh as
// often as we like without waiting on Actions' ~5 minute cron floor.

import { milesBetween } from "../lib/geo";
import type { NwsAlert, NwsData } from "../types/weather";

// If the browser can't reach api.weather.gov itself (blocked, offline route,
// odd network), ask our Worker to make the same request, and keep using it
// for the rest of the visit.
let useProxy = false;

export async function fetchNws(url: string): Promise<Response> {
  const proxyUrl = import.meta.env.VITE_WEATHERLINK_PROXY_URL;
  const viaProxy = () => {
    const p = new URL("/nws", proxyUrl);
    p.searchParams.set("u", url);
    return fetch(p);
  };
  if (proxyUrl && useProxy) return viaProxy();
  try {
    return await fetch(url, { headers: { Accept: "application/geo+json" } });
  } catch (err) {
    if (!proxyUrl) throw err;
    useProxy = true;
    return viaProxy();
  }
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetchNws(url);
  if (!res.ok) {
    throw new Error(`NWS request failed: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

interface NwsPointResponse {
  properties: {
    gridId: string;
    gridX: number;
    gridY: number;
    forecast: string;
    forecastHourly: string;
    observationStations: string;
  };
}

interface NwsForecastResponse {
  properties: { periods: Array<Record<string, any>> };
}

interface NwsStationsResponse {
  features: Array<{
    id: string;
    geometry?: { coordinates?: [number, number] };
    properties?: { stationIdentifier?: string; name?: string };
  }>;
}
interface NwsAlertsResponse {
  features: Array<{
    properties: {
      id: string;
      event: string;
      headline: string | null;
      description: string;
      severity: string;
      urgency: string;
      areaDesc: string;
      effective: string;
      expires: string;
      messageType: string;
    };
  }>;
}

// A station's reading is only worth showing if it is this recent.
const MAX_OBSERVATION_AGE_MS = 3 * 60 * 60 * 1000;
// How many of the nearest stations to try before giving up on a reading.
const STATIONS_TO_TRY = 6;

// Rain over the last 24 hours from a station's hourly reports (NWS stations
// do not publish a daily total). Hours with no report count as dry, which is
// how weather stations report no rain. Null if the history cannot be read.
async function rainLast24Hours(stationUrl: string): Promise<number | null> {
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const data = await getJson<{ features?: Array<{ properties?: { precipitationLastHour?: { value?: number | null } } }> }>(
      `${stationUrl}/observations?start=${encodeURIComponent(since)}&limit=60`
    );
    if (!data.features?.length) return null;
    const mm = data.features.reduce((sum, f) => sum + (f.properties?.precipitationLastHour?.value ?? 0), 0);
    return Math.round((mm / 25.4) * 100) / 100;
  } catch {
    return null;
  }
}

// Forecast, hourly forecast and the latest reading from the nearest station
// that is actually reporting, for any point in the US. Stations come back
// from NWS in rough order of distance; we rank them ourselves, skip any whose
// latest reading is missing or stale, and note how far away the one we use is.
export async function fetchNwsLive(latitude: number, longitude: number): Promise<NwsData> {
  const point = await getJson<NwsPointResponse>(
    `https://api.weather.gov/points/${latitude.toFixed(4)},${longitude.toFixed(4)}`
  );

  const [forecast, hourly, stations] = await Promise.all([
    getJson<NwsForecastResponse>(point.properties.forecast),
    getJson<NwsForecastResponse>(point.properties.forecastHourly),
    getJson<NwsStationsResponse>(point.properties.observationStations),
  ]);

  const ranked = (stations.features ?? [])
    .map((f) => {
      const [lon, lat] = f.geometry?.coordinates ?? [NaN, NaN];
      return {
        url: f.id,
        id: f.properties?.stationIdentifier ?? f.id.split("/").pop() ?? "",
        name: f.properties?.name ?? null,
        miles: Number.isFinite(lat) && Number.isFinite(lon) ? milesBetween(latitude, longitude, lat, lon) : null,
      };
    })
    .sort((a, b) => (a.miles ?? 1e9) - (b.miles ?? 1e9));

  let observation: NwsData["observation"] = null;
  for (const station of ranked.slice(0, STATIONS_TO_TRY)) {
    try {
      const obs = await getJson<any>(`${station.url}/observations/latest`);
      const p = obs.properties;
      const fresh = p.timestamp && Date.now() - new Date(p.timestamp).getTime() < MAX_OBSERVATION_AGE_MS;
      if (p.temperature?.value == null || !fresh) continue;
      const precip24hIn = await rainLast24Hours(station.url);
      observation = {
        stationId: station.id,
        timestamp: p.timestamp,
        temperatureC: p.temperature?.value ?? null,
        relativeHumidity: p.relativeHumidity?.value ?? null,
        windSpeedKmh: p.windSpeed?.value ?? null,
        windDirectionDeg: p.windDirection?.value ?? null,
        barometricPressurePa: p.barometricPressure?.value ?? null,
        textDescription: p.textDescription ?? null,
        windGustKmh: p.windGust?.value ?? null,
        dewpointC: p.dewpoint?.value ?? null,
        seaLevelPressurePa: p.seaLevelPressure?.value ?? null,
        stationName: station.name,
        stationDistanceMi: station.miles,
        precip24hIn,
      };
      break;
    } catch {
      // That station isn't answering; try the next nearest.
    }
  }

  const nearbyAirports = ranked.map((s) => s.id).filter((id) => /^K[A-Z0-9]{3}$/.test(id)).slice(0, 2);

  return {
    gridId: point.properties.gridId,
    gridX: point.properties.gridX,
    gridY: point.properties.gridY,
    observation,
    nearbyAirports,
    forecast: forecast.properties.periods.map((p) => ({
      name: p.name,
      startTime: p.startTime,
      endTime: p.endTime,
      isDaytime: p.isDaytime,
      temperature: p.temperature,
      temperatureUnit: p.temperatureUnit,
      windSpeed: p.windSpeed,
      windDirection: p.windDirection,
      shortForecast: p.shortForecast,
      probabilityOfPrecipitation: p.probabilityOfPrecipitation?.value ?? null,
    })),
    hourly: hourly.properties.periods.slice(0, 24).map((p) => ({
      startTime: p.startTime,
      temperature: p.temperature,
      temperatureUnit: p.temperatureUnit,
      shortForecast: p.shortForecast,
      probabilityOfPrecipitation: p.probabilityOfPrecipitation?.value ?? null,
    })),
  };
}
// Active watches/warnings/advisories for our point, straight from NWS —
// same no-key, CORS-friendly API as the rest of this file.
export async function fetchNwsAlerts(latitude: number, longitude: number): Promise<NwsAlert[]> {

  const alerts = await getJson<NwsAlertsResponse>(
    `https://api.weather.gov/alerts/active?point=${latitude.toFixed(4)},${longitude.toFixed(4)}`
  );

  return alerts.features
    .filter((f) => f.properties.messageType !== "Cancel")
    .map((f) => ({
      id: f.properties.id,
      event: f.properties.event,
      headline: f.properties.headline,
      description: f.properties.description,
      severity: f.properties.severity,
      urgency: f.properties.urgency,
      areaDesc: f.properties.areaDesc,
      effective: f.properties.effective,
      expires: f.properties.expires,
    }));
}
