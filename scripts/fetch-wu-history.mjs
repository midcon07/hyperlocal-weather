// Downloads daily weather summaries for your past Weather Underground
// personal stations into one CSV per station (opens directly in Excel):
//   public/data/history/<STATION_ID>.csv
// plus public/data/history/index.json, which tells the history page which
// stations exist and what dates they cover.
//
// Usage (from the project folder, in PowerShell):
//   $env:WU_API_KEY = "<your Weather Underground API key>"
//   node scripts/fetch-wu-history.mjs
//
// The key is read from your own environment and is never written to a file.
// Weather Underground limits free keys to 1,500 requests a day and 30 a
// minute, and a station-day costs one request, so a long history takes a few
// days of runs. The script remembers every day it has already fetched
// (including days with no data) and picks up where it stopped, so just run it
// again each day until it says everything is done.
//
// Optional environment variables:
//   WU_MAX_CALLS   most requests in one run (default 1400)
//   WU_API_BASE    API address (default https://api.weather.com); for testing

import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const API_KEY = process.env.WU_API_KEY;
const API_BASE = process.env.WU_API_BASE || "https://api.weather.com";
const MAX_CALLS = Number(process.env.WU_MAX_CALLS || 1400);
const SPACING_MS = Number(process.env.WU_SPACING_MS || 2200); // stays under 30 requests a minute

const root = new URL("../", import.meta.url);
// WU_CONFIG / WU_OUT_DIR let a test point somewhere else; normally unused.
const configUrl = process.env.WU_CONFIG ? pathToFileURL(process.env.WU_CONFIG) : new URL("config/wu-stations.json", root);
const outDir = process.env.WU_OUT_DIR
  ? pathToFileURL(process.env.WU_OUT_DIR.replace(/[\\/]*$/, "/"))
  : new URL("public/data/history/", root);

export const COLUMNS = [
  "date",
  "temp_high_f",
  "temp_low_f",
  "temp_avg_f",
  "dewpoint_high_f",
  "dewpoint_low_f",
  "dewpoint_avg_f",
  "humidity_high_pct",
  "humidity_low_pct",
  "humidity_avg_pct",
  "wind_high_mph",
  "wind_low_mph",
  "wind_avg_mph",
  "gust_high_mph",
  "pressure_high_inhg",
  "pressure_low_inhg",
  "precip_total_in",
];

const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : "");

// One Weather Underground "daily" observation -> one CSV row.
export function rowFromObservation(date, obs) {
  const im = obs?.imperial ?? {};
  return [
    date,
    num(im.tempHigh),
    num(im.tempLow),
    num(im.tempAvg),
    num(im.dewptHigh),
    num(im.dewptLow),
    num(im.dewptAvg),
    num(obs?.humidityHigh),
    num(obs?.humidityLow),
    num(obs?.humidityAvg),
    num(im.windspeedHigh),
    num(im.windspeedLow),
    num(im.windspeedAvg),
    num(im.windgustHigh),
    num(im.pressureMax),
    num(im.pressureMin),
    num(im.precipTotal),
  ];
}

const emptyRow = (date) => [date, ...Array(COLUMNS.length - 1).fill("")];

function addDays(iso, n) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function readDoneDates(csvUrl) {
  if (!existsSync(csvUrl)) return new Set();
  const lines = readFileSync(csvUrl, "utf8").split(/\r?\n/).slice(1);
  return new Set(lines.map((l) => l.split(",")[0]).filter(Boolean));
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Returns "stop" if the daily limit or a hard error means we should stop.
async function fetchDay(stationId, date) {
  const url =
    `${API_BASE}/v2/pws/history/daily?stationId=${encodeURIComponent(stationId)}` +
    `&format=json&units=e&date=${date.replaceAll("-", "")}&apiKey=${encodeURIComponent(API_KEY)}`;
  for (let attempt = 1; attempt <= 3; attempt++) {
    let res;
    try {
      res = await fetch(url);
    } catch {
      await sleep(3000 * attempt);
      continue;
    }
    if (res.status === 204) return { obs: null };
    if (res.status === 429) return "stop";
    if (res.status === 401 || res.status === 403) {
      console.error(`Weather Underground refused the request (${res.status}). Check that WU_API_KEY is set correctly.`);
      return "stop";
    }
    if (res.status === 404) return { obs: null };
    if (!res.ok) {
      await sleep(3000 * attempt);
      continue;
    }
    const body = await res.json().catch(() => null);
    return { obs: body?.observations?.[0] ?? null };
  }
  return "stop";
}

function writeIndex(stations) {
  const index = stations.map((s) => {
    const csv = new URL(`${s.id}.csv`, outDir);
    const dates = [...readDoneDates(csv)].sort();
    return { id: s.id, label: s.label || s.id, first: dates[0] ?? null, last: dates[dates.length - 1] ?? null, days: dates.length };
  });
  writeFileSync(new URL("index.json", outDir), JSON.stringify(index, null, 2) + "\n");
}

async function main() {
  if (!API_KEY) {
    console.error('WU_API_KEY is not set. In PowerShell:  $env:WU_API_KEY = "<your key>"  then run this again.');
    process.exit(1);
  }
  const { stations } = JSON.parse(readFileSync(configUrl, "utf8"));
  if (!stations.length) {
    console.error("config/wu-stations.json has no stations yet.");
    process.exit(1);
  }
  mkdirSync(outDir, { recursive: true });

  const today = new Date().toISOString().slice(0, 10);
  let calls = 0;
  let allDone = true;

  outer: for (const station of stations) {
    const csv = new URL(`${station.id}.csv`, outDir);
    if (!existsSync(csv)) writeFileSync(csv, COLUMNS.join(",") + "\n");
    const done = readDoneDates(csv);
    const last = station.end ?? addDays(today, -1);
    let fetched = 0;

    for (let date = station.start; date <= last; date = addDays(date, 1)) {
      if (done.has(date)) continue;
      if (calls >= MAX_CALLS) {
        allDone = false;
        console.log(`Reached ${MAX_CALLS} requests for this run.`);
        break outer;
      }
      const result = await fetchDay(station.id, date);
      calls += 1;
      if (result === "stop") {
        allDone = false;
        console.log("Stopping (daily limit reached or an error). Run again later; progress is saved.");
        break outer;
      }
      const row = result.obs ? rowFromObservation(date, result.obs) : emptyRow(date);
      appendFileSync(csv, row.join(",") + "\n");
      fetched += 1;
      if (fetched % 50 === 0) console.log(`${station.id}: ${date} (${calls} requests so far)`);
      await sleep(SPACING_MS);
    }
    console.log(`${station.id}: up to date through ${last}.`);
  }

  writeIndex(stations);
  console.log(allDone ? "Everything is downloaded." : "More to download: run this again tomorrow.");
}

// Only run when started directly (so the pieces above can be imported by tests).
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
