import { celsiusToFahrenheit, fmt } from "../lib/format";
import { degreesToCompass } from "../lib/compass";
import { RefreshControls } from "./RefreshControls";
import siteConfig from "../../config/site.config.json";
import { iconTone, isSunUp, sunTimes } from "../lib/sky";
import { Barometer, Hygrometer, RainGauge, SunArc, UvMeter } from "./Instruments";
import { WindMastIcon, getConditionIcon, windSpinSeconds } from "../lib/weatherIcons";
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

  const now = new Date();
  const { latitude, longitude } = siteConfig.location;
  const isDaytime = isSunUp(now, latitude, longitude);
  const times = sunTimes(now, latitude, longitude);

  // The next daytime period is the coming high, the next night period the
  // coming low (NWS periods alternate and start with the current one).
  const periods = nws?.forecast ?? [];
  const high = periods.find((p) => p.isDaytime)?.temperature ?? null;
  const low = periods.find((p) => !p.isDaytime)?.temperature ?? null;
  const ConditionIcon = getConditionIcon(conditions, isDaytime);
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
              <span className="icon-tone big-stat-icon" data-tone={iconTone(conditions, isDaytime)}>
                <ConditionIcon size={56} />
              </span>
              <div>
                <div className="big-stat">{fmt(station.temperatureF, 0, "°F")}</div>
                <div className="big-stat-caption">
                  {conditions ?? "—"}
                  {high !== null && low !== null && (
                    <span className="hi-lo">
                      <span className="hi">H {high}°</span>
                      <span className="lo">L {low}°</span>
                    </span>
                  )}
                </div>
              </div>
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
          <div className="instrument-row">
            <Barometer inHg={station.barometricPressureInHg} trendInHg={station.pressureTrendInHg} />
            <RainGauge todayIn={station.rainDayIn} rateInPerHr={station.rainRateInPerHr} />
            <Hygrometer pct={station.humidityPct} />
            <UvMeter uv={station.uvIndex} />
          </div>
          <SunArc times={times} now={now} />
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
