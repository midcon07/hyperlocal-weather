import type { MapAlert } from "../api/mapAlerts";
import { LEVEL_RANK, levelFor } from "../lib/alertLevel";
import { makeProjector } from "../lib/mapView";
import type { MapViewSpec } from "../lib/mapView";

// Dashed outlines of active watches (orange) and warnings (red) drawn over
// the radar. Tornado/severe thunderstorm/flash flood warnings use NWS's own
// storm polygon; watches, advisories and other warnings are drawn as the
// actual counties (or forecast zones) they were issued for, with a light
// tint inside so it's clear what is covered. Drawn in the iframe's own
// pixel space, then cropped by viewBox to whatever part the card shows.

export const ADVISORY_COLOR = "#2b7de9";
export const WATCH_COLOR = "#f59e0b";
export const WARNING_COLOR = "#e11d2e";
// Flood watches/warnings: the affected area itself is filled in this blue.
export const FLOOD_COLOR = "#1d4ed8";

const COLORS: Record<string, string> = {
  advisory: ADVISORY_COLOR,
  watch: WATCH_COLOR,
  warning: WARNING_COLOR,
};

const isFlood = (a: MapAlert) => a.event.toLowerCase().includes("flood");

// The color an alert is drawn in (flood watches/warnings are the flood blue).
export function alertColor(a: MapAlert): string {
  const level = levelFor(a.event);
  if (level !== "advisory" && isFlood(a)) return FLOOD_COLOR;
  return COLORS[level] ?? "#888";
}

// Painting order, bottom to top: flood fills, then advisory, watch, warning.
function drawRank(level: string, flood: boolean) {
  if (flood) return level === "warning" ? 1 : 0;
  return 2 + (LEVEL_RANK[level as keyof typeof LEVEL_RANK] ?? 0);
}

interface Props {
  alerts: MapAlert[];
  /** The iframe's size and zoom, in its own CSS pixels. */
  iframe: MapViewSpec;
  /** The part of the iframe that is visible: left/top offset and size. */
  visible: { left?: number; top: number; width: number; height: number };
  /** Alerts under the pointer, drawn a little stronger. */
  highlight?: Set<string>;
}

// ---- Hover / tap details

export interface HoverInfo {
  alerts: MapAlert[];
  /** Pointer position relative to the map container. */
  x: number;
  y: number;
}

const untilFmt = new Intl.DateTimeFormat("en-US", { weekday: "short", hour: "numeric", minute: "2-digit" });
const clockFmt = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" });

function untilText(expires: string | null) {
  if (!expires) return null;
  const date = new Date(expires);
  return `Until ${date.toDateString() === new Date().toDateString() ? clockFmt.format(date) : untilFmt.format(date)}`;
}

const MAX_LISTED = 4;

export function AlertTooltip({ info, width, height }: { info: HoverInfo; width: number; height: number }) {
  const TIP_WIDTH = 260;
  // Flip to the other side of the pointer near the right and bottom edges.
  const left = info.x + 16 + TIP_WIDTH > width ? Math.max(4, info.x - 16 - TIP_WIDTH) : info.x + 16;
  const top = info.y + 16 + 120 > height ? Math.max(4, info.y - 16 - 110) : info.y + 16;
  const shown = info.alerts.slice(0, MAX_LISTED);

  return (
    <div className="alert-tip" style={{ left, top, width: TIP_WIDTH }} role="tooltip">
      {shown.map((a) => {
        const level = levelFor(a.event);
        return (
          <div className="alert-tip-item" key={a.id}>
            <div className="alert-tip-event">
              <i style={{ background: level !== "advisory" && isFlood(a) ? FLOOD_COLOR : (COLORS[level] ?? "#888") }} />
              {a.event}
            </div>
            <div className="alert-tip-area">{a.areaDesc}</div>
            {untilText(a.expires) && <div className="alert-tip-until">{untilText(a.expires)}</div>}
          </div>
        );
      })}
      {info.alerts.length > MAX_LISTED && <div className="alert-tip-more">+{info.alerts.length - MAX_LISTED} more here</div>}
      <div className="alert-tip-hint">Click for the full warning</div>
    </div>
  );
}

export function AlertOutlines({ alerts, iframe, visible, highlight }: Props) {
  const project = makeProjector(iframe);

  // Flood watches and warnings are not outlined like the rest: the affected
  // area is filled solid blue (a river warning's polygon is the stretch of
  // river and floodplain, so just that stretch turns blue). Flood advisories
  // keep the dashed blue outline. Drawn least severe first, with floods at
  // the bottom, so warnings land on top where areas overlap.
  const drawn = alerts
    .map((a) => ({ alert: a, level: levelFor(a.event) }))
    .filter((d) => d.level === "advisory" || d.level === "watch" || d.level === "warning")
    .map((d) => ({ ...d, flood: d.level !== "advisory" && isFlood(d.alert) }))
    .sort((a, b) => drawRank(a.level, a.flood) - drawRank(b.level, b.flood));

  const paths = drawn.flatMap(({ alert, level, flood }) =>
    alert.shapes.map((shape, i) => {
      const d = shape.rings
        .map(
          (ring) =>
            ring
              .map(([lon, lat], k) => {
                const p = project(lon, lat);
                return `${k === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
              })
              .join(" ") + " Z"
        )
        .join(" ");
      return { key: `${alert.id}-${i}`, id: alert.id, d, level, flood };
    })
  );

  return (
    <svg
      className="alert-outlines"
      viewBox={`${visible.left ?? 0} ${visible.top} ${visible.width} ${visible.height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {paths.map((p) =>
        p.flood ? (
          <g key={p.key}>
            <path
              d={p.d}
              className="alert-outline-fill"
              fill={FLOOD_COLOR}
              style={{ fillOpacity: (p.level === "warning" ? 0.55 : 0.2) + (highlight?.has(p.id) ? 0.2 : 0) }}
              data-alert-id={p.id}
            />
            {p.level === "warning" && <path d={p.d} className="flood-edge" />}
          </g>
        ) : (
          <g key={p.key}>
            <path
              d={p.d}
              className={`alert-outline-fill${highlight?.has(p.id) ? " alert-outline-fill--hot" : ""}`}
              fill={COLORS[p.level]}
              data-alert-id={p.id}
            />
            <path d={p.d} className="alert-outline-halo" />
            <path d={p.d} className="alert-outline" stroke={COLORS[p.level]} />
          </g>
        )
      )}
    </svg>
  );
}

export function OutlineLegend() {
  return (
    <div className="outline-legend" aria-hidden="true">
      <span>
        <i style={{ borderColor: ADVISORY_COLOR }} /> Advisory
      </span>
      <span>
        <i style={{ borderColor: WATCH_COLOR }} /> Watch
      </span>
      <span>
        <i style={{ borderColor: WARNING_COLOR }} /> Warning
      </span>
      <span>
        <i className="legend-solid" style={{ background: FLOOD_COLOR }} /> Flood
      </span>
    </div>
  );
}
