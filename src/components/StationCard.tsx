import { celsiusToFahrenheit, fmt, isLikelyDaytime } from "../lib/format";
import { degreesToCompass } from "../lib/compass";
import { RefreshControls } from "./RefreshControls";
import {
  DropletIcon,
  GaugeIcon,
  UvIcon,
  WindMastIcon,
  getConditionIcon,
  windSpinSeconds,
} from "../lib/weatherIcons";
import { hasGust, isGusty, windCategory, windMeterFraction } from "../lib/wind";
import type { LiveSourceState } from "../hooks/useLiveSource";
import type { NwsData, StationReading } from "../types/weather";

interface Props {
  live: LiveSourceState<StationReading>;
  fallback: StationReading | null;
  nwsLive: LiveSourceState<NwsData>;
  nwsFallback: NwsData | null;
}

export function StationCard({ live, fallback, nwsLive, nwsFallback }: Props) {
  const isLive = live.data !== null;
  const station = live.data ?? fallback;

  const nws = nwsLive.data ?? nwsFallback;
  const observation = nws?.observation ?? null;
  const conditions = observation?.textDescription ?? null;
  const nwsTempF = celsiusToFahrenheit(observation?.temperatureC ?? null);

  const ConditionIcon = getConditionIcon(conditions, isLikelyDaytime(new Date()));
  const windDir = degreesToCompass(station?.windDirectionDeg ?? null);
  const windSpeed = station?.windSpeedMph ?? null;
  const windGust = station?.windGustMph ?? null;
  const category = windCategory(windSpeed);
  const gustShown = hasGust(windSpeed, windGust);
  const flutterSeconds = windSpeed && windSpeed >= 1 ? Math.min(3, Math.max(0.7, 6 / (windSpeed + 1))) : undefined;
  const flutterDeg = Math.min(14, 3 + (windSpeed ?? 0) * 0.6);

  return (
    <div className="card station-card">
      <div className="card-header">
        <h2>Ironwood Weather</h2>
        <RefreshControls
          compact
          lastUpdated={live.lastUpdated ?? (fallback ? new Date(fallback.timestamp) : null)}
          secondsUntilRefresh={live.secondsUntilRefresh}
          loading={live.loading}
          live={isLive}
          onRefresh={live.refreshNow}
        />
      </div>
      {station ? (
        <>
          <div className="big-stat-row">
            <div className="big-stat-left">
              <ConditionIcon size={44} className="big-stat-icon" />
              <div className="big-stat">{fmt(station.temperatureF, 0, "°F")}</div>
            </div>
            <div className={`wind-feature wind-level-${category.level}`}>
              <WindMastIcon
                width={56}
                height={96}
                spinSeconds={windSpinSeconds(station.windSpeedMph)}
                directionDeg={station.windDirectionDeg}
                flutterSeconds={flutterSeconds}
                flutterDeg={flutterDeg}
                gusting={isGusty(windSpeed, windGust)}
              />
              <div className="wind-feature-reading">
                <div className="wind-feature-speed">{fmt(station.windSpeedMph, 0, " mph")}</div>
                <div className="wind-feature-dir">
                  {category.label}
                  {windDir && ` · ${windDir}`}
                </div>
                {gustShown && <div className="wind-feature-gust">Gusts {fmt(windGust, 0, " mph")}</div>}
                <div className="wind-meter" aria-hidden="true">
                  <div className="wind-meter-fill" style={{ width: `${windMeterFraction(windSpeed) * 100}%` }} />
                  {gustShown && <div className="wind-meter-gust" style={{ left: `${windMeterFraction(windGust) * 100}%` }} />}
                </div>
              </div>
            </div>
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
      {observation && (
        <p className="nws-crosscheck">
          NWS Observed: {fmt(nwsTempF, 0, "°F")} · {conditions ?? "—"}
        </p>
      )}
    </div>
  );
}
