import type { Front, FrontKind, FrontSet } from "../api/fronts";
import { makeProjector } from "../lib/mapView";
import type { MapViewSpec } from "../lib/mapView";

// Fronts drawn the way meteorologists chart them: cold fronts blue with
// triangles, warm fronts red with half-circles, occluded fronts purple with
// both, stationary fronts alternating blue triangles and red half-circles on
// opposite sides, and troughs as dashed brown lines. Symbols sit on the side
// NWS puts them (see api/fronts.ts) and point away from the line.

export const FRONT_COLORS = {
  cold: "#1f4fe0",
  warm: "#e0232b",
  occluded: "#8a2fc4",
  trough: "#8a5a1f",
} as const;

interface Props {
  fronts: FrontSet;
  /** The iframe's size, zoom and center, as for AlertOutlines. */
  iframe: MapViewSpec;
  /** The visible part of the iframe (viewBox). */
  visible: { left?: number; top: number; width: number; height: number };
  /** >1 enlarges lines and symbols (the small map is drawn scaled down). */
  scale?: number;
}

interface Pt {
  x: number;
  y: number;
}

const SIZE = 9; // symbol base length, screen px
const SPACING = 30; // distance between symbols along a line, screen px

const f1 = (n: number) => n.toFixed(1);

// Walks a projected line and calls place(point, unitTangent, index) at even
// spacing. Left of travel on screen (y down) is (ty, -tx).
function walk(line: Pt[], spacing: number, place: (p: Pt, tx: number, ty: number, i: number) => void) {
  let carried = spacing / 2;
  let index = 0;
  for (let s = 0; s < line.length - 1; s++) {
    const a = line[s];
    const b = line[s + 1];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    if (len === 0) continue;
    let at = carried;
    while (at <= len) {
      place({ x: a.x + (dx * at) / len, y: a.y + (dy * at) / len }, dx / len, dy / len, index++);
      at += spacing;
    }
    carried = at - len;
  }
}

function triangle(p: Pt, tx: number, ty: number, size: number, side: 1 | -1) {
  const nx = ty * side;
  const ny = -tx * side;
  const h = size * 0.9;
  return (
    `M${f1(p.x - (tx * size) / 2)} ${f1(p.y - (ty * size) / 2)}` +
    `L${f1(p.x + (tx * size) / 2)} ${f1(p.y + (ty * size) / 2)}` +
    `L${f1(p.x + nx * h)} ${f1(p.y + ny * h)}Z`
  );
}

function halfCircle(p: Pt, tx: number, ty: number, size: number, side: 1 | -1) {
  const r = size / 2;
  // From behind to ahead; sweep 1 bulges left of travel, 0 bulges right.
  return (
    `M${f1(p.x - tx * r)} ${f1(p.y - ty * r)}` +
    `A${f1(r)} ${f1(r)} 0 0 ${side === 1 ? 1 : 0} ${f1(p.x + tx * r)} ${f1(p.y + ty * r)}Z`
  );
}

function linePath(line: Pt[]) {
  return line.map((p, i) => `${i ? "L" : "M"}${f1(p.x)} ${f1(p.y)}`).join("");
}

