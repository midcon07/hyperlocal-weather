// Embeds NWS's own radar viewer, pre-configured to KDMX's Local radar /
// Super Resolution Base Reflectivity product with the side menu hidden.
// The `settings` payload is just base64 of a JSON view-state object
// (agenda.layer "sr_bref" = super-res base reflectivity, station "KDMX",
// menu: false); radar.weather.gov sends no X-Frame-Options/CSP that would
// block framing it.
const RADAR_SETTINGS =
  "v1_eyJhZ2VuZGEiOnsiaWQiOiJsb2NhbCIsImNlbnRlciI6Wy05My43MjMsNDEuNzMxXSwibG9jYXRpb24iOm51bGwsInpvb20iOjcsImZpbHRlciI6bnVsbCwibGF5ZXIiOiJzcl9icmVmIiwic3RhdGlvbiI6IktETVgifSwiYW5pbWF0aW5nIjp0cnVlLCJiYXNlIjoic3RhbmRhcmQiLCJhcnRjYyI6ZmFsc2UsImNvdW50eSI6ZmFsc2UsImN3YSI6ZmFsc2UsInJmYyI6ZmFsc2UsInN0YXRlIjpmYWxzZSwibWVudSI6ZmFsc2UsInNob3J0RnVzZWRPbmx5Ijp0cnVlLCJvcGFjaXR5Ijp7ImFsZXJ0cyI6MC44LCJsb2NhbCI6MC42LCJsb2NhbFN0YXRpb25zIjowLjgsIm5hdGlvbmFsIjowLjZ9fQ%3D%3D";
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
      <iframe
        className="radar-frame"
        src={RADAR_URL}
        title="NWS KDMX local radar — Super Resolution Base Reflectivity"
        loading="lazy"
      />
    </section>
  );
}
