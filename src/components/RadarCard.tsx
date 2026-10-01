// Embeds NWS's own radar viewer, pre-configured to National Composite
// Reflectivity (mosaicked from all nearby radar sites) centered on
// Altoona. The `settings` payload is base64 of a JSON view-state object
// (agenda.id "national", layer "bref_qcd" = quality-controlled base
// reflectivity composite; menu: false); radar.weather.gov sends no
// X-Frame-Options/CSP that would block framing it.
//
// This used to be "Local radar / Super Resolution Base Reflectivity"
// for station KDMX specifically, which only shows data within that one
// radar's own range (~150 miles) — fine at a tight zoom, but once the
// card was widened to show multiple states, most of the frame outside
// Iowa was simply blank (no data from KDMX that far out), not actually
// clear skies. The composite mosaic has no such single-station range
// limit, at the cost of losing super-resolution detail. Unlike the
// local/station view, this agenda has no "station" binding forcing a
// recenter on load, so our custom center actually sticks here.
//
// NWS's chrome (a 56+104px banner/title block top-left, and a 100px
// timeline/controls/legend bar bottom-left) is pinned to the iframe's own
// viewport corners at fixed pixel sizes we can't reach into (cross-origin)
// — identical dimensions to the local view, measured separately. So we
// still render it taller than what we show and crop both top and bottom
// entirely via CSS (see .radar-frame-wrap/.radar-frame in App.css) — the
// bottom bar sits over the SW/W part of the map, where storms approach
// from here, so it's cropped away rather than just trimmed. "Full view"
// still gives the interactive version with working pause/zoom. These are
// exact measurements against NWS's current layout — if they redesign the
// page, this crop may need re-tuning.
const RADAR_SETTINGS =
  "v1_eyJhZ2VuZGEiOnsiaWQiOiJuYXRpb25hbCIsImNlbnRlciI6Wy05My43MjMsNDEuNzMxXSwibG9jYXRpb24iOm51bGwsInpvb20iOjYuNSwibGF5ZXIiOiJicmVmX3FjZCJ9LCJhbmltYXRpbmciOnRydWUsImJhc2UiOiJzdGFuZGFyZCIsImFydGNjIjpmYWxzZSwiY291bnR5IjpmYWxzZSwiY3dhIjpmYWxzZSwicmZjIjpmYWxzZSwic3RhdGUiOmZhbHNlLCJtZW51IjpmYWxzZSwic2hvcnRGdXNlZE9ubHkiOnRydWUsIm9wYWNpdHkiOnsiYWxlcnRzIjowLjgsImxvY2FsIjowLjYsImxvY2FsU3RhdGlvbnMiOjAuOCwibmF0aW9uYWwiOjAuNn19";
const RADAR_URL = `https://radar.weather.gov/?settings=${RADAR_SETTINGS}`;

export function RadarCard() {
  return (
    <section className="card radar-card">
      <div className="card-header">
        <h2>Radar — Composite Reflectivity</h2>
        <a className="radar-link" href={RADAR_URL} target="_blank" rel="noreferrer">
          Full view ↗
        </a>
      </div>
      <div className="radar-frame-wrap">
        <iframe
          className="radar-frame"
          src={RADAR_URL}
          title="NWS National Composite Reflectivity radar"
        />
      </div>
    </section>
  );
}
