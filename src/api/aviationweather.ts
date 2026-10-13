// Fetches airport METARs via the same Cloudflare Worker proxy used for the
// WeatherLink station (see cloudflare-worker/) — aviationweather.gov doesn't
// send CORS headers, so the browser can't hit it directly. With no station list
// the Worker uses its default airports; a visitor far away asks for the ones
// nearest them.

import type { MetarReading } from "../types/weather";

export async function fetchMetar(airports?: string[]): Promise<MetarReading[]> {
  const proxyUrl = import.meta.env.VITE_WEATHERLINK_PROXY_URL;
  if (!proxyUrl) {
    throw new Error("METAR proxy not configured (VITE_WEATHERLINK_PROXY_URL).");
  }

  const url = new URL("/metar", proxyUrl);
  if (airports?.length) url.searchParams.set("ids", airports.join(","));
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`METAR proxy request failed: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<MetarReading[]>;
}
