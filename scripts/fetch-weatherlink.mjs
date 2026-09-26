// Fetches current conditions for a Davis WeatherLink Live station from the
// WeatherLink v2 API. Requires WEATHERLINK_API_KEY, WEATHERLINK_API_SECRET,
// and WEATHERLINK_STATION_ID environment variables (set as GitHub Actions
// secrets — see README).

import { createHmac } from "node:crypto";

function sign(params, apiSecret) {
  const sortedKeys = Object.keys(params).sort();
  const message = sortedKeys.map((k) => `${k}${params[k]}`).join("");
  return createHmac("sha256", apiSecret).update(message).digest("hex");
}

export async function fetchWeatherlinkData() {
  const apiKey = process.env.WEATHERLINK_API_KEY;
  const apiSecret = process.env.WEATHERLINK_API_SECRET;
  const stationId = process.env.WEATHERLINK_STATION_ID;

  if (!apiKey || !apiSecret || !stationId) {
    console.warn(
      "WeatherLink credentials not set (WEATHERLINK_API_KEY / WEATHERLINK_API_SECRET / WEATHERLINK_STATION_ID) — skipping station data."
    );
    return null;
  }

  const t = Math.floor(Date.now() / 1000);
  const params = { "api-key": apiKey, "station-id": stationId, t };
  const signature = sign(params, apiSecret);

  const url = new URL(
    `https://api.weatherlink.com/v2/current/${stationId}`
  );
  url.searchParams.set("api-key", apiKey);
  url.searchParams.set("t", String(t));
  url.searchParams.set("api-signature", signature);

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(
      `WeatherLink request failed: ${res.status} ${res.statusText}`
    );
  }
  const data = await res.json();

  // WeatherLink bundles readings per physical sensor ("sensor type"); pick
  // the ISS (integrated sensor suite) and any leaf/soil or extra sensors it
  // finds so the scaffold works whether you have just the console or extra
  // Davis sensors attached.
  console.log(
    "DEBUG sensor keys:",
    JSON.stringify(
      data.sensors.map((s) => ({
        sensor_type: s.sensor_type,
        data_structure_type: s.data_structure_type,
        keys: s.data?.[0] ? Object.keys(s.data[0]) : null,
      }))
    )
  );

  const iss = data.sensors.find((s) =>
    s.data?.[0] && "temp" in s.data[0] && "wind_speed_last" in s.data[0]
  );
  const reading = iss?.data?.[0];

  if (!reading) {
    console.warn("WeatherLink response had no ISS sensor reading.");
    return { timestamp: new Date().toISOString(), raw: data };
  }

  return {
    timestamp: new Date(reading.ts * 1000).toISOString(),
    temperatureF: reading.temp ?? null,
    humidityPct: reading.hum ?? null,
    windSpeedMph: reading.wind_speed_last ?? null,
    windDirectionDeg: reading.wind_dir_last ?? null,
    rainRateInPerHr: reading.rain_rate_last_in ?? null,
    rainDayIn: reading.rainfall_daily_in ?? null,
    barometricPressureInHg: reading.bar_sea_level ?? null,
    uvIndex: reading.uv_index ?? null,
    solarRadiationWm2: reading.solar_rad ?? null,
  };
}
