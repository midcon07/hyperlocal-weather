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
// refresh in Ys" per data source.
export function useLiveSource<T>(
  fetcher: () => Promise<T>,
  intervalSeconds: number
): LiveSourceState<T> {
  const [data, setData] = useState<T | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [secondsUntilRefresh, setSecondsUntilRefresh] = useState(intervalSeconds);

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const runFetch = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetcherRef.current();
      setData(result);
      setError(null);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
      setSecondsUntilRefresh(intervalSeconds);
    }
  }, [intervalSeconds]);

  useEffect(() => {
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
