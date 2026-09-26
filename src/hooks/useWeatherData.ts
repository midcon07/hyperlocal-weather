import { useEffect, useState } from "react";
import type { HistoryEntry, LatestData } from "../types/weather";

interface WeatherDataState {
  latest: LatestData | null;
  history: HistoryEntry[];
  loading: boolean;
  error: string | null;
}

const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

export function useWeatherData(): WeatherDataState {
  const [state, setState] = useState<WeatherDataState>({
    latest: null,
    history: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const base = import.meta.env.BASE_URL;
        const [latestRes, historyRes] = await Promise.all([
          fetch(`${base}data/latest.json?_=${Date.now()}`),
          fetch(`${base}data/history.json?_=${Date.now()}`),
        ]);
        if (!latestRes.ok || !historyRes.ok) {
          throw new Error("Failed to load weather data files.");
        }
        const latest = (await latestRes.json()) as LatestData;
        const history = (await historyRes.json()) as HistoryEntry[];
        if (!cancelled) {
          setState({ latest, history, loading: false, error: null });
        }
      } catch (err) {
        if (!cancelled) {
          setState((prev) => ({
            ...prev,
            loading: false,
            error: err instanceof Error ? err.message : "Unknown error",
          }));
        }
      }
    }

    load();
    const interval = setInterval(load, REFRESH_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return state;
}
