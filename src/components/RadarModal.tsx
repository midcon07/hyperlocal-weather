import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from "react";
import type { MapAlert } from "../api/mapAlerts";
import { useElementSize } from "../hooks/useElementWidth";
import type { LiveSourceState } from "../hooks/useLiveSource";
import { MAP_CENTER, MAP_DEFAULT_ZOOM, makeInverse, makeProjector } from "../lib/mapView";
import type { MapViewSpec } from "../lib/mapView";
import { CHROME_BOTTOM, CHROME_TOP, CHROME_TOP_NARROW, VISIBLE_HEIGHT, radarUrl } from "../lib/radarEmbed";
import type { MapPosition } from "../lib/radarEmbed";
import { AlertOutlines, AlertTooltip, OutlineLegend, alertsAt } from "./AlertOutlines";
import type { HoverInfo } from "./AlertOutlines";
import { MapAlerts } from "./MapAlerts";

// The enlarged radar: NWS's radar cropped past its banner, menu panel and
// playback bar, at the size of the dialog, with our own alerts button in
// place of the NWS one that lived in the cropped panel.
//
// We can't read the NWS map's state, so we own it. Dragging, the mouse wheel,
// pinching and the +/- buttons move a target position that we know exactly;
// alert outlines are drawn from that target, so they always sit on the right
// counties. The NWS map itself follows in two steps: the picture already on
// screen is shifted/scaled to match instantly, and after the gesture settles a
// fresh copy is loaded at the target position behind it and swapped in once
// it has drawn. (Edges can look blank for a moment while panning far.)

interface Layer {
  id: number;
  view: MapPosition;
  ready: boolean;
}

const MIN_ZOOM = 4.5;
const MAX_ZOOM = 9;
const IDLE_MS = 600; // how long the target must hold still before reloading
const SETTLE_MS = 4500; // after the page loads, time for the map tiles to draw
const GIVE_UP_MS = 20000; // swap in a slow layer anyway
const DRAG_PX = 5;

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const clampPosition = (p: MapPosition): MapPosition => ({
  lon: clamp(p.lon, -128, -64),
  lat: clamp(p.lat, 22, 52),
  zoom: clamp(p.zoom, MIN_ZOOM, MAX_ZOOM),
});
const samePosition = (a: MapPosition, b: MapPosition) =>
  Math.abs(a.zoom - b.zoom) < 0.002 && Math.abs(a.lon - b.lon) < 0.0005 && Math.abs(a.lat - b.lat) < 0.0005;

interface Props {
  alerts: LiveSourceState<MapAlert[]>;
  alertsOpen: boolean;
  onToggleAlerts: () => void;
  onClose: () => void;
  /** Native width of the small map; the first view covers at least this much. */
  coverageWidth: number;
}

