import { fetchFronts } from "../api/fronts";
import { useLiveSource } from "./useLiveSource";

// The chart is reissued a few times a day, so every half hour is plenty.
export function useFrontsLive() {
  return useLiveSource(fetchFronts, 1800);
}
