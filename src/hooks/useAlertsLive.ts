import { fetchNwsAlerts } from "../api/nws";
import { useLiveSource } from "./useLiveSource";

export function useAlertsLive() {
  return useLiveSource(fetchNwsAlerts, 60);
}
