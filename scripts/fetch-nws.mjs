// Fetches point forecast, hourly forecast, and the latest observation from
// the National Weather Service API (api.weather.gov) for the configured
// location. No API key required, but NWS asks for an identifying User-Agent.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const config = JSON.parse(
  readFileSync(path.join(__dirname, "..", "config", "site.config.json"), "utf-8")
);

const USER_AGENT = `hyperlocal-weather-app (${config.nws.contact})`;

async function getJson(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "application/geo+json",
    },
  });
  if (!res.ok) {
    throw new Error(`NWS request failed: ${res.status} ${res.statusText} (${url})`);
  }
  return res.json();
}

export async function fetchNwsData() {
  const { latitude, longitude } = config.location;

  const point = await getJson(
    `https://api.weather.gov/points/${latitude},${longitude}`
  );

  const [forecast, hourly, stations] = await Promise.all([
    getJson(point.properties.forecast),
    getJson(point.properties.forecastHourly),
    getJson(point.properties.observationStations),
  ]);

  const nearestStationUrl = stations.features?.[0]?.id;
  let observation = null;
  if (nearestStationUrl) {
    try {
      const obs = await getJson(`${nearestStationUrl}/observations/latest`);
      observation = {
        stationId: nearestStationUrl.split("/").pop(),
        timestamp: obs.properties.timestamp,
        temperatureC: obs.properties.temperature?.value ?? null,
        relativeHumidity: obs.properties.relativeHumidity?.value ?? null,
        windSpeedKmh: obs.properties.windSpeed?.value ?? null,
        windDirectionDeg: obs.properties.windDirection?.value ?? null,
        barometricPressurePa: obs.properties.barometricPressure?.value ?? null,
        textDescription: obs.properties.textDescription ?? null,
      };
    } catch (err) {
      console.warn(`Could not fetch latest observation: ${err.message}`);
    }
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
