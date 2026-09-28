// Fetches forecast/observation data directly from api.weather.gov in the
// browser (no API key needed, and NWS's API allows cross-origin requests).
// This bypasses the GitHub Actions pipeline entirely, so it can refresh as
// often as we like without waiting on Actions' ~5 minute cron floor.

import siteConfig from "../../config/site.config.json";
import type { NwsAlert, NwsData } from "../types/weather";

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { Accept: "application/geo+json" } });
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
  features: Array<{ id: string }>;
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

export async function fetchNwsLive(): Promise<NwsData> {
  const { latitude, longitude } = siteConfig.location;

  const point = await getJson<NwsPointResponse>(
    `https://api.weather.gov/points/${latitude},${longitude}`
  );

  const [forecast, hourly, stations] = await Promise.all([
    getJson<NwsForecastResponse>(point.properties.forecast),
    getJson<NwsForecastResponse>(point.properties.forecastHourly),
    getJson<NwsStationsResponse>(point.properties.observationStations),
  ]);

  const nearestStationUrl = stations.features?.[0]?.id;
  let observation: NwsData["observation"] = null;
  if (nearestStationUrl) {
    const obs = await getJson<any>(`${nearestStationUrl}/observations/latest`);
    observation = {
      stationId: nearestStationUrl.split("/").pop() as string,
      timestamp: obs.properties.timestamp,
      temperatureC: obs.properties.temperature?.value ?? null,
      relativeHumidity: obs.properties.relativeHumidity?.value ?? null,
      windSpeedKmh: obs.properties.windSpeed?.value ?? null,
      windDirectionDeg: obs.properties.windDirection?.value ?? null,
      barometricPressurePa: obs.properties.barometricPressure?.value ?? null,
      textDescription: obs.properties.textDescription ?? null,
    };
  }

  return {
    gridId: point.properties.gridId,
    gridX: point.properties.gridX,
    gridY: point.properties.gridY,
    observation,
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
export async function fetchNwsAlerts(): Promise<NwsAlert[]> {
  const { latitude, longitude } = siteConfig.location;

  const alerts = await getJson<NwsAlertsResponse>(
    `https://api.weather.gov/alerts/active?point=${latitude},${longitude}`
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
