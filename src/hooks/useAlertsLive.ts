import { fetchNwsAlerts } from "../api/nws";
import type { ActivePlace } from "../lib/visitorLocation";
import { useLiveSource } from "./useLiveSource";

export function useAlertsLive(place: ActivePlace) {
  return useLiveSource(() => fetchNwsAlerts(place.lat, place.lon), 60, place.key);
}
