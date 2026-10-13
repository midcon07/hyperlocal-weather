import { useCallback, useEffect, useRef, useState } from "react";

export interface LiveSourceState<T> {
  data: T | null;
  lastUpdated: Date | null;
  loading: boolean;
  error: string | null;
  secondsUntilRefresh: number;
  refreshNow: () => void;
}

// Fetches on mount, then every `intervalSeconds`, exposing a countdown and a
// manual refresh trigger so the UI can show "updated Xs ago" / "next
// refresh in Ys" per data source. When `resetKey` changes (for instance the
// visitor's place), the old data is dropped and a fresh fetch starts at once.
export function useLiveSource<T>(
  fetcher: () => Promise<T>,
  intervalSeconds: number,
  resetKey = ""
): LiveSourceState<T> {
  const [data, setData] = useState<T | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [secondsUntilRefresh, setSecondsUntilRefresh] = useState(intervalSeconds);

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  // Bumped each time the key changes, so a slow answer for the old key
  // can't overwrite the new one.
  const generation = useRef(0);

  const runFetch = useCallback(async () => {
    const mine = generation.current;
    setLoading(true);
    try {
      const result = await fetcherRef.current();
      if (mine !== generation.current) return;
      setData(result);
      setError(null);
      setLastUpdated(new Date());
    } catch (err) {
      if (mine !== generation.current) return;
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      if (mine === generation.current) {
        setLoading(false);
        setSecondsUntilRefresh(intervalSeconds);
      }
    }
  }, [intervalSeconds, resetKey]);

  useEffect(() => {
    generation.current += 1;
    setData(null);
    setLastUpdated(null);
    setError(null);
    runFetch();
    const tick = setInterval(() => {
      setSecondsUntilRefresh((s) => {
        if (s <= 1) {
          runFetch();
          return intervalSeconds;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [runFetch, intervalSeconds]);

  return { data, lastUpdated, loading, error, secondsUntilRefresh, refreshNow: runFetch };
}
