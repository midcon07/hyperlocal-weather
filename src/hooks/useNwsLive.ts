import { fetchNwsLive } from "../api/nws";
import { useLiveSource } from "./useLiveSource";

export function useNwsLive() {
  return useLiveSource(fetchNwsLive, 60);
}
