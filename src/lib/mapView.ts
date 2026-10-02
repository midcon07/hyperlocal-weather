// Maps latitude/longitude to pixels inside the NWS radar iframe, so alert
// outlines can be drawn over it. Only valid while the embedded map is
// sitting at the view we asked for (we can't read its state, so the page
// never lets the user pan it while outlines are showing).
//
// NWS's viewer is a Web Mercator map with 256px tiles: at zoom z the world
// is 256 * 2^z pixels wide. The map canvas fills the iframe below its top
// banner, and our requested center sits in the middle of that canvas. Both
// facts were calibrated against known city positions (Des Moines, Kansas
// City, Chicago) in the rendered map.

export const MAP_CENTER = { lon: -93.723, lat: 41.731 };
export const MAP_DEFAULT_ZOOM = 6.5;

// Height of the white NWS banner that sits above the map canvas. Checked at
// both desktop (1134px) and phone (360px) iframe widths.
const BANNER_HEIGHT = 56;

const mercatorY = (latDeg: number) => Math.log(Math.tan(Math.PI / 4 + (latDeg * Math.PI) / 360));

export interface MapViewSpec {
  /** Iframe size in its own CSS pixels. */
  width: number;
  height: number;
  zoom: number;
}

export function makeProjector({ width, height, zoom }: MapViewSpec) {
  const pxPerRadian = (256 * 2 ** zoom) / (2 * Math.PI);
  const cx = width / 2;
  const cy = BANNER_HEIGHT + (height - BANNER_HEIGHT) / 2;
  const cyMerc = mercatorY(MAP_CENTER.lat);
  return (lon: number, lat: number) => ({
    x: cx + ((lon - MAP_CENTER.lon) * Math.PI * pxPerRadian) / 180,
    y: cy - (mercatorY(lat) - cyMerc) * pxPerRadian,
  });
}
