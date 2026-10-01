import { fmt, isLikelyDaytime } from "../lib/format";
import { degreesToCompass } from "../lib/compass";
import { RefreshControls } from "./RefreshControls";
import {
  AnemometerIcon,
  CompassArrowIcon,
  DropletIcon,
  GaugeIcon,
  UvIcon,
  getConditionIcon,
  windSpinSeconds,
} from "../lib/weatherIcons";
import type { LiveSourceState } from "../hooks/useLiveSource";
import type { StationReading } from "../types/weather";

interface Props {
  live: LiveSourceState<StationReading>;
  fallback: StationReading | null;
  conditions?: string | null;
}

export function StationCard({ live, fallback, conditions }: Props) {
  const isLive = live.data !== null;
  const station = live.data ?? fallback;
  const ConditionIcon = getConditionIcon(conditions, isLikelyDaytime(new Date()));
  const windDir = degreesToCompass(station?.windDirectionDeg ?? null);

  return (
    <div className="card">
      <div className="card-header">
        <h2>Ironwood Weather</h2>
      </div>
      {station ? (
        <>
          <div className="big-stat-row">
            <ConditionIcon size={44} className="big-stat-icon" />
            <div className="big-stat">{fmt(station.temperatureF, 0, "°F")}</div>
          </div>
          <dl className="stat-list">
            <div>
              <dt>Conditions</dt>
              <dd>{conditions ?? "—"}</dd>
            </div>
            <div>
              <dt>Humidity</dt>
              <dd className="icon-value">
                <DropletIcon size={15} />
                {fmt(station.humidityPct, 0, "%")}
              </dd>
            </div>
            <div>
              <dt>Wind</dt>
              <dd className="icon-value">
                <AnemometerIcon size={18} spinSeconds={windSpinSeconds(station.windSpeedMph)} />
                {fmt(station.windSpeedMph, 0, " mph")}
                {windDir && (
                  <span className="wind-dir">
                    <CompassArrowIcon size={11} directionDeg={station.windDirectionDeg ?? 0} />
                    {windDir}
                  </span>
                )}
              </dd>
            </div>
            <div>
              <dt>Rain rate</dt>
              <dd className="icon-value">
                <DropletIcon size={15} />
                {fmt(station.rainRateInPerHr, 2, " in/hr")}
              </dd>
            </div>
            <div>
              <dt>Rain today</dt>
              <dd className="icon-value">
                <DropletIcon size={15} />
                {fmt(station.rainDayIn, 2, " in")}
              </dd>
            </div>
            <div>
              <dt>Pressure</dt>
              <dd className="icon-value">
                <GaugeIcon size={15} />
                {fmt(station.barometricPressureInHg, 2, " inHg")}
              </dd>
            </div>
            <div>
              <dt>UV Index</dt>
              <dd className="icon-value">
                <UvIcon size={15} />
                {fmt(station.uvIndex, 1)}
              </dd>
            </div>
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
          Showing last GitHub Actions sync — see cloudflare-worker/README.md for real-time updates.
        </p>
      )}
    </div>
  );
}
