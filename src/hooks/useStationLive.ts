import { fetchStationLive } from "../api/weatherlink";
import { useLiveSource } from "./useLiveSource";

export function useStationLive() {
  return useLiveSource(fetchStationLive, 60);
}
