import { celsiusToFahrenheit, fmt } from "../lib/format";
import { degreesToCompass } from "../lib/compass";
import { RefreshControls } from "./RefreshControls";
import { iconTone, isSunUp, sunTimes } from "../lib/sky";
import { moonPass, moonPhase } from "../lib/moon";
import { Barometer, Hygrometer, RainGauge, Thermometer, WindCompass } from "./Instruments";
import { MoonArc, SunArc } from "./SkyArcs";
import { WindMastIcon, getConditionIcon, windSpinSeconds } from "../lib/weatherIcons";
import { hasGust, isGusty, windCategory, windMeterFraction } from "../lib/wind";
import type { LiveSourceState } from "../hooks/useLiveSource";
import type { NwsData, StationReading } from "../types/weather";

interface Props {
  live: LiveSourceState<StationReading>;
  fallback: StationReading | null;
  nwsLive: LiveSourceState<NwsData>;
  nwsFallback: NwsData | null;
  /** Card heading: the personal station's name, or "Conditions in <city>". */
  title: string;
  /** A line under the heading, e.g. which official station is reporting. */
  subtitle?: string | null;
  /** The place the card is about (sun, moon and day/night are worked out here). */
  lat: number;
  lon: number;
  /** True when this is an official station near a faraway visitor, not the personal one. */
  remote: boolean;
}

export function StationCard({ live, fallback, nwsLive, nwsFallback, title, subtitle, lat, lon, remote }: Props) {
  const isLive = live.data !== null;
  const station = live.data ?? fallback;

  const nws = nwsLive.data ?? nwsFallback;
  const observation = nws?.observation ?? null;
  const conditions = observation?.textDescription ?? null;
  const nwsTempF = celsiusToFahrenheit(observation?.temperatureC ?? null);

  const now = new Date();
  const latitude = lat;
  const longitude = lon;
  const isDaytime = isSunUp(now, latitude, longitude);
  const times = sunTimes(now, latitude, longitude);
  const moon = moonPhase(now);
  const moonToday = moonPass(now, latitude, longitude);

  // The next daytime period is the coming high, the next night period the
  // coming low (NWS periods alternate and start with the current one).
  const periods = nws?.forecast ?? [];
  const high = periods.find((p) => p.isDaytime)?.temperature ?? null;
  const low = periods.find((p) => !p.isDaytime)?.temperature ?? null;
  const ConditionIcon = getConditionIcon(conditions, isDaytime);
  const windDir = degreesToCompass(station?.windDirectionDeg ?? null);
  const windSpeed = station?.windSpeedMph ?? null;
  const windGust = station?.windGustMph ?? null;
  // Official stations don't report a daily rain total, so the rain gauge is skipped for them.
  const showRain = !!station && station.rainDayIn !== null;
  const category = windCategory(windSpeed);
  const gustShown = hasGust(windSpeed, windGust);
  const flutterSeconds = windSpeed && windSpeed >= 1 ? Math.min(3, Math.max(0.7, 6 / (windSpeed + 1))) : undefined;
  const flutterDeg = Math.min(14, 3 + (windSpeed ?? 0) * 0.6);

  return (
    <div className="card station-card">
      <div className="card-header">
        <div>
          <h2>{title}</h2>
          {subtitle && <p className="station-subtitle">{subtitle}</p>}
        </div>
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
              <Thermometer tempF={station.temperatureF} />
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
          <div className={`instrument-row${showRain ? "" : " instrument-row--three"}`}>
            <Barometer inHg={station.barometricPressureInHg} trendInHg={station.pressureTrendInHg} />
            {showRain && <RainGauge todayIn={station.rainDayIn} rateInPerHr={station.rainRateInPerHr} />}
            <Hygrometer pct={station.humidityPct} />
            <WindCompass
              speedMph={windSpeed}
              gustMph={windGust}
              directionDeg={station.windDirectionDeg}
              category={category.label}
              compass={windDir}
              showGust={gustShown}
            />
          </div>
          <div className="sky-row">
            <SunArc times={times} now={now} />
            <MoonArc pass={moonToday} moon={moon} now={now} />
          </div>
        </>
      ) : (
        <p className="empty-state">
          {remote
            ? live.loading
              ? "Finding the nearest weather station…"
              : "No weather station near this place has reported recently."
            : "No station data yet. Configure WeatherLink secrets to start collecting readings."}
        </p>
      )}
      {observation && !remote && (
        <p className="nws-crosscheck">
          NWS Observed: {fmt(nwsTempF, 0, "°F")} · {conditions ?? "—"}
        </p>
      )}
    </div>
  );
}
