import { useEffect, useState } from "react";
import type { MapAlert } from "../api/mapAlerts";
import { useElementSize, useElementWidth } from "../hooks/useElementWidth";
import { useMapAlertsLive } from "../hooks/useMapAlertsLive";
import type { LiveSourceState } from "../hooks/useLiveSource";
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
const RADAR_URL = `https://radar.weather.gov/?settings=${RADAR_SETTINGS}`;

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

// The enlarged radar: the same crop as the card (NWS's banner, menu panel
// and playback bar are cut off) at the size of the dialog, fully
// interactive by mouse wheel, drag and pinch. Our own alerts button takes
// the place of the NWS one that lived in the cropped panel.
function RadarModal({ alerts, alertsOpen, onToggleAlerts, onClose }: ModalProps) {
  const { ref, width, height } = useElementSize();
  const chromeTop = width > 600 ? CHROME_TOP : CHROME_TOP_NARROW;

  return (
    <div className="radar-modal" role="dialog" aria-modal="true" aria-label="Radar, enlarged" onClick={onClose}>
      <div className="radar-modal-body" onClick={(e) => e.stopPropagation()}>
        <div className="radar-modal-bar">
          <strong>Radar — Composite Reflectivity</strong>
          <span>
            <a className="radar-link" href={RADAR_URL} target="_blank" rel="noreferrer">
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
              className="radar-modal-frame"
              src={RADAR_URL}
              title="NWS radar, enlarged"
              style={{ top: -chromeTop, width, height: height + chromeTop + CHROME_BOTTOM }}
            />
          )}
          <div className="radar-modal-alerts">
            <MapAlerts live={alerts} open={alertsOpen} onToggle={onToggleAlerts} />
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
