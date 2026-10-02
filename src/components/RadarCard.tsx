import { useEffect, useState } from "react";
import type { MapAlert } from "../api/mapAlerts";
import { useElementSize, useElementWidth } from "../hooks/useElementWidth";
import { useMapAlertsLive } from "../hooks/useMapAlertsLive";
import type { LiveSourceState } from "../hooks/useLiveSource";
import { MAP_DEFAULT_ZOOM } from "../lib/mapView";
import { AlertOutlines, OutlineLegend } from "./AlertOutlines";
import { MapAlerts } from "./MapAlerts";

// Embeds NWS's own radar viewer, pre-configured to National Composite
// Reflectivity (mosaicked from all nearby radar sites) centered on
// Altoona. The `settings` payload is base64 of a JSON view-state object
// (agenda.id "national", layer "bref_qcd" = quality-controlled base
// reflectivity composite; menu: false); radar.weather.gov sends no
// X-Frame-Options/CSP that would block framing it.
//
// The composite mosaic (rather than a single KDMX station view) has no
// range limit, and unlike the local/station agenda it doesn't force a
// recenter on load, so our custom center sticks.
//
// NWS's chrome (a 160px banner/title block top-left, and a 100px
// timeline/controls/legend bar bottom-left) is pinned to the iframe's own
// viewport corners at fixed pixel sizes we can't reach into (cross-origin).
// The card version crops both away: the iframe renders at a fixed native
// size (so the map coverage is identical on every device), is shifted up
// by the top chrome, and is scaled down with a CSS transform to fit the
// card. Clicking it opens a large dialog with the uncropped, fully
// interactive viewer (pause, zoom, legend). These are exact measurements
// against NWS's current layout — if they redesign the page, this crop may
// need re-tuning.
const RADAR_SETTINGS =
  "v1_eyJhZ2VuZGEiOnsiaWQiOiJuYXRpb25hbCIsImNlbnRlciI6Wy05My43MjMsNDEuNzMxXSwibG9jYXRpb24iOm51bGwsInpvb20iOjYuNSwibGF5ZXIiOiJicmVmX3FjZCJ9LCJhbmltYXRpbmciOnRydWUsImJhc2UiOiJzdGFuZGFyZCIsImFydGNjIjpmYWxzZSwiY291bnR5IjpmYWxzZSwiY3dhIjpmYWxzZSwicmZjIjpmYWxzZSwic3RhdGUiOmZhbHNlLCJtZW51IjpmYWxzZSwic2hvcnRGdXNlZE9ubHkiOnRydWUsIm9wYWNpdHkiOnsiYWxlcnRzIjowLjgsImxvY2FsIjowLjYsImxvY2FsU3RhdGlvbnMiOjAuOCwibmF0aW9uYWwiOjAuNn19";

// The same embed URL with the zoom swapped in (the alert view's +/- buttons
// reload the map at a new zoom so we always know where it is).
function radarUrl(zoom: number = MAP_DEFAULT_ZOOM) {
  const settings = JSON.parse(atob(RADAR_SETTINGS.slice(3)));
  settings.agenda.zoom = zoom;
  return `https://radar.weather.gov/?settings=v1_${encodeURIComponent(btoa(JSON.stringify(settings)))}`;
}

const RADAR_URL = radarUrl();

// The coverage the card shows, in NWS's own pixels: a 1100px-wide window
// onto a 1110px-tall iframe, with the top 160px (banner) shifted off and
// the bottom 100px (playback bar) cut, leaving 850px visible.
const NATIVE_WIDTH = 1100;
const NATIVE_HEIGHT = 1110;
const CHROME_TOP = 160;
const VISIBLE_HEIGHT = 850;
// Never shrink below this on phones; below ~half size NWS's city labels
// stop being legible, so phones show a bit less width instead.
const MIN_SCALE = 0.5;
// NWS switches to a taller mobile banner at <=600px iframe width, so the
// iframe is never rendered narrower than this.
const MIN_NATIVE_WIDTH = 620;

