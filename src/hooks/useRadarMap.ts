import { useEffect, useRef, useState } from "react";
import { makeInverse, makeProjector } from "../lib/mapView";
import type { MapViewSpec } from "../lib/mapView";
import type { MapPosition } from "../lib/radarEmbed";

// Steering for an embedded NWS radar. We can't read the NWS map's state, so
// the page owns the position: gestures move a `target` we know exactly, the
// alert outlines are drawn from it, and the NWS map follows in two steps. The
// picture already on screen is shifted/scaled to match instantly, and once the
// target has held still a fresh copy is loaded at it behind the old one and
// swapped in after it has drawn. Used by both the small card map and the
// enlarged map; all coordinates are in the pixel space of the visible window
// (the iframe sits `chromeTop` above it, so NWS's banner is cropped off).

export interface Layer {
  id: number;
  view: MapPosition;
  ready: boolean;
}

export const MIN_ZOOM = 4.5;
export const MAX_ZOOM = 9;
const IDLE_MS = 400; // how long the target must hold still before reloading
export const SETTLE_MS = 4000; // after the page loads, time for the map tiles to draw
const GIVE_UP_MS = 20000; // swap in a slow layer anyway

export const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
export const clampPosition = (p: MapPosition): MapPosition => ({
  lon: clamp(p.lon, -128, -64),
  lat: clamp(p.lat, 22, 52),
  zoom: clamp(p.zoom, MIN_ZOOM, MAX_ZOOM),
});
export const samePosition = (a: MapPosition, b: MapPosition) =>
  Math.abs(a.zoom - b.zoom) < 0.002 && Math.abs(a.lon - b.lon) < 0.0005 && Math.abs(a.lat - b.lat) < 0.0005;

interface Options {
  /** Visible window size, in the pixel space the map is drawn in. */
  width: number;
  height: number;
  /** NWS chrome cropped above and below the visible window. */
  chromeTop: number;
  chromeBottom: number;
  /**
   * Extra map loaded on every side of the visible window, so a short drag
   * reveals real map instantly instead of a blank edge while the sharp copy
   * loads. (The top margin sits below NWS's banner, so it is clean map.)
   */
  margin: number;
  /** First position; the map starts once this and the size are known. */
  initial: MapPosition | null;
}

export function useRadarMap({ width, height, chromeTop, chromeBottom, margin, initial }: Options) {
  const iframeWidth = width + 2 * margin;
  const iframeHeight = height + 2 * margin + chromeTop + chromeBottom;
  const [target, setTarget] = useState<MapPosition | null>(null);
  const [layers, setLayers] = useState<Layer[]>([]);
  const nextId = useRef(1);

  // Positions below are in pixels of the visible window; the iframe extends
  // `margin` beyond it on every side and `chromeTop` above its top margin.
  const specFor = (p: MapPosition): MapViewSpec => ({
    width: iframeWidth,
    height: iframeHeight,
    zoom: p.zoom,
    center: { lon: p.lon, lat: p.lat },
  });
  const toScreen = (p: MapPosition, lon: number, lat: number) => {
    const q = makeProjector(specFor(p))(lon, lat);
    return { x: q.x - margin, y: q.y - chromeTop - margin };
  };
  const fromScreen = (p: MapPosition, x: number, y: number) =>
    makeInverse(specFor(p))(x + margin, y + chromeTop + margin);
  const centerOf = (p: MapPosition) => toScreen(p, p.lon, p.lat);

  const panBy = (p: MapPosition, dx: number, dy: number): MapPosition => {
    const c = centerOf(p);
    const ll = fromScreen(p, c.x - dx, c.y - dy);
    return clampPosition({ ...p, lon: ll.lon, lat: ll.lat });
  };
  // Zoom while keeping the map point under (ax, ay) where it is.
  const zoomAbout = (p: MapPosition, zoom: number, ax: number, ay: number): MapPosition => {
    const ll = fromScreen(p, ax, ay);
    const next = { ...p, zoom: clamp(zoom, MIN_ZOOM, MAX_ZOOM) };
    const at = toScreen(next, ll.lon, ll.lat);
    const c = centerOf(next);
    const moved = fromScreen(next, c.x + (at.x - ax), c.y + (at.y - ay));
    return clampPosition({ ...next, lon: moved.lon, lat: moved.lat });
  };

  // Start once we know where and how big.
  useEffect(() => {
    if (!initial || width === 0 || height === 0 || target) return;
    setTarget(initial);
    setLayers([{ id: nextId.current++, view: initial, ready: true }]);
  }, [initial, width, height, target]);

  // When the target has been still for a moment and the newest layer is
  // ready, load a fresh layer at the target (one at a time).
  useEffect(() => {
    if (!target || layers.length === 0) return;
    const latest = layers[layers.length - 1];
    if (!latest.ready || samePosition(latest.view, target)) return;
    const timer = setTimeout(
      () => setLayers((ls) => [...ls, { id: nextId.current++, view: target, ready: false }]),
      IDLE_MS
    );
    return () => clearTimeout(timer);
  }, [target, layers]);

  function markReady(id: number) {
    // Once a layer is showing, the ones under it are no longer needed.
    setLayers((ls) => {
      const index = ls.findIndex((l) => l.id === id);
      if (index < 0) return ls;
      return ls.slice(index).map((l) => (l.id === id ? { ...l, ready: true } : l));
    });
  }

  // A layer that never finishes loading is shown anyway after a while.
  const pendingId = layers.find((l) => !l.ready)?.id;
  useEffect(() => {
    if (pendingId === undefined) return;
    const timer = setTimeout(() => markReady(pendingId), GIVE_UP_MS);
    return () => clearTimeout(timer);
  }, [pendingId]);

  // The picture on screen is the newest ready layer; while it differs from
  // the target it is a shifted/scaled stand-in for the sharp copy to come.
  const showing = [...layers].reverse().find((l) => l.ready);
  const refreshing = !!target && !!showing && (!samePosition(showing.view, target) || layers.some((l) => !l.ready));

  return {
    target,
    setTarget,
    layers,
    markReady,
    refreshing,
    margin,
    iframeWidth,
    iframeHeight,
    specFor,
    toScreen,
    fromScreen,
    centerOf,
    panBy,
    zoomAbout,
  };
}

export type RadarMap = ReturnType<typeof useRadarMap>;
