// Signs and forwards WeatherLink v2 "current conditions" requests so the
// static site can poll for near-real-time station data without ever
// holding the WeatherLink API secret client-side. Deploy with Wrangler;
// see README.md in this folder.

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

export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN || "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      const { WEATHERLINK_API_KEY, WEATHERLINK_API_SECRET, WEATHERLINK_STATION_ID } = env;
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
