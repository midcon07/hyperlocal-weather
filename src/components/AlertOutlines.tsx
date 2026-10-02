import type { MapAlert } from "../api/mapAlerts";
import { LEVEL_RANK, levelFor } from "../lib/alertLevel";
import { makeProjector } from "../lib/mapView";
import type { MapViewSpec } from "../lib/mapView";

// Dashed outlines of active watches (orange) and warnings (red) drawn over
// the radar. Warnings use NWS's real polygon; watches and other zone-based
// alerts get a box around their affected zones. Drawn in the iframe's own
// pixel space, then cropped by viewBox to whatever part the card shows.

export const ADVISORY_COLOR = "#2b7de9";
export const WATCH_COLOR = "#f59e0b";
export const WARNING_COLOR = "#e11d2e";

const COLORS: Record<string, string> = {
  advisory: ADVISORY_COLOR,
  watch: WATCH_COLOR,
  warning: WARNING_COLOR,
};

interface Props {
  alerts: MapAlert[];
  /** The iframe's size and zoom, in its own CSS pixels. */
  iframe: MapViewSpec;
  /** The part of the iframe that is visible: left/top offset and size. */
  visible: { top: number; width: number; height: number };
}

export function AlertOutlines({ alerts, iframe, visible }: Props) {
  const project = makeProjector(iframe);

  // Least severe first, so warnings land on top where outlines overlap.
  const drawn = alerts
    .map((a) => ({ alert: a, level: levelFor(a.event) }))
    .filter((d) => d.level === "advisory" || d.level === "watch" || d.level === "warning")
    // Flood watches and warnings are handled separately (river-point
    // warnings alone can number in the dozens), so they stay in the alerts
    // list but get no outline. Flood advisories are few and are drawn.
    .filter((d) => d.level === "advisory" || !d.alert.event.toLowerCase().includes("flood"))
    .sort((a, b) => LEVEL_RANK[a.level] - LEVEL_RANK[b.level]);

  const paths = drawn.flatMap(({ alert, level }) =>
    alert.shapes.map((shape, i) => {
      let d: string;
      if (shape.kind === "polygon") {
        d = shape.rings
          .map((ring) =>
            ring
              .map(([lon, lat], k) => {
                const p = project(lon, lat);
                return `${k === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
              })
              .join(" ") + " Z"
          )
          .join(" ");
      } else {
        const nw = project(shape.west, shape.north);
        const se = project(shape.east, shape.south);
        d = `M${nw.x.toFixed(1)} ${nw.y.toFixed(1)} H${se.x.toFixed(1)} V${se.y.toFixed(1)} H${nw.x.toFixed(1)} Z`;
      }
      return { key: `${alert.id}-${i}`, d, level };
    })
  );

  return (
    <svg
      className="alert-outlines"
      viewBox={`0 ${visible.top} ${visible.width} ${visible.height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {paths.map((p) => (
        <g key={p.key}>
          <path d={p.d} className="alert-outline-halo" />
          <path d={p.d} className="alert-outline" stroke={COLORS[p.level]} />
        </g>
      ))}
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
    </div>
  );
}
