import { useEffect, useState } from "react";
import { useElementWidth } from "../hooks/useElementWidth";
import { useMapAlertsLive } from "../hooks/useMapAlertsLive";
import { MAP_DEFAULT_ZOOM } from "../lib/mapView";
import { CHROME_TOP, NATIVE_HEIGHT, VISIBLE_HEIGHT, layoutFor, radarUrl } from "../lib/radarEmbed";
import { AlertOutlines, AlertTooltip, alertsAt } from "./AlertOutlines";
import type { HoverInfo } from "./AlertOutlines";
import { MapAlerts } from "./MapAlerts";
import { RadarModal } from "./RadarModal";

// The radar card: NWS's national composite reflectivity, centered on Altoona,
// shown as a small preview. The iframe renders at a fixed native size (so the
// map coverage is identical on every device), is shifted up by NWS's banner,
// cut above its playback bar, and scaled down with a CSS transform to fit the
// card. Clicking it opens the enlarged map (RadarModal), which you can drag
// and zoom. Shared embed facts live in lib/radarEmbed.ts.
const RADAR_URL = radarUrl();

export function RadarCard() {
  const { ref, width } = useElementWidth();
  const [open, setOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [cardHover, setCardHover] = useState<HoverInfo | null>(null);
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
              <iframe
                className="radar-frame"
                src={RADAR_URL}
                title="NWS National Composite Reflectivity radar"
                tabIndex={-1}
                style={{ top: -CHROME_TOP, width: nativeWidth, height: NATIVE_HEIGHT }}
              />
              {alerts.data && (
                <div className="alert-outlines-wrap">
                  <AlertOutlines
                    alerts={alerts.data}
                    iframe={{ width: nativeWidth, height: NATIVE_HEIGHT, zoom: MAP_DEFAULT_ZOOM }}
                    visible={{ top: CHROME_TOP, width: nativeWidth, height: VISIBLE_HEIGHT }}
                    highlight={new Set(cardHover?.alerts.map((a) => a.id))}
                  />
                </div>
              )}
            </div>
            <button
              type="button"
              className="radar-expand"
              onClick={() => setOpen(true)}
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const hit = alertsAt(e.clientX, e.clientY, alerts.data ?? []);
                setCardHover(hit.length ? { alerts: hit, x: e.clientX - rect.left, y: e.clientY - rect.top } : null);
              }}
              onMouseLeave={() => setCardHover(null)}
              aria-label="Enlarge radar"
            >
              <span className="radar-expand-pill">Click to enlarge</span>
            </button>
            {cardHover && <AlertTooltip info={cardHover} width={width} height={VISIBLE_HEIGHT * scale} />}
            <div className="radar-card-alerts">
              <MapAlerts
                live={alerts}
                compact
                open={false}
                onToggle={() => {
                  setAlertsOpen(true);
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
        />
      )}
    </section>
  );
}
