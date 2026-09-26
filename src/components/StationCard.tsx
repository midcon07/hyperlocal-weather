import { fmt } from "../lib/format";
import { RefreshControls } from "./RefreshControls";
import type { LiveSourceState } from "../hooks/useLiveSource";
import type { StationReading } from "../types/weather";

interface Props {
  live: LiveSourceState<StationReading>;
  fallback: StationReading | null;
}

export function StationCard({ live, fallback }: Props) {
  const isLive = live.data !== null;
  const station = live.data ?? fallback;

  return (
    <div className="card">
      <div className="card-header">
        <h2>Your Station</h2>
      </div>
      {station ? (
        <>
          <div className="big-stat">{fmt(station.temperatureF, 0, "°F")}</div>
          <dl className="stat-list">
            <div><dt>Humidity</dt><dd>{fmt(station.humidityPct, 0, "%")}</dd></div>
            <div><dt>Wind</dt><dd>{fmt(station.windSpeedMph, 0, " mph")}</dd></div>
            <div><dt>Rain rate</dt><dd>{fmt(station.rainRateInPerHr, 2, " in/hr")}</dd></div>
            <div><dt>Rain today</dt><dd>{fmt(station.rainDayIn, 2, " in")}</dd></div>
            <div><dt>Pressure</dt><dd>{fmt(station.barometricPressureInHg, 2, " inHg")}</dd></div>
            <div><dt>UV Index</dt><dd>{fmt(station.uvIndex, 1)}</dd></div>
          </dl>
        </>
      ) : (
        <p className="empty-state">
          No station data yet. Configure WeatherLink secrets to start collecting readings.
        </p>
      )}
      <RefreshControls
        lastUpdated={live.lastUpdated ?? (fallback ? new Date(fallback.timestamp) : null)}
        secondsUntilRefresh={live.secondsUntilRefresh}
        loading={live.loading}
        live={isLive}
        onRefresh={live.refreshNow}
      />
      {!isLive && (
        <p className="proxy-note">
          Live proxy not configured yet — showing the last reading synced by GitHub Actions.
          See cloudflare-worker/README.md to enable real-time updates.
        </p>
      )}
    </div>
  );
}
