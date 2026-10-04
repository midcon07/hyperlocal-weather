import type { MapAlert } from "../api/mapAlerts";
import { LEVEL_RANK, levelFor } from "./alertLevel";

// Which alerts are at a point on the radar, found with plain geometry rather
// than by asking the browser what SVG element is under the pointer (touch
// browsers, Safari especially, are unreliable about that). The point and the
// projection share one pixel space; `tolerance` is how far, in those pixels,
// the point may be from an alert's edge and still count (so thin river
// stretches can be hit, and fingers don't have to be exact).

interface Pt {
  x: number;
  y: number;
}

function insideRing(x: number, y: number, pts: Pt[]) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const a = pts[i];
    const b = pts[j];
    if (a.y > y !== b.y > y && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

function nearEdge(x: number, y: number, pts: Pt[], tolSq: number) {
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const a = pts[i];
    const b = pts[j];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lenSq = dx * dx + dy * dy;
    const t = lenSq === 0 ? 0 : Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / lenSq));
    const ex = a.x + t * dx - x;
    const ey = a.y + t * dy - y;
    if (ex * ex + ey * ey <= tolSq) return true;
  }
  return false;
}

export function alertsNearPoint(
  alerts: MapAlert[],
  project: (lon: number, lat: number) => Pt,
  x: number,
  y: number,
  tolerance: number
): MapAlert[] {
  const tolSq = tolerance * tolerance;
  const hits: MapAlert[] = [];

  for (const alert of alerts) {
    const level = levelFor(alert.event);
    if (level !== "advisory" && level !== "watch" && level !== "warning") continue;

    let hit = false;
    for (const shape of alert.shapes) {
      for (const ring of shape.rings) {
        const pts = ring.map(([lon, lat]) => project(lon, lat));
        let minX = Infinity;
        let maxX = -Infinity;
        let minY = Infinity;
        let maxY = -Infinity;
        for (const p of pts) {
          if (p.x < minX) minX = p.x;
          if (p.x > maxX) maxX = p.x;
          if (p.y < minY) minY = p.y;
          if (p.y > maxY) maxY = p.y;
        }
        if (x < minX - tolerance || x > maxX + tolerance || y < minY - tolerance || y > maxY + tolerance) continue;
        if (insideRing(x, y, pts) || nearEdge(x, y, pts, tolSq)) {
          hit = true;
          break;
        }
      }
      if (hit) break;
    }
    if (hit) hits.push(alert);
  }

  return hits.sort((a, b) => LEVEL_RANK[levelFor(b.event)] - LEVEL_RANK[levelFor(a.event)]);
}
