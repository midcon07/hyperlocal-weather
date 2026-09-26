import { celsiusToFahrenheit, fmt } from "../lib/format";
import { RefreshControls } from "./RefreshControls";
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

  return (
    <div className="card">
      <div className="card-header">
        <h2>NWS Observed</h2>
      </div>
      {observation ? (
        <>
          <div className="big-stat">{fmt(nwsTempF, 0, "°F")}</div>
          <dl className="stat-list">
            <div><dt>Conditions</dt><dd>{observation.textDescription ?? "—"}</dd></div>
            <div><dt>Humidity</dt><dd>{fmt(observation.relativeHumidity, 0, "%")}</dd></div>
            <div><dt>Wind</dt><dd>{fmt(observation.windSpeedKmh ? observation.windSpeedKmh * 0.621371 : null, 0, " mph")}</dd></div>
            <div><dt>Station</dt><dd>{observation.stationId}</dd></div>
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
