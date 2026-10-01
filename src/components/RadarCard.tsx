// Embeds NWS's own radar viewer, pre-configured to KDMX's Local radar /
// Super Resolution Base Reflectivity product with the side menu hidden.
// The `settings` payload is just base64 of a JSON view-state object
// (agenda.layer "sr_bref" = super-res base reflectivity, station "KDMX",
// menu: false); radar.weather.gov sends no X-Frame-Options/CSP that would
// block framing it.
//
// NWS's chrome (a 56+104px banner/title block top-left, and a 100px
// timeline/controls/legend bar bottom-left) is pinned to the iframe's own
// viewport corners at fixed pixel sizes we can't reach into (cross-origin).
// So instead of hiding pieces inside the iframe, we render it taller than
// what we show and crop both top and bottom entirely via CSS (see
// .radar-frame-wrap/.radar-frame in App.css) — the bottom bar sits over
// the SW/W part of the map, where storms approach from here, so it's
// cropped away rather than just trimmed. "Full view" still gives the
// interactive version with working pause/zoom. These are exact
// measurements against NWS's current layout — if they redesign the page,
// this crop may need re-tuning.
// zoom 6.5 (vs. NWS's integer default) — a middle ground between the
// original zoom 7 (too tight around Iowa) and zoom 6 (loses too much
// local detail, shows nearly the whole central US). Fractional zoom
// levels work fine here even though the picker UI only offers integers.
const RADAR_SETTINGS =
  "v1_eyJhZ2VuZGEiOnsiaWQiOiJsb2NhbCIsImNlbnRlciI6Wy05My43MjMsNDEuNzMxXSwibG9jYXRpb24iOm51bGwsInpvb20iOjYuNSwiZmlsdGVyIjpudWxsLCJsYXllciI6InNyX2JyZWYiLCJzdGF0aW9uIjoiS0RNWCJ9LCJhbmltYXRpbmciOnRydWUsImJhc2UiOiJzdGFuZGFyZCIsImFydGNjIjpmYWxzZSwiY291bnR5IjpmYWxzZSwiY3dhIjpmYWxzZSwicmZjIjpmYWxzZSwic3RhdGUiOmZhbHNlLCJtZW51IjpmYWxzZSwic2hvcnRGdXNlZE9ubHkiOnRydWUsIm9wYWNpdHkiOnsiYWxlcnRzIjowLjgsImxvY2FsIjowLjYsImxvY2FsU3RhdGlvbnMiOjAuOCwibmF0aW9uYWwiOjAuNn19";
const RADAR_URL = `https://radar.weather.gov/?settings=${RADAR_SETTINGS}`;

export function RadarCard() {
  return (
    <section className="card radar-card">
      <div className="card-header">
        <h2>Radar — KDMX Super-Res Base Reflectivity</h2>
        <a className="radar-link" href={RADAR_URL} target="_blank" rel="noreferrer">
          Full view ↗
        </a>
      </div>
      <div className="radar-frame-wrap">
        <iframe
          className="radar-frame"
          src={RADAR_URL}
          title="NWS KDMX local radar — Super Resolution Base Reflectivity"
        />
      </div>
    </section>
  );
}
