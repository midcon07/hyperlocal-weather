import { fetchMapAlerts } from "../api/mapAlerts";
import { useLiveSource } from "./useLiveSource";

export function useMapAlertsLive() {
  return useLiveSource(fetchMapAlerts, 120);
}
