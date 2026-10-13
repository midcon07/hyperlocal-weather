import { fetchNwsLive } from "../api/nws";
import type { ActivePlace } from "../lib/visitorLocation";
import { useLiveSource } from "./useLiveSource";

// Forecast and nearest-station reading for whichever place the page is about.
export function useNwsLive(place: ActivePlace) {
  return useLiveSource(() => fetchNwsLive(place.lat, place.lon), 60, place.key);
}
