// Maps latitude/longitude to pixels inside the NWS radar iframe (and back),
// so alert outlines can be drawn over it and our own drag/zoom can steer it.
// Only valid while the embedded map is sitting at the view we asked for: we
// can't read its state, so the page itself owns panning and zooming (see
// RadarModal.tsx) and always knows where the map is.
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
const latFromMercatorY = (y: number) => ((2 * Math.atan(Math.exp(y)) - Math.PI / 2) * 180) / Math.PI;

export interface MapViewSpec {
  /** Iframe size in its own CSS pixels. */
  width: number;
  height: number;
  zoom: number;
  /** Where the map is centered; defaults to MAP_CENTER. */
  center?: { lon: number; lat: number };
}

function geometry({ width, height, zoom, center = MAP_CENTER }: MapViewSpec) {
  return {
    center,
    pxPerRadian: (256 * 2 ** zoom) / (2 * Math.PI),
    cx: width / 2,
    cy: BANNER_HEIGHT + (height - BANNER_HEIGHT) / 2,
    cyMerc: mercatorY(center.lat),
  };
}

export function makeProjector(spec: MapViewSpec) {
  const g = geometry(spec);
  return (lon: number, lat: number) => ({
    x: g.cx + ((lon - g.center.lon) * Math.PI * g.pxPerRadian) / 180,
    y: g.cy - (mercatorY(lat) - g.cyMerc) * g.pxPerRadian,
  });
}

// The reverse: the longitude/latitude shown at a pixel of the iframe.
export function makeInverse(spec: MapViewSpec) {
  const g = geometry(spec);
  return (x: number, y: number) => ({
    lon: g.center.lon + (((x - g.cx) / g.pxPerRadian) * 180) / Math.PI,
    lat: latFromMercatorY(g.cyMerc - (y - g.cy) / g.pxPerRadian),
  });
}
