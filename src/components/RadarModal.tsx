import { useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent, MouseEvent as ReactMouseEvent } from "react";
import type { MapAlert } from "../api/mapAlerts";
import { useElementSize } from "../hooks/useElementWidth";
import type { LiveSourceState } from "../hooks/useLiveSource";
import { MAX_ZOOM, MIN_ZOOM, clampPosition, samePosition, useRadarMap } from "../hooks/useRadarMap";
import { MAP_CENTER, MAP_DEFAULT_ZOOM } from "../lib/mapView";
import { CHROME_BOTTOM, CHROME_TOP, OVERSCAN, VISIBLE_HEIGHT, mapPageUrl, radarUrl } from "../lib/radarEmbed";
import type { MapPosition } from "../lib/radarEmbed";
import { alertsNearPoint } from "../lib/alertHit";
import { AlertOutlines, AlertTooltip, OutlineLegend } from "./AlertOutlines";
import type { HoverInfo } from "./AlertOutlines";
import { AlertDetails } from "./AlertDetails";
import { MapAlerts } from "./MapAlerts";
import { RadarLayers } from "./RadarLayers";

// The enlarged radar: NWS's radar cropped past its banner, menu panel and
// playback bar, at the size of the dialog, with our own alerts button in
// place of the NWS one that lived in the cropped panel. Dragging, the mouse
// wheel, double-click, pinching and the +/- buttons move the map (see
// useRadarMap for how the NWS map is kept in step with our own position).

const DRAG_PX = 5;
// A fingertip wobbles more than a mouse, so a touch press counts as a drag
// only after more movement, and a tap may land farther from a thin shape.
const TOUCH_DRAG_PX = 10;
const HOVER_TOLERANCE_PX = 7;
const TAP_TOLERANCE_PX = 22;

interface Props {
  alerts: LiveSourceState<MapAlert[]>;
  alertsOpen: boolean;
  onToggleAlerts: () => void;
  /** Closes the dialog; not used on the full-tab page. */
  onClose?: () => void;
  /** Full-tab page rather than a dialog over the dashboard. */
  page?: boolean;
  /** Native width of the small map; the first view covers at least this much. */
  coverageWidth: number;
  /** Where the small map was looking when it was enlarged. */
  startView: MapPosition | null;
  /** Alerts the visitor clicked on the small map; their full text opens at once. */
  initialDetailIds?: string[];
}

