import { fetchMetar } from "../api/aviationweather";
import { useLiveSource } from "./useLiveSource";

// Airport reports: the station's usual airports at home, or the airports
// nearest a faraway visitor's place (known once that place's forecast has loaded).
export function useMetarLive(remote: boolean, airports?: string[]) {
  const key = remote ? `remote:${airports?.join(",") ?? ""}` : "station";
  return useLiveSource(
    () => (remote ? (airports?.length ? fetchMetar(airports) : Promise.resolve([])) : fetchMetar()),
    60,
    key
  );
}