export function RadarModal({ alerts, alertsOpen, onToggleAlerts, onClose, coverageWidth }: Props) {
  const { ref, width, height } = useElementSize();
  const chromeTop = width > 600 ? CHROME_TOP : CHROME_TOP_NARROW;
  const iframeHeight = height + chromeTop + CHROME_BOTTOM;

  const [target, setTarget] = useState<MapPosition | null>(null);
  const [layers, setLayers] = useState<Layer[]>([]);
  const nextId = useRef(1);
  const home = useRef<MapPosition | null>(null);

  // Geometry helpers in container pixels (the iframe sits chromeTop above).
  const specFor = (p: MapPosition): MapViewSpec => ({
    width,
    height: iframeHeight,
    zoom: p.zoom,
    center: { lon: p.lon, lat: p.lat },
  });
  const toScreen = (p: MapPosition, lon: number, lat: number) => {
    const q = makeProjector(specFor(p))(lon, lat);
    return { x: q.x, y: q.y - chromeTop };
  };
  const fromScreen = (p: MapPosition, x: number, y: number) => makeInverse(specFor(p))(x, y + chromeTop);
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

  // First view: the home center, zoomed out just enough that this dialog
  // shows at least what the small map shows (so no alert disappears when it
  // opens).
  useEffect(() => {
    if (width === 0 || height === 0 || target) return;
    const fit = Math.min(1, width / coverageWidth, height / VISIBLE_HEIGHT);
    const view = clampPosition({ ...MAP_CENTER, zoom: MAP_DEFAULT_ZOOM + Math.log2(fit) });
    home.current = view;
    setTarget(view);
    setLayers([{ id: nextId.current++, view, ready: true }]);
  }, [width, height, target, coverageWidth]);

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

  // A layer that never finishes loading is shown anyway after a while.
  const pendingId = layers.find((l) => !l.ready)?.id;
  useEffect(() => {
    if (pendingId === undefined) return;
    const timer = setTimeout(() => markReady(pendingId), GIVE_UP_MS);
    return () => clearTimeout(timer);
  }, [pendingId]);

  function markReady(id: number) {
    // Once a layer is showing, the ones under it are no longer needed.
    setLayers((ls) => {
      const index = ls.findIndex((l) => l.id === id);
      if (index < 0) return ls;
      return ls.slice(index).map((l) => (l.id === id ? { ...l, ready: true } : l));
    });
  }

  // ---- Pointer gestures: drag to pan, wheel/pinch/double-click to zoom.
  const [hover, setHover] = useState<HoverInfo | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; mid: { x: number; y: number } } | null>(null);
  const drag = useRef({ moved: false, startX: 0, startY: 0 });

  const local = (e: { clientX: number; clientY: number; currentTarget: Element }) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const showAlertsAt = (e: ReactPointerEvent<HTMLDivElement>) => {
    const hit = alertsAt(e.clientX, e.clientY, alerts.data ?? []);
    const pos = local(e);
    setHover(hit.length ? { alerts: hit, ...pos } : null);
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, local(e));
    setHover(null);
    if (pointers.current.size === 1) {
      drag.current = { moved: false, startX: e.clientX, startY: e.clientY };
    } else if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } };
      drag.current.moved = true;
    }
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const pos = local(e);
    const prev = pointers.current.get(e.pointerId);
    if (!prev) {
      if (e.pointerType === "mouse") showAlertsAt(e); // hovering, not pressing
      return;
    }
    pointers.current.set(e.pointerId, pos);
    if (pointers.current.size === 1) {
      if (Math.hypot(e.clientX - drag.current.startX, e.clientY - drag.current.startY) > DRAG_PX) drag.current.moved = true;
      setTarget((t) => (t ? panBy(t, pos.x - prev.x, pos.y - prev.y) : t));
    } else if (pointers.current.size === 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const last = pinch.current;
      setTarget((t) => (t ? zoomAbout(panBy(t, mid.x - last.mid.x, mid.y - last.mid.y), t.zoom + Math.log2(dist / last.dist), mid.x, mid.y) : t));
      pinch.current = { dist, mid };
    }
    if (drag.current.moved) setHover(null);
  };

  const endPointer = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.delete(e.pointerId);
    pinch.current = null;
    // A press that never turned into a drag is a tap: say what's there.
    if (pointers.current.size === 0 && !drag.current.moved && e.type === "pointerup") showAlertsAt(e);
  };

  const onWheel = (e: ReactWheelEvent<HTMLDivElement>) => {
    const pos = local(e);
    const delta = e.deltaY * (e.deltaMode === 1 ? 16 : 1);
    setTarget((t) => (t ? zoomAbout(t, t.zoom - delta * 0.0022, pos.x, pos.y) : t));
    setHover(null);
  };

  const onDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const pos = local(e);
    setTarget((t) => (t ? zoomAbout(t, t.zoom + 1, pos.x, pos.y) : t));
  };

  const zoomBy = (delta: number) => {
    const c = target ? centerOf(target) : { x: width / 2, y: height / 2 };
    setTarget((t) => (t ? zoomAbout(t, t.zoom + delta, c.x, c.y) : t));
  };

  const highlight = new Set(hover?.alerts.map((a) => a.id));

  // The picture on screen is the newest ready layer; while it differs from
  // the target the map is a shifted/scaled stand-in until a sharp copy swaps in.
  const showing = [...layers].reverse().find((l) => l.ready);
  const refreshing = !!target && !!showing && (!samePosition(showing.view, target) || layers.some((l) => !l.ready));

  return (
    <div className="radar-modal" role="dialog" aria-modal="true" aria-label="Radar, enlarged" onClick={onClose}>
      <div className="radar-modal-body" onClick={(e) => e.stopPropagation()}>
        <div className="radar-modal-bar">
          <strong>Radar — Composite Reflectivity</strong>
          <span>
            <a className="radar-link" href={radarUrl()} target="_blank" rel="noreferrer">
              Open in new tab ↗
            </a>
            <button type="button" className="radar-modal-close" onClick={onClose} autoFocus>
              Close ✕
            </button>
          </span>
        </div>
        <div className="radar-modal-map" ref={ref}>
          {target &&
            width > 0 &&
            layers.map((layer) => {
              const c = centerOf(layer.view);
              const at = toScreen(target, layer.view.lon, layer.view.lat);
              const scale = 2 ** (target.zoom - layer.view.zoom);
              return (
                <div
                  key={layer.id}
                  className="radar-layer"
                  style={{
                    opacity: layer.ready ? 1 : 0,
                    transformOrigin: `${c.x}px ${c.y}px`,
                    transform: `translate(${at.x - c.x}px, ${at.y - c.y}px) scale(${scale})`,
                  }}
                >
                  <iframe
                    className="radar-modal-frame radar-modal-frame--locked"
                    src={radarUrl(layer.view)}
                    title="NWS radar, enlarged"
                    style={{ top: -chromeTop, width, height: iframeHeight }}
                    onLoad={() => {
                      if (!layer.ready) setTimeout(() => markReady(layer.id), SETTLE_MS);
                    }}
                  />
                </div>
              );
            })}
          {target && width > 0 && alerts.data && (
            <div className="alert-outlines-wrap">
              <AlertOutlines
                alerts={alerts.data}
                iframe={specFor(target)}
                visible={{ top: chromeTop, width, height }}
                highlight={highlight}
              />
            </div>
          )}
          <div
            className="radar-gesture"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endPointer}
            onPointerCancel={endPointer}
            onPointerLeave={() => setHover(null)}
            onWheel={onWheel}
            onDoubleClick={onDoubleClick}
          />
          {hover && <AlertTooltip info={hover} width={width} height={height} />}
          {refreshing && <div className="radar-updating">Updating map…</div>}
          <div className="radar-modal-alerts">
            <MapAlerts live={alerts} open={alertsOpen} onToggle={onToggleAlerts} />
          </div>
          <div className="radar-modal-controls">
            <button type="button" className="radar-ctl" onClick={() => zoomBy(1)} disabled={!target || target.zoom >= MAX_ZOOM} aria-label="Zoom in">
              +
            </button>
            <button type="button" className="radar-ctl" onClick={() => zoomBy(-1)} disabled={!target || target.zoom <= MIN_ZOOM} aria-label="Zoom out">
              −
            </button>
            <button
              type="button"
              className="radar-ctl radar-ctl--wide"
              onClick={() => home.current && setTarget(home.current)}
              disabled={!target || !home.current || samePosition(target, home.current)}
            >
              Reset view
            </button>
            <OutlineLegend />
          </div>
        </div>
      </div>
    </div>
  );
}
