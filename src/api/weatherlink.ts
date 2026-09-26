// Fetches your station's current conditions via a small serverless proxy
// (see cloudflare-worker/) that holds the WeatherLink API secret and signs
// requests server-side. The browser never sees that secret. If the proxy
// isn't configured yet, this throws and callers fall back to the
// GitHub-Actions-committed snapshot.

import type { StationReading } from "../types/weather";

export async function fetchStationLive(): Promise<StationReading> {
  const proxyUrl = import.meta.env.VITE_WEATHERLINK_PROXY_URL;
  if (!proxyUrl) {
    throw new Error("Live station proxy not configured (VITE_WEATHERLINK_PROXY_URL).");
  }

  const res = await fetch(proxyUrl);
  if (!res.ok) {
    throw new Error(`Station proxy request failed: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<StationReading>;
}
