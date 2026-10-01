import { celsiusToFahrenheit, fmt, isLikelyDaytime } from "../lib/format";
import { degreesToCompass } from "../lib/compass";
import { RefreshControls } from "./RefreshControls";
import {
  AnemometerIcon,
  CompassArrowIcon,
  DropletIcon,
  getConditionIcon,
  windSpinSeconds,
} from "../lib/weatherIcons";
import type { LiveSourceState } from "../hooks/useLiveSource";
import type { NwsData } from "../types/weather";

interface Props {
  live: LiveSourceState<NwsData>;
  fallback: NwsData | null;
}

export function NwsCard({ live, fallback }: Props) {
  const isLive = live.data !== null;
  const nws = live.data ?? fallback;
  const observation = nws?.observation ?? null;
  const nwsTempF = celsiusToFahrenheit(observation?.temperatureC ?? null);
  const ConditionIcon = getConditionIcon(observation?.textDescription, isLikelyDaytime(new Date()));
  const windSpeedMph = observation?.windSpeedKmh ? observation.windSpeedKmh * 0.621371 : null;
  const windDir = degreesToCompass(observation?.windDirectionDeg ?? null);

  return (
    <div className="card">
      <div className="card-header">
        <h2>NWS Observed</h2>
      </div>
      {observation ? (
        <>
          <div className="big-stat-row">
            <ConditionIcon size={44} className="big-stat-icon" />
            <div className="big-stat">{fmt(nwsTempF, 0, "°F")}</div>
          </div>
          <dl className="stat-list">
            <div>
              <dt>Conditions</dt>
              <dd>{observation.textDescription ?? "—"}</dd>
            </div>
            <div>
              <dt>Humidity</dt>
              <dd className="icon-value">
                <DropletIcon size={15} />
                {fmt(observation.relativeHumidity, 0, "%")}
              </dd>
            </div>
            <div>
              <dt>Wind</dt>
              <dd className="icon-value">
                <AnemometerIcon size={18} spinSeconds={windSpinSeconds(windSpeedMph)} />
                {fmt(windSpeedMph, 0, " mph")}
                {windDir && (
                  <span className="wind-dir">
                    <CompassArrowIcon size={11} directionDeg={observation.windDirectionDeg ?? 0} />
                    {windDir}
                  </span>
                )}
              </dd>
            </div>
            <div>
              <dt>Station</dt>
              <dd>{observation.stationId}</dd>
            </div>
          </dl>
        </>
      ) : (
        <p className="empty-state">No NWS observation yet.</p>
      )}
      <RefreshControls
        lastUpdated={live.lastUpdated ?? (observation ? new Date(observation.timestamp) : null)}
        secondsUntilRefresh={live.secondsUntilRefresh}
        loading={live.loading}
        live={isLive}
        onRefresh={live.refreshNow}
      />
    </div>
  );
}
