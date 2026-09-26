// One-off diagnostic: lists stations visible to your WeatherLink API key so
// you can confirm the correct WEATHERLINK_STATION_ID. Prints only station
// names/IDs (no secrets). Safe to run via GitHub Actions logs.

import { createHmac } from "node:crypto";

function sign(params, apiSecret) {
  const sortedKeys = Object.keys(params).sort();
  const message = sortedKeys.map((k) => `${k}${params[k]}`).join("");
  return createHmac("sha256", apiSecret).update(message).digest("hex");
}

const apiKey = process.env.WEATHERLINK_API_KEY;
const apiSecret = process.env.WEATHERLINK_API_SECRET;

if (!apiKey || !apiSecret) {
  console.error("Missing WEATHERLINK_API_KEY / WEATHERLINK_API_SECRET.");
  process.exit(1);
}

const t = Math.floor(Date.now() / 1000);
const params = { "api-key": apiKey, t };
const signature = sign(params, apiSecret);

const url = new URL("https://api.weatherlink.com/v2/stations");
url.searchParams.set("api-key", apiKey);
url.searchParams.set("t", String(t));
url.searchParams.set("api-signature", signature);

const res = await fetch(url);
const body = await res.text();

console.log(`Status: ${res.status}`);
console.log(body);