function layoutFor(containerWidth: number) {
  const wide = containerWidth >= NATIVE_WIDTH * MIN_SCALE;
  const scale = wide
    ? Math.min(1, containerWidth / NATIVE_WIDTH)
    : Math.min(MIN_SCALE, containerWidth / MIN_NATIVE_WIDTH);
  return { scale, nativeWidth: containerWidth / scale };
}

// NWS's top banner renders taller at <=600px iframe width (measured).
const CHROME_TOP_NARROW = 230;
const CHROME_BOTTOM = 100;

interface ModalProps {
  alerts: LiveSourceState<MapAlert[]>;
  alertsOpen: boolean;
  onToggleAlerts: () => void;
  onClose: () => void;
}

const MIN_ZOOM = 5.5;
const MAX_ZOOM = 8.5;

// The enlarged radar: the same crop as the card (NWS's banner, menu panel
// and playback bar are cut off) at the size of the dialog. Our own alerts
// button takes the place of the NWS one that lived in the cropped panel.
//
// Two modes. In the default "alert view" the map is held at a view we
// control (center + zoom, changed with the +/- buttons, which reload it),
// so alert outlines can be drawn on it accurately. "Explore" hands the map
// back to NWS's own mouse/touch pan and zoom, and hides the outlines,
// because once the user moves the map we can no longer tell where it is.
function RadarModal({ alerts, alertsOpen, onToggleAlerts, onClose }: ModalProps) {
  const { ref, width, height } = useElementSize();
  const [zoom, setZoom] = useState(MAP_DEFAULT_ZOOM);
  const [explore, setExplore] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const chromeTop = width > 600 ? CHROME_TOP : CHROME_TOP_NARROW;
  const iframeHeight = height + chromeTop + CHROME_BOTTOM;

  const changeZoom = (delta: number) => setZoom((z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z + delta)));

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
          {width > 0 && (
            <iframe
              key={`${zoom}-${resetKey}`}
              className={`radar-modal-frame${explore ? "" : " radar-modal-frame--locked"}`}
              src={radarUrl(zoom)}
              title="NWS radar, enlarged"
              style={{ top: -chromeTop, width, height: iframeHeight }}
            />
          )}
          {width > 0 && !explore && alerts.data && (
            <div className="alert-outlines-wrap">
              <AlertOutlines
                alerts={alerts.data}
                iframe={{ width, height: iframeHeight, zoom }}
                visible={{ top: chromeTop, width, height }}
              />
            </div>
          )}
          <div className="radar-modal-alerts">
            <MapAlerts live={alerts} open={alertsOpen} onToggle={onToggleAlerts} />
          </div>
          <div className="radar-modal-controls">
            {explore ? (
              <button
                type="button"
                className="radar-ctl radar-ctl--wide"
                onClick={() => {
                  setExplore(false);
                  setResetKey((k) => k + 1);
                }}
              >
                Back to alert view
              </button>
            ) : (
              <>
                <button type="button" className="radar-ctl" onClick={() => changeZoom(1)} disabled={zoom >= MAX_ZOOM} aria-label="Zoom in">
                  +
                </button>
                <button type="button" className="radar-ctl" onClick={() => changeZoom(-1)} disabled={zoom <= MIN_ZOOM} aria-label="Zoom out">
                  −
                </button>
                <button type="button" className="radar-ctl radar-ctl--wide" onClick={() => setExplore(true)}>
                  Pan &amp; explore
                </button>
                <OutlineLegend />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function RadarCard() {
  const { ref, width } = useElementWidth();
  const [open, setOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);
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
                  />
                </div>
              )}
            </div>
            <button type="button" className="radar-expand" onClick={() => setOpen(true)} aria-label="Enlarge radar">
              <span className="radar-expand-pill">Click to enlarge</span>
            </button>
            <div className="radar-card-alerts">
              <MapAlerts
                live={alerts}
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
        />
      )}
    </section>
  );
}
