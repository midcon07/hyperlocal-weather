// Active NWS alerts limited to what the radar actually shows, so a watch in
// Maine doesn't clutter the list. Same no-key, CORS-friendly API as nws.ts.
//
// The radar card covers roughly 36-46N, 102.4W-85.1W (derived from the
// iframe's zoom level and native size; padded a few tenths of a degree). NWS has no
// bounding-box alert query, so this asks for the states that overlap that
// box and then filters precisely:
//   - Alerts with a polygon (tornado/severe thunderstorm/flash flood
//     warnings): kept if the polygon's extent overlaps the box.
//   - Zone-based alerts (watches, advisories) carry no geometry, only a list
//     of affected zones. Each zone's location is looked up once, cached in
//     localStorage (zones never move), and the alert is kept if any zone
//     falls inside the box. A few zones are resolved per refresh, so a
//     first visit during a big outbreak fills in over a couple of minutes;
//     until a zone is known its state decides (core states only).

export interface MapAlert {
  id: string;
  event: string;
  headline: string | null;
  description: string;
  severity: string;
  areaDesc: string;
  expires: string | null;
}

const BOX = { south: 35.6, north: 46.1, west: -102.7, east: -84.8 };

// States that overlap the box at all.
const STATES = [
  "SD", "NE", "KS", "OK", "MN", "IA", "MO", "AR", "WI", "IL", "IN", "KY", "TN", "MI", "CO", "TX", "NM",
];

// States that sit mostly inside the box: an unresolved zone here is assumed
// to be in view; elsewhere it's assumed not to be until its location is known.
const CORE_STATES = new Set(["IA", "MO", "IL", "NE", "KS", "WI", "SD"]);

const ZONE_CACHE_KEY = "hw-zone-centroids-v1";
const ZONES_PER_REFRESH = 40;

interface AlertFeature {
  geometry: GeoJsonGeometry | null;
  properties: {
    id: string;
    event: string;
    headline: string | null;
    description: string;
    severity: string;
    areaDesc: string;
    expires: string | null;
    ends: string | null;
    messageType: string;
    affectedZones: string[];
  };
}

type Position = number[];
type GeoJsonGeometry =
  | { type: "Polygon"; coordinates: Position[][] }
  | { type: "MultiPolygon"; coordinates: Position[][][] }
  | { type: "GeometryCollection"; geometries: GeoJsonGeometry[] };

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { Accept: "application/geo+json" } });
  if (!res.ok) throw new Error(`NWS request failed: ${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

function inBox(lat: number, lon: number) {
  return lat >= BOX.south && lat <= BOX.north && lon >= BOX.west && lon <= BOX.east;
}

function rings(geometry: GeoJsonGeometry): Position[][] {
  switch (geometry.type) {
    case "Polygon":
      return geometry.coordinates ?? [];
    case "MultiPolygon":
      return (geometry.coordinates ?? []).flat();
    case "GeometryCollection":
      return (geometry.geometries ?? []).flatMap(rings);
    default:
      return [];
  }
}

// Does the polygon's bounding rectangle overlap the radar box?
function geometryOverlaps(geometry: GeoJsonGeometry): boolean {
  let minLon = Infinity;
  let maxLon = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;
  for (const ring of rings(geometry)) {
    for (const [lon, lat] of ring) {
      minLon = Math.min(minLon, lon);
      maxLon = Math.max(maxLon, lon);
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
    }
  }
  return minLon <= BOX.east && maxLon >= BOX.west && minLat <= BOX.north && maxLat >= BOX.south;
}

function centroid(geometry: GeoJsonGeometry): [number, number] | null {
  let lonSum = 0;
  let latSum = 0;
  let count = 0;
  for (const ring of rings(geometry)) {
    for (const [lon, lat] of ring) {
      lonSum += lon;
      latSum += lat;
      count += 1;
    }
  }
  if (count === 0) return null;
  return [Math.round((latSum / count) * 100) / 100, Math.round((lonSum / count) * 100) / 100];
}

type ZoneCache = Record<string, [number, number]>;

function loadZoneCache(): ZoneCache {
  try {
    return JSON.parse(localStorage.getItem(ZONE_CACHE_KEY) ?? "{}") as ZoneCache;
  } catch {
    return {};
  }
}

function saveZoneCache(cache: ZoneCache) {
  try {
    localStorage.setItem(ZONE_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Private mode or full storage: the lookup just repeats next time.
  }
}

// "https://api.weather.gov/zones/county/IAC153" -> "IA"
function stateOfZone(url: string) {
  return url.split("/").pop()?.slice(0, 2) ?? "";
}

async function resolveZones(urls: string[], cache: ZoneCache) {
  const pending = urls.filter((u) => !(u in cache)).slice(0, ZONES_PER_REFRESH);
  for (let i = 0; i < pending.length; i += 8) {
    const batch = pending.slice(i, i + 8);
    const results = await Promise.allSettled(batch.map((u) => getJson<{ geometry: GeoJsonGeometry | null }>(u)));
    results.forEach((r, j) => {
      if (r.status !== "fulfilled" || !r.value.geometry) return;
      const spot = centroid(r.value.geometry);
      if (spot) cache[batch[j]] = spot;
    });
  }
  if (pending.length) saveZoneCache(cache);
}

const SEVERITY_RANK: Record<string, number> = { Extreme: 4, Severe: 3, Moderate: 2, Minor: 1 };

export async function fetchMapAlerts(): Promise<MapAlert[]> {
  const data = await getJson<{ features: AlertFeature[] }>(
    `https://api.weather.gov/alerts/active?status=actual&area=${STATES.join(",")}`
  );
  const now = Date.now();
  const live = data.features.filter((f) => {
    if (f.properties.messageType === "Cancel") return false;
    const end = f.properties.ends ?? f.properties.expires;
    return !end || new Date(end).getTime() > now;
  });

  const cache = loadZoneCache();
  const needZones = live
    .filter((f) => !f.geometry)
    .flatMap((f) => f.properties.affectedZones ?? []);
  try {
    await resolveZones([...new Set(needZones)], cache);
  } catch {
    // Location lookups are best effort; unresolved zones fall back to state.
  }

  const inView = live.filter((f) => {
    if (f.geometry) return geometryOverlaps(f.geometry);
    return (f.properties.affectedZones ?? []).some((url) => {
      const spot = cache[url];
      return spot ? inBox(spot[0], spot[1]) : CORE_STATES.has(stateOfZone(url));
    });
  });

  return inView
    .map((f) => ({
      id: f.properties.id,
      event: f.properties.event,
      headline: f.properties.headline,
      description: f.properties.description,
      severity: f.properties.severity,
      areaDesc: f.properties.areaDesc,
      expires: f.properties.ends ?? f.properties.expires,
    }))
    .sort((a, b) => (SEVERITY_RANK[b.severity] ?? 0) - (SEVERITY_RANK[a.severity] ?? 0) || a.event.localeCompare(b.event));
}