export function FrontLines({ fronts, iframe, visible, scale = 1 }: Props) {
  const project = makeProjector(iframe);
  const left = visible.left ?? 0;
  const margin = 40 * scale;
  const inside = (p: Pt) =>
    p.x > left - margin && p.x < left + visible.width + margin && p.y > visible.top - margin && p.y < visible.top + visible.height + margin;

  const size = SIZE * scale;
  const spacing = SPACING * scale;
  const strokeW = 1.7 * scale;

  const pieces = fronts.fronts.flatMap((front: Front) =>
    front.lines.map((raw, li) => {
      const line = raw.map(([lon, lat]) => project(lon, lat));
      if (!line.some(inside)) return null;

      const tri: string[] = [];
      const half: string[] = [];
      const triOther: string[] = [];
      if (front.kind !== "trough") {
        walk(line, spacing, (p, tx, ty, i) => {
          if (!inside(p)) return;
          switch (front.kind as FrontKind) {
            case "cold":
              tri.push(triangle(p, tx, ty, size, 1));
              break;
            case "warm":
              half.push(halfCircle(p, tx, ty, size, 1));
              break;
            case "occluded":
              (i % 2 === 0 ? tri : half).push(i % 2 === 0 ? triangle(p, tx, ty, size, 1) : halfCircle(p, tx, ty, size, 1));
              break;
            case "stationary":
              if (i % 2 === 0) triOther.push(triangle(p, tx, ty, size, 1));
              else half.push(halfCircle(p, tx, ty, size, -1));
              break;
          }
        });
      }
      return { key: `${front.kind}-${li}`, kind: front.kind, d: linePath(line), tri: tri.join(""), half: half.join(""), triOther: triOther.join("") };
    })
  );

  // Big blue H and red L at the pressure centers, with a white outline so
  // they read over the radar.
  const letters = fronts.centers
    .map((c) => ({ ...c, at: project(c.lon, c.lat) }))
    .filter((c) => inside(c.at));

  return (
    <svg
      className="front-lines"
      viewBox={`${left} ${visible.top} ${visible.width} ${visible.height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {pieces.map((p) => {
        if (!p) return null;
        if (p.kind === "trough") {
          return (
            <path key={p.key} d={p.d} fill="none" stroke={FRONT_COLORS.trough} strokeWidth={2 * scale}
              strokeDasharray={`${7 * scale} ${5 * scale}`} strokeLinecap="round" className="front-stroke" />
          );
        }
        if (p.kind === "stationary") {
          return (
            <g key={p.key}>
              <path d={p.d} fill="none" stroke={FRONT_COLORS.cold} strokeWidth={strokeW} className="front-stroke" />
              <path d={p.d} fill="none" stroke={FRONT_COLORS.warm} strokeWidth={strokeW}
                strokeDasharray={`${spacing / 2} ${spacing / 2}`} strokeDashoffset={spacing / 2} className="front-stroke" />
              <path d={p.triOther} fill={FRONT_COLORS.cold} />
              <path d={p.half} fill={FRONT_COLORS.warm} />
            </g>
          );
        }
        const color = FRONT_COLORS[p.kind];
        return (
          <g key={p.key}>
            <path d={p.d} fill="none" stroke={color} strokeWidth={strokeW} className="front-stroke" />
            <path d={p.tri} fill={color} />
            <path d={p.half} fill={color} />
          </g>
        );
      })}
      {letters.map((c) => (
        <text
          key={`${c.kind}-${c.lon}-${c.lat}`}
          x={c.at.x}
          y={c.at.y}
          textAnchor="middle"
          dominantBaseline="central"
          className="pressure-letter"
          fontSize={30 * scale}
          fill={c.kind === "high" ? FRONT_COLORS.cold : FRONT_COLORS.warm}
          strokeWidth={4 * scale}
        >
          {c.kind === "high" ? "H" : "L"}
        </text>
      ))}
    </svg>
  );
}

export function FrontLegend({ valid }: { valid: string | null }) {
  return (
    <div className="front-legend" aria-hidden="true">
      <span style={{ color: FRONT_COLORS.cold }}>▲ Cold</span>
      <span style={{ color: FRONT_COLORS.warm }}>● Warm</span>
      <span style={{ color: FRONT_COLORS.occluded }}>▲● Occluded</span>
      <span>
        <b style={{ color: FRONT_COLORS.cold }}>▲</b>
        <b style={{ color: FRONT_COLORS.warm }}>●</b> Stationary
      </span>
      <span style={{ color: FRONT_COLORS.trough }}>╌ Trough</span>
      <span>
        <b style={{ color: FRONT_COLORS.cold }}>H</b> High / <b style={{ color: FRONT_COLORS.warm }}>L</b> Low pressure
      </span>
      {valid && <em>valid {valid}</em>}
    </div>
  );
}
