import { fetchMetar } from "../api/aviationweather";
import { useLiveSource } from "./useLiveSource";

export function useMetarLive() {
  return useLiveSource(fetchMetar, 60);
}
