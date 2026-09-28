// Fetches the latest KIKV METAR via the same Cloudflare Worker proxy used
// for the WeatherLink station (see cloudflare-worker/) — aviationweather.gov
// doesn't send CORS headers, so the browser can't hit it directly. Requires
// the Worker's /metar route to be deployed.

import type { MetarReading } from "../types/weather";

export async function fetchMetar(): Promise<MetarReading[]> {
  const proxyUrl = import.meta.env.VITE_WEATHERLINK_PROXY_URL;
  if (!proxyUrl) {
    throw new Error("METAR proxy not configured (VITE_WEATHERLINK_PROXY_URL).");
  }

  const res = await fetch(new URL("/metar", proxyUrl));
  if (!res.ok) {
    throw new Error(`METAR proxy request failed: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<MetarReading[]>;
}
