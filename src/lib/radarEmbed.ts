import { MAP_CENTER, MAP_DEFAULT_ZOOM } from "./mapView";

// Shared facts about NWS's radar.weather.gov embed.
//
// The `settings` payload is base64 of a JSON view-state object (agenda.id
// "national", layer "bref_qcd" = quality-controlled base reflectivity
// composite; menu: false); radar.weather.gov sends no X-Frame-Options/CSP
// that would block framing it. The composite mosaic has no single-station
// range limit.
//
// NWS's chrome (a 160px banner/menu block top-left, and a 100px
// timeline/controls/legend bar bottom-left) is pinned to the iframe's own
// viewport corners at fixed pixel sizes we can't reach into (cross-origin),
// so both the card and the enlarged map render the iframe taller than they
// show and crop those away. These are exact measurements against NWS's
// current layout; if they redesign the page the crop may need re-tuning.
const RADAR_SETTINGS =
  "v1_eyJhZ2VuZGEiOnsiaWQiOiJuYXRpb25hbCIsImNlbnRlciI6Wy05My43MjMsNDEuNzMxXSwibG9jYXRpb24iOm51bGwsInpvb20iOjYuNSwibGF5ZXIiOiJicmVmX3FjZCJ9LCJhbmltYXRpbmciOnRydWUsImJhc2UiOiJzdGFuZGFyZCIsImFydGNjIjpmYWxzZSwiY291bnR5IjpmYWxzZSwiY3dhIjpmYWxzZSwicmZjIjpmYWxzZSwic3RhdGUiOmZhbHNlLCJtZW51IjpmYWxzZSwic2hvcnRGdXNlZE9ubHkiOnRydWUsIm9wYWNpdHkiOnsiYWxlcnRzIjowLjgsImxvY2FsIjowLjYsImxvY2FsU3RhdGlvbnMiOjAuOCwibmF0aW9uYWwiOjAuNn19";

export interface MapPosition {
  lon: number;
  lat: number;
  zoom: number;
}

// The embed URL for a given map position (defaults to the home view).
export function radarUrl(view: MapPosition = { ...MAP_CENTER, zoom: MAP_DEFAULT_ZOOM }) {
  const settings = JSON.parse(atob(RADAR_SETTINGS.slice(3)));
  settings.agenda.center = [Math.round(view.lon * 10000) / 10000, Math.round(view.lat * 10000) / 10000];
  settings.agenda.zoom = Math.round(view.zoom * 1000) / 1000;
  return `https://radar.weather.gov/?settings=v1_${encodeURIComponent(btoa(JSON.stringify(settings)))}`;
}

// The full-tab version of our enlarged map (src/components/RadarPage.tsx):
// "Open in new tab" goes here, not to radar.weather.gov, so the alert outlines
// and warning text come along. The view being looked at travels in the URL.
export function mapPageUrl(view?: MapPosition | null) {
  const params = new URLSearchParams({ map: "1" });
  if (view) {
    params.set("lon", view.lon.toFixed(3));
    params.set("lat", view.lat.toFixed(3));
    params.set("z", view.zoom.toFixed(2));
  }
  return `${import.meta.env.BASE_URL}?${params.toString()}`;
}

export function isMapPage(search: string) {
  return new URLSearchParams(search).get("map") === "1";
}

export function mapPageStart(search: string): MapPosition | null {
  const params = new URLSearchParams(search);
  const lon = Number(params.get("lon"));
  const lat = Number(params.get("lat"));
  const zoom = Number(params.get("z"));
  return params.has("lon") && params.has("lat") && params.has("z") && [lon, lat, zoom].every(Number.isFinite)
    ? { lon, lat, zoom }
    : null;
}

// The card shows a 1100px-wide window onto a 1110px-tall iframe, with the top
// 160px shifted off and the bottom 100px cut, leaving 850px visible.
export const NATIVE_WIDTH = 1100;
export const NATIVE_HEIGHT = 1110;
export const CHROME_TOP = 160;
export const VISIBLE_HEIGHT = 850;
// NWS's top banner renders taller at <=600px iframe width (measured).
export const CHROME_TOP_NARROW = 230;
export const CHROME_BOTTOM = 100;
// Extra map loaded on every side of what is visible (native pixels), so short
// drags show real map right away. It also keeps every iframe wider than the
// 600px at which NWS switches to its taller mobile banner.
export const OVERSCAN = 240;
// Never shrink below this on phones; below ~half size NWS's city labels stop
// being legible, so phones show a bit less width instead.
export const MIN_SCALE = 0.5;
// NWS switches to a taller mobile banner at <=600px iframe width, so the
// iframe is never rendered narrower than this.
export const MIN_NATIVE_WIDTH = 620;

export function layoutFor(containerWidth: number) {
  const wide = containerWidth >= NATIVE_WIDTH * MIN_SCALE;
  const scale = wide
    ? Math.min(1, containerWidth / NATIVE_WIDTH)
    : Math.min(MIN_SCALE, containerWidth / MIN_NATIVE_WIDTH);
  return { scale, nativeWidth: containerWidth / scale };
}