export function RadarModal({
  alerts,
  alertsOpen,
  onToggleAlerts,
  onClose,
  page = false,
  coverageWidth,
  startView,
  initialDetailIds = [],
}: Props) {
  const { ref, width, height } = useElementSize();
  // With the overscan margin the iframe is always wider than 600px, so NWS's
  // desktop banner height applies even on a phone.
  const chromeTop = CHROME_TOP;

  // Zoom out just enough that this dialog shows at least what the small map
  // shows (so no alert disappears when it opens).
  const fit = Math.min(1, width / coverageWidth, height / VISIBLE_HEIGHT);
  const zoomAdjust = Math.log2(fit || 1);
  const start = startView ?? { ...MAP_CENTER, zoom: MAP_DEFAULT_ZOOM };
  const initial = width > 0 && height > 0 ? clampPosition({ ...start, zoom: start.zoom + zoomAdjust }) : null;
  const homeView = clampPosition({ ...MAP_CENTER, zoom: MAP_DEFAULT_ZOOM + zoomAdjust });

  const map = useRadarMap({ width, height, chromeTop, chromeBottom: CHROME_BOTTOM, margin: OVERSCAN, initial });
  const { target, setTarget, panBy, zoomAbout, centerOf } = map;

  // ---- Pointer gestures: drag to pan, wheel/pinch/double-click to zoom.
  const [hover, setHover] = useState<HoverInfo | null>(null);
  // The full text of the alerts the visitor clicked or tapped on.
  const [detail, setDetail] = useState<MapAlert[] | null>(() => {
    const ids = new Set(initialDetailIds);
    const found = (alerts.data ?? []).filter((a) => ids.has(a.id));
    return found.length ? found : null;
  });
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; mid: { x: number; y: number } } | null>(null);
  const drag = useRef({ moved: false, startX: 0, startY: 0 });

  const local = (e: { clientX: number; clientY: number; currentTarget: Element }) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  // Alerts at the pointer, by geometry; a finger gets a much bigger margin
  // than a mouse so thin river stretches can be tapped.
  const alertsAtPointer = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!target) return [];
    const pos = local(e);
    return alertsNearPoint(
      alerts.data ?? [],
      (lon, lat) => map.toScreen(target, lon, lat),
      pos.x,
      pos.y,
      e.pointerType === "touch" ? TAP_TOLERANCE_PX : HOVER_TOLERANCE_PX
    );
  };

  const showAlertsAt = (e: ReactPointerEvent<HTMLDivElement>) => {
    const hit = alertsAtPointer(e);
    setHover(hit.length ? { alerts: hit, ...local(e) } : null);
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Some touch browsers refuse capture; dragging still works without it.
    }
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
      const dragPx = e.pointerType === "touch" ? TOUCH_DRAG_PX : DRAG_PX;
      if (Math.hypot(e.clientX - drag.current.startX, e.clientY - drag.current.startY) > dragPx) drag.current.moved = true;
      setTarget((t) => (t ? panBy(t, pos.x - prev.x, pos.y - prev.y) : t));
    } else if (pointers.current.size === 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const last = pinch.current;
      setTarget((t) =>
        t ? zoomAbout(panBy(t, mid.x - last.mid.x, mid.y - last.mid.y), t.zoom + Math.log2(dist / last.dist), mid.x, mid.y) : t
      );
      pinch.current = { dist, mid };
    }
    if (drag.current.moved) setHover(null);
  };

  const endPointer = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.delete(e.pointerId);
    pinch.current = null;
    // A press that never turned into a drag is a click or tap: open the full
    // text of whatever alert is there (or close the text if it's empty map).
    if (pointers.current.size === 0 && !drag.current.moved && e.type === "pointerup") {
      const hit = alertsAtPointer(e);
      setDetail(hit.length ? hit : null);
      setHover(null);
    }
  };

  const onWheel = (e: ReactWheelEvent<HTMLDivElement>) => {
    const pos = local(e);
    const delta = e.deltaY * (e.deltaMode === 1 ? 16 : 1);
    setTarget((t) => (t ? zoomAbout(t, t.zoom - delta * 0.0022, pos.x, pos.y) : t));
    setHover(null);
  };

  const onDoubleClick = (e: ReactMouseEvent<HTMLDivElement>) => {
    const pos = local(e);
    setTarget((t) => (t ? zoomAbout(t, t.zoom + 1, pos.x, pos.y) : t));
  };

  const zoomBy = (delta: number) => {
    const c = target ? centerOf(target) : { x: width / 2, y: height / 2 };
    setTarget((t) => (t ? zoomAbout(t, t.zoom + delta, c.x, c.y) : t));
  };

  const highlight = new Set(hover?.alerts.map((a) => a.id));

  return (
    <div
      className={`radar-modal${page ? " radar-modal--page" : ""}`}
      role="dialog"
      aria-modal={!page}
      aria-label="Radar, enlarged"
      onClick={page ? undefined : onClose}
    >
      <div className="radar-modal-body" onClick={(e) => e.stopPropagation()}>
        <div className="radar-modal-bar">
          <strong>Radar — Composite Reflectivity</strong>
          <span>
            {page ? (
              <>
                <a className="radar-link" href={radarUrl()} target="_blank" rel="noreferrer">
                  NWS radar site ↗
                </a>
                <a className="radar-modal-close" href={import.meta.env.BASE_URL}>
                  ← Dashboard
                </a>
              </>
            ) : (
              <>
                <a className="radar-link" href={mapPageUrl(target)} target="_blank" rel="noreferrer">
                  Open in new tab ↗
                </a>
                <button type="button" className="radar-modal-close" onClick={onClose} autoFocus>
                  Close ✕
                </button>
              </>
            )}
          </span>
        </div>
        <div className="radar-modal-map" ref={ref}>
          <RadarLayers
            map={map}
            width={width}
            height={height}
            chromeTop={chromeTop}
            frameClass="radar-modal-frame radar-modal-frame--locked"
          />
          {target && width > 0 && alerts.data && (
            <div className="alert-outlines-wrap">
              <AlertOutlines
                alerts={alerts.data}
                iframe={map.specFor(target)}
                visible={{ left: OVERSCAN, top: chromeTop + OVERSCAN, width, height }}
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
            onPointerLeave={(e) => {
              // Touch pointers "leave" the instant a finger lifts; that must not
              // dismiss anything.
              if (e.pointerType === "mouse") setHover(null);
            }}
            onWheel={onWheel}
            onDoubleClick={onDoubleClick}
          />
          {hover && <AlertTooltip info={hover} width={width} height={height} />}
          {detail && (
            <AlertDetails key={detail.map((a) => a.id).join("|")} alerts={detail} onClose={() => setDetail(null)} />
          )}
          {map.refreshing && <div className="radar-updating">Updating map…</div>}
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
              onClick={() => setTarget(homeView)}
              disabled={!target || samePosition(target, homeView)}
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
