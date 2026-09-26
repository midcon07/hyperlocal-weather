// Runs both fetchers, merges results into public/data/latest.json, and
// appends a capped rolling history entry to public/data/history.json for
// the station-vs-NWS comparison chart. Run on a schedule by
// .github/workflows/fetch-data.yml.

import "dotenv/config";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { fetchNwsData } from "./fetch-nws.mjs";
import { fetchWeatherlinkData } from "./fetch-weatherlink.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, "..");
const dataDir = path.join(rootDir, "public", "data");
const config = JSON.parse(
  readFileSync(path.join(rootDir, "config", "site.config.json"), "utf-8")
);

function readJsonIfExists(filePath, fallback) {
  if (!existsSync(filePath)) return fallback;
  try {
    return JSON.parse(readFileSync(filePath, "utf-8"));
  } catch {
    return fallback;
  }
}

async function main() {
  mkdirSync(dataDir, { recursive: true });

  const [nws, station] = await Promise.all([
    fetchNwsData().catch((err) => {
      console.error(`NWS fetch failed: ${err.message}`);
      return null;
    }),
    fetchWeatherlinkData().catch((err) => {
      console.error(`WeatherLink fetch failed: ${err.message}`);
      return null;
    }),
  ]);

  const generatedAt = new Date().toISOString();

  const latest = {
    generatedAt,
    location: config.location,
    station,
    nws,
  };

  writeFileSync(
    path.join(dataDir, "latest.json"),
    JSON.stringify(latest, null, 2) + "\n"
  );

  const historyPath = path.join(dataDir, "history.json");
  const history = readJsonIfExists(historyPath, []);

  history.push({
    timestamp: generatedAt,
    stationTemperatureF: station?.temperatureF ?? null,
    nwsTemperatureC: nws?.observation?.temperatureC ?? null,
  });

  const maxEntries = config.history?.maxEntries ?? 500;
  const trimmed = history.slice(-maxEntries);

  writeFileSync(historyPath, JSON.stringify(trimmed, null, 2) + "\n");

  console.log(`Wrote latest.json and history.json (${trimmed.length} entries) at ${generatedAt}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
