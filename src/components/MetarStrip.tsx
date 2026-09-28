import { RefreshControls } from "./RefreshControls";
import type { LiveSourceState } from "../hooks/useLiveSource";
import type { FlightCategory, MetarReading } from "../types/weather";

interface Props {
  live: LiveSourceState<MetarReading[]>;
}

const CATEGORY_LABEL: Record<FlightCategory, string> = {
  VFR: "Visual",
  MVFR: "Marginal VFR",
  IFR: "Instrument",
  LIFR: "Low IFR",
};

function zuluClock(observedAt: string): string {
  const d = new Date(observedAt);
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.getUTCHours().toString().padStart(2, "0")}${d.getUTCMinutes().toString().padStart(2, "0")}Z`;
}

function MetarStation({ metar }: { metar: MetarReading }) {
  return (
    <div className="metar-station">
      <div className="metar-station-header">
        <span className="metar-subtitle">METAR {metar.stationId}</span>
        <span className={`metar-badge metar-badge--${(metar.flightCategory ?? "VFR").toLowerCase()}`}>
          {metar.flightCategory ?? "—"}
          {metar.flightCategory && (
            <span className="metar-badge-detail"> · {CATEGORY_LABEL[metar.flightCategory]}</span>
          )}
        </span>
      </div>

      {metar.type === "SPECI" && (
        <p className="metar-speci">SPECIAL — issued outside the normal hourly cycle</p>
      )}
      <p className="metar-raw">{metar.raw}</p>
      <dl className="stat-list metar-decoded">
        <div><dt>Observed</dt><dd>{zuluClock(metar.observedAt)}</dd></div>
        <div>
          <dt>Wind</dt>
          <dd>
            {metar.windSpeedKt === 0
              ? "Calm"
              : `${metar.windDirDeg ?? "VRB"}° at ${metar.windSpeedKt ?? "—"} kt`}
          </dd>
        </div>
        <div><dt>Visibility</dt><dd>{metar.visibilitySm ?? "—"} SM</dd></div>
        <div><dt>Altimeter</dt><dd>{metar.altimeterInHg?.toFixed(2) ?? "—"} inHg</dd></div>
        <div><dt>Temp / Dewpoint</dt><dd>{metar.tempC ?? "—"}° / {metar.dewpointC ?? "—"}°C</dd></div>
      </dl>
    </div>
  );
}

export function MetarStrip({ live }: Props) {
  const stations = live.data ?? [];
  const isLive = stations.length > 0;

  return (
    <div className="card metar-strip">
      <div className="card-header">
        <h2>Aviation Weather</h2>
      </div>

      {isLive ? (
        stations.map((metar) => <MetarStation key={metar.stationId} metar={metar} />)
      ) : (
        <p className="empty-state">
          No METAR yet. Requires the Cloudflare Worker's /metar route — see cloudflare-worker/README.md.
        </p>
      )}

      <RefreshControls
        lastUpdated={live.lastUpdated}
        secondsUntilRefresh={live.secondsUntilRefresh}
        loading={live.loading}
        live={isLive}
        onRefresh={live.refreshNow}
      />
    </div>
  );
}
