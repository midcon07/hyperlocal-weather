// Weather fronts from NWS: the Weather Prediction Center's National Forecast
// Chart, served as map data (no key, and the server allows browser requests).
// "Day 1" is the chart for today; each front type comes back as lines of
// longitude/latitude points. The direction a line was drawn in matters: NWS
// puts cold-front triangles (and stationary-front triangles) on the LEFT of
// the direction of travel, and warm-front half-circles on the left too, with a
// stationary front's half-circles on the right (measured against NWS's own
// rendering of this layer).

export type FrontKind = "cold" | "warm" | "occluded" | "stationary" | "trough";

export interface Front {
  kind: FrontKind;
  /** Each line is a run of [lon, lat] points in the direction it was drawn. */
  lines: [number, number][][];
}

export interface FrontSet {
  fronts: Front[];
  /** e.g. "Mon Oct 12 2026" - the day the chart is valid for. */
  valid: string | null;
}

const LAYER_URL =
  "https://mapservices.weather.noaa.gov/vector/rest/services/outlooks/natl_fcst_wx_chart/MapServer/2/query" +
  "?where=1%3D1&outFields=feat,popupconte&returnGeometry=true&outSR=4326&f=geojson";

function kindOf(name: string): FrontKind | null {
  const n = name.toLowerCase();
  if (n.startsWith("cold front")) return "cold";
  if (n.startsWith("warm front")) return "warm";
  if (n.startsWith("occluded front")) return "occluded";
  if (n.startsWith("stationary front")) return "stationary";
  if (n.startsWith("trough")) return "trough";
  return null;
}

interface GeoFeature {
  properties: { feat?: string; popupconte?: string };
  geometry: { type: string; coordinates: unknown } | null;
}

export async function fetchFronts(): Promise<FrontSet> {
  const res = await fetch(LAYER_URL);
  if (!res.ok) throw new Error(`Fronts request failed: ${res.status}`);
  const data = (await res.json()) as { features?: GeoFeature[] };

  const fronts: Front[] = [];
  let valid: string | null = null;
  for (const f of data.features ?? []) {
    const kind = kindOf(f.properties.feat ?? "");
    if (!kind || !f.geometry) continue;
    const lines =
      f.geometry.type === "LineString"
        ? [f.geometry.coordinates as [number, number][]]
        : f.geometry.type === "MultiLineString"
          ? (f.geometry.coordinates as [number, number][][])
          : [];
    fronts.push({ kind, lines: lines.map((l) => l.map(([lon, lat]) => [lon, lat] as [number, number])) });
    valid ??= f.properties.popupconte?.split("Valid:")[1]?.trim() ?? null;
  }
  return { fronts, valid };
}
