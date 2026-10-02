// Signs and forwards WeatherLink v2 "current conditions" requests so the
// static site can poll for near-real-time station data without ever
// holding the WeatherLink API secret client-side. Also proxies the
// aviationweather.gov METAR API, which has no CORS headers of its own, so
// the browser can poll KIKV directly. Deploy with Wrangler; see README.md
// in this folder.

async function signParams(params, apiSecret) {
  const sortedKeys = Object.keys(params).sort();
  const message = sortedKeys.map((k) => `${k}${params[k]}`).join("");
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(apiSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sigBuffer = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return [...new Uint8Array(sigBuffer)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function jsonResponse(body, status, corsHeaders) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function toMetarReading(latest) {
  return {
    stationId: latest.icaoId,
    raw: latest.rawOb,
    type: latest.metarType,
    observedAt: latest.reportTime,
    tempC: latest.temp ?? null,
    dewpointC: latest.dewp ?? null,
    windDirDeg: latest.wdir ?? null,
    windSpeedKt: latest.wspd ?? null,
    visibilitySm: latest.visib ?? null,
    altimeterInHg: typeof latest.altim === "number" ? latest.altim / 33.8639 : null,
    flightCategory: latest.fltCat ?? null,
  };
}

async function handleMetar(env, corsHeaders) {
  const stationIds = (env.METAR_STATION_IDS || "KDSM,KIKV")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const res = await fetch(
    `https://aviationweather.gov/api/data/metar?ids=${stationIds.join(",")}&format=json&hours=2`
  );
  if (!res.ok) {
    return jsonResponse({ error: `METAR request failed: ${res.status}` }, 502, corsHeaders);
  }
  const reports = await res.json();

  // aviationweather.gov returns every station's recent reports interleaved,
  // newest first — keep just the first (latest) one per requested station,
  // in the order the stations were requested.
  const readings = stationIds
    .map((id) => reports.find((r) => r.icaoId === id))
    .filter(Boolean)
    .map(toMetarReading);

  if (readings.length === 0) {
    return jsonResponse({ error: `No recent METAR for ${stationIds.join(", ")}.` }, 502, corsHeaders);
  }

  return jsonResponse(readings, 200, corsHeaders);
}

export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN || "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const { pathname } = new URL(request.url);
    if (pathname === "/metar") {
      try {
        return await handleMetar(env, corsHeaders);
      } catch (err) {
        return jsonResponse({ error: String(err) }, 500, corsHeaders);
      }
    }

    try {
      const WEATHERLINK_API_KEY = env.WEATHERLINK_API_KEY?.trim();
      const WEATHERLINK_API_SECRET = env.WEATHERLINK_API_SECRET?.trim();
      const WEATHERLINK_STATION_ID = env.WEATHERLINK_STATION_ID?.trim();

      const t = Math.floor(Date.now() / 1000);
      const params = { "api-key": WEATHERLINK_API_KEY, "station-id": WEATHERLINK_STATION_ID, t };
      const signature = await signParams(params, WEATHERLINK_API_SECRET);

      const url = new URL(`https://api.weatherlink.com/v2/current/${WEATHERLINK_STATION_ID}`);
      url.searchParams.set("api-key", WEATHERLINK_API_KEY);
      url.searchParams.set("t", String(t));
      url.searchParams.set("api-signature", signature);

      const res = await fetch(url);
      if (!res.ok) {
        return jsonResponse({ error: `WeatherLink request failed: ${res.status}` }, 502, corsHeaders);
      }
      const data = await res.json();

      const iss = data.sensors.find(
        (s) => s.data?.[0] && "temp" in s.data[0] && "wind_speed_last" in s.data[0]
      );
      const reading = iss?.data?.[0];
      if (!reading) {
        return jsonResponse({ error: "No ISS sensor reading found." }, 502, corsHeaders);
      }

      const baro = data.sensors.find((s) => s.data?.[0] && "bar_sea_level" in s.data[0]);
      const baroReading = baro?.data?.[0];

      return jsonResponse(
        {
          timestamp: new Date(reading.ts * 1000).toISOString(),
          temperatureF: reading.temp ?? null,
          humidityPct: reading.hum ?? null,
          windSpeedMph: reading.wind_speed_last ?? null,
          windGustMph: reading.wind_speed_hi_last_10_min ?? null,
          windDirectionDeg: reading.wind_dir_last ?? null,
          rainRateInPerHr: reading.rain_rate_last_in ?? null,
          rainDayIn: reading.rainfall_day_in ?? null,
          barometricPressureInHg: baroReading?.bar_sea_level ?? null,
          uvIndex: reading.uv_index ?? null,
          solarRadiationWm2: reading.solar_rad ?? null,
        },
        200,
        corsHeaders
      );
    } catch (err) {
      return jsonResponse({ error: String(err) }, 500, corsHeaders);
    }
  },
};
