// One-off generator for public/data/zones.json: simplified outlines of the
// NWS forecast zones and counties around the radar's coverage area, so the
// page can draw watches/advisories by county without fetching shapes at
// runtime. Zone boundaries change only a few times a year; re-run this
// (node scripts/build-zone-outlines.mjs) when NWS announces zone changes.
//
// Output: { "<UGC code>": [ring, ring, ...] } where each ring is a flat
// array [lon*100, lat*100, lon*100, lat*100, ...] of integers (about 1 km
// resolution after simplification).

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const config = JSON.parse(readFileSync(new URL("../config/site.config.json", import.meta.url), "utf8"));
const HEADERS = {
  "User-Agent": `hyperlocal-weather zone outlines (${config.nws.contact})`,
  Accept: "application/geo+json",
};

// States that overlap the radar's area, and a box a little wider than the
// area the page watches (zones whose center is outside are dropped).
const STATES = ["SD", "NE", "KS", "OK", "MN", "IA", "MO", "AR", "WI", "IL", "IN", "KY", "TN", "MI", "CO", "TX", "NM"];
const KEEP = { south: 34.8, north: 47.2, west: -104.2, east: -83.8 };
const EPSILON = 0.012; // degrees, Douglas-Peucker tolerance
const CONCURRENCY = 5;

async function getJson(url, tries = 4) {
  for (let attempt = 1; attempt <= tries; attempt++) {
    try {
      const res = await fetch(url, { headers: HEADERS });
      if (res.ok) return await res.json();
      if (res.status !== 429 && res.status < 500) throw new Error(`${res.status} for ${url}`);
    } catch (err) {
      if (attempt === tries) throw err;
    }
    await new Promise((r) => setTimeout(r, 800 * attempt));
  }
  throw new Error(`gave up on ${url}`);
}

function ringsOf(geometry) {
  if (!geometry) return [];
  if (geometry.type === "Polygon") return geometry.coordinates.slice(0, 1); // outer ring only
  if (geometry.type === "MultiPolygon") return geometry.coordinates.map((poly) => poly[0]);
  if (geometry.type === "GeometryCollection") return geometry.geometries.flatMap(ringsOf);
  return [];
}

function perpendicularDistance(p, a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  if (dx === 0 && dy === 0) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  const t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy);
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

function simplify(points, epsilon) {
  if (points.length < 3) return points;
  let maxDist = 0;
  let index = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const d = perpendicularDistance(points[i], points[0], points[points.length - 1]);
    if (d > maxDist) {
      maxDist = d;
      index = i;
    }
  }
  if (maxDist <= epsilon) return [points[0], points[points.length - 1]];
  return [...simplify(points.slice(0, index + 1), epsilon).slice(0, -1), ...simplify(points.slice(index), epsilon)];
}

function encode(ring) {
  const simple = simplify(ring, EPSILON);
  if (simple.length < 4) return null;
  return simple.flatMap(([lon, lat]) => [Math.round(lon * 100), Math.round(lat * 100)]);
}

function center(ring) {
  const lon = ring.reduce((s, p) => s + p[0], 0) / ring.length;
  const lat = ring.reduce((s, p) => s + p[1], 0) / ring.length;
  return [lat, lon];
}

async function main() {
  const jobs = [];
  for (const state of STATES) {
    for (const type of ["forecast", "county"]) {
      const list = await getJson(`https://api.weather.gov/zones?area=${state}&type=${type}`);
      for (const f of list.features) jobs.push({ type, id: f.properties.id });
      console.log(`${state} ${type}: ${list.features.length} zones`);
    }
  }
  console.log(`fetching ${jobs.length} zone shapes...`);

  const zones = {};
  let done = 0;
  let kept = 0;
  let next = 0;
  async function worker() {
    while (next < jobs.length) {
      const job = jobs[next++];
      try {
        const zone = await getJson(`https://api.weather.gov/zones/${job.type}/${job.id}`);
        const rings = ringsOf(zone.geometry).filter((r) => r.length >= 4);
        if (rings.length) {
          const biggest = rings.reduce((a, b) => (b.length > a.length ? b : a));
          const [lat, lon] = center(biggest);
          if (lat >= KEEP.south && lat <= KEEP.north && lon >= KEEP.west && lon <= KEEP.east) {
            const encoded = rings.map(encode).filter(Boolean);
            if (encoded.length) {
              zones[job.id] = encoded;
              kept += 1;
            }
          }
        }
      } catch (err) {
        console.warn(`skipped ${job.id}: ${err.message}`);
      }
      done += 1;
      if (done % 200 === 0) console.log(`${done}/${jobs.length} (kept ${kept})`);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  mkdirSync(new URL("../public/data/", import.meta.url), { recursive: true });
  const out = JSON.stringify(zones);
  writeFileSync(new URL("../public/data/zones.json", import.meta.url), out);
  console.log(`wrote ${Object.keys(zones).length} zones, ${(out.length / 1024).toFixed(0)} KB`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
