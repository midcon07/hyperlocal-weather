import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { useElementWidth } from "../hooks/useElementWidth";
import { useMapAlertsLive } from "../hooks/useMapAlertsLive";
import { samePosition, useRadarMap } from "../hooks/useRadarMap";
import { MAP_CENTER, MAP_DEFAULT_ZOOM } from "../lib/mapView";
import { CHROME_TOP, NATIVE_HEIGHT, OVERSCAN, VISIBLE_HEIGHT, layoutFor, radarUrl } from "../lib/radarEmbed";
import { AlertOutlines, AlertTooltip, alertsAt } from "./AlertOutlines";
import type { HoverInfo } from "./AlertOutlines";
import { MapAlerts } from "./MapAlerts";
import { RadarLayers } from "./RadarLayers";
import { RadarModal } from "./RadarModal";

// The radar card: NWS's national composite reflectivity, centered on Altoona,
// shown as a small preview. The map is drawn at a fixed native size (so the
// coverage is identical on every device), cropped past NWS's banner and
// playback bar, and scaled down with a CSS transform to fit the card. With a
// mouse you can drag it to look around; a click opens the enlarged map (see
// RadarModal) at the same spot. On touch screens a one-finger drag has to
// scroll the page, so there a tap enlarges and the enlarged map is where you
// drag and pinch. Shared embed facts live in lib/radarEmbed.ts.
const RADAR_URL = radarUrl();
const HOME_VIEW = { ...MAP_CENTER, zoom: MAP_DEFAULT_ZOOM };
const DRAG_PX = 5;

export function RadarCard() {
  const { ref, width } = useElementWidth();
  const [open, setOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [cardHover, setCardHover] = useState<HoverInfo | null>(null);
  const [detailIds, setDetailIds] = useState<string[]>([]);
  const alerts = useMapAlertsLive();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const { scale, nativeWidth } = layoutFor(width);
  const map = useRadarMap({
    width: nativeWidth,
    height: VISIBLE_HEIGHT,
    chromeTop: CHROME_TOP,
    chromeBottom: NATIVE_HEIGHT - VISIBLE_HEIGHT - CHROME_TOP,
    margin: OVERSCAN,
    initial: width > 0 ? HOME_VIEW : null,
  });
  const { target, setTarget, panBy } = map;
  const moved = !!target && !samePosition(target, HOME_VIEW);

  // Mouse drag to pan. The press only counts as a drag past a few pixels, and
  // a drag must not also fire the click that enlarges the map.
  const press = useRef<{ x: number; y: number; lastX: number; lastY: number; dragged: boolean } | null>(null);
  const suppressClick = useRef(false);

  const hoverAt = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const hit = alertsAt(e.clientX, e.clientY, alerts.data ?? []);
    setCardHover(hit.length ? { alerts: hit, x: e.clientX - rect.left, y: e.clientY - rect.top } : null);
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (e.pointerType !== "mouse" || e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    press.current = { x: e.clientX, y: e.clientY, lastX: e.clientX, lastY: e.clientY, dragged: false };
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const p = press.current;
    if (!p) {
      if (e.pointerType === "mouse") hoverAt(e);
      return;
    }
    if (Math.hypot(e.clientX - p.x, e.clientY - p.y) > DRAG_PX) p.dragged = true;
    // Screen pixels to the map's native pixels.
    const dx = (e.clientX - p.lastX) / scale;
    const dy = (e.clientY - p.lastY) / scale;
    p.lastX = e.clientX;
    p.lastY = e.clientY;
    setTarget((t) => (t ? panBy(t, dx, dy) : t));
    setCardHover(null);
  };

  const onPointerUp = () => {
    if (press.current?.dragged) {
      suppressClick.current = true;
      setTimeout(() => (suppressClick.current = false), 0);
    }
    press.current = null;
  };

  return (
    <section className="card radar-card">
      <div className="card-header">
        <h2>Radar</h2>
        <a className="radar-link" href={RADAR_URL} target="_blank" rel="noreferrer">
          Open in new tab ↗
        </a>
      </div>
      <div className="radar-measure" ref={ref}>
        {width > 0 && (
          <div className="radar-frame-wrap" style={{ width, height: VISIBLE_HEIGHT * scale }}>
            <div
              className="radar-scale"
              style={{ width: nativeWidth, height: VISIBLE_HEIGHT, transform: `scale(${scale})` }}
            >
              <RadarLayers
                map={map}
                width={nativeWidth}
                height={VISIBLE_HEIGHT}
                chromeTop={CHROME_TOP}
                frameClass="radar-frame"
              />
              {target && alerts.data && (
                <div className="alert-outlines-wrap">
                  <AlertOutlines
                    alerts={alerts.data}
                    iframe={map.specFor(target)}
                    visible={{ left: OVERSCAN, top: CHROME_TOP + OVERSCAN, width: nativeWidth, height: VISIBLE_HEIGHT }}
                    highlight={new Set(cardHover?.alerts.map((a) => a.id))}
                  />
                </div>
              )}
            </div>
            <button
              type="button"
              className="radar-expand"
              onClick={(e) => {
                if (suppressClick.current) return;
                // Clicking on an alert area opens the enlarged map with that
                // alert's full text; clicking bare map just enlarges.
                setDetailIds(alertsAt(e.clientX, e.clientY, alerts.data ?? []).map((a) => a.id));
                setOpen(true);
              }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              onPointerLeave={() => setCardHover(null)}
              aria-label="Enlarge radar"
            >
              <span className="radar-expand-pill">
                <span className="hint-mouse">Drag to move · click to enlarge</span>
                <span className="hint-touch">Tap to enlarge</span>
              </span>
            </button>
            {cardHover && <AlertTooltip info={cardHover} width={width} height={VISIBLE_HEIGHT * scale} />}
            {map.refreshing && <div className="radar-updating">Updating map…</div>}
            {moved && (
              <button type="button" className="radar-reset" onClick={() => setTarget(HOME_VIEW)}>
                Reset view
              </button>
            )}
            <div className="radar-card-alerts">
              <MapAlerts
                live={alerts}
                compact
                open={false}
                onToggle={() => {
                  setAlertsOpen(true);
                  setDetailIds([]);
                  setOpen(true);
                }}
              />
            </div>
          </div>
        )}
      </div>

      {open && (
        <RadarModal
          alerts={alerts}
          alertsOpen={alertsOpen}
          onToggleAlerts={() => setAlertsOpen((v) => !v)}
          onClose={() => setOpen(false)}
          coverageWidth={nativeWidth}
          startView={target}
          initialDetailIds={detailIds}
        />
      )}
    </section>
  );
}
