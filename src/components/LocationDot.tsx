import { makeProjector } from "../lib/mapView";
import type { MapViewSpec } from "../lib/mapView";
import type { VisitorPlace } from "../lib/visitorLocation";

// A small dot with a halo at the visitor's chosen place, so they can see where
// the map has been centered. Drawn in the same pixel space as the outlines.

interface Props {
  place: VisitorPlace;
  iframe: MapViewSpec;
  visible: { left?: number; top: number; width: number; height: number };
  /** >1 enlarges the dot (the small map is drawn scaled down). */
  scale?: number;
}

export function LocationDot({ place, iframe, visible, scale = 1 }: Props) {
  if (place.home) return null;
  const p = makeProjector(iframe)(place.lon, place.lat);
  const left = visible.left ?? 0;
  if (p.x < left || p.x > left + visible.width || p.y < visible.top || p.y > visible.top + visible.height) return null;

  return (
    <svg
      className="front-lines"
      viewBox={`${left} ${visible.top} ${visible.width} ${visible.height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <circle cx={p.x} cy={p.y} r={13 * scale} fill="#1d78e8" fillOpacity={0.22} />
      <circle cx={p.x} cy={p.y} r={5.5 * scale} fill="#1d78e8" stroke="#fff" strokeWidth={2 * scale} />
    </svg>
  );
}
