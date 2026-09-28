# WeatherLink proxy (Cloudflare Worker)

This is a tiny serverless function that lets the static site fetch your
station's current conditions in near-real-time (as often as once a minute)
without ever exposing your WeatherLink API secret in the browser. GitHub
Pages can't run this itself — it's a separate free service (Cloudflare's
free tier: 100,000 requests/day, no credit card required).

Without this deployed, the site still works — the "Your Station" card just
falls back to whatever GitHub Actions last committed (every ~5 minutes).

## Deploy it

1. **Create a Cloudflare account** (free) at https://dash.cloudflare.com/sign-up
   if you don't already have one.

2. From this folder, log in and deploy:
   ```bash
   cd cloudflare-worker
   npx wrangler login      # opens a browser tab to authorize
   npx wrangler deploy
   ```
   This prints your Worker's URL, e.g.
   `https://hyperlocal-weather-proxy.<your-subdomain>.workers.dev`.

3. **Set your WeatherLink credentials as Worker secrets** (never committed
   to git):
   ```bash
   npx wrangler secret put WEATHERLINK_API_KEY
   npx wrangler secret put WEATHERLINK_API_SECRET
   npx wrangler secret put WEATHERLINK_STATION_ID
   ```
   Each prompts you to paste the value.

4. **Point the site at your Worker.** Back in the repo root, set a GitHub
   Actions repository *variable* (not a secret — this URL ends up in the
   public JS bundle anyway, which is fine, it's just an endpoint) so the
   build picks it up:
   ```bash
   gh variable set VITE_WEATHERLINK_PROXY_URL --body "https://hyperlocal-weather-proxy.<your-subdomain>.workers.dev"
   ```

5. Push any commit (or re-run the "Build and deploy" workflow manually) to
   rebuild the site with the proxy URL baked in. The "Your Station" card
   will switch from "Synced" to "Live" and start polling every 60 seconds.

## Notes

- `wrangler.toml` restricts CORS to `https://midcon07.github.io` via
  `ALLOWED_ORIGIN`. Update it if you ever change domains.
- The Worker only ever returns current-conditions readings (temperature,
  humidity, wind, rain, pressure) — never your API key/secret.

## METAR route

The same Worker also serves `<your-worker-url>/metar`, which proxies the
FAA's aviationweather.gov METAR API for KIKV (aviationweather.gov doesn't
send CORS headers, so the browser can't call it directly). No credentials
or extra setup needed — it reuses `VITE_WEATHERLINK_PROXY_URL`. To watch a
different station, set a `METAR_STATION_ID` Worker variable; it defaults to
`KIKV`. Redeploy (`npx wrangler deploy`) after pulling this change for the
"Aviation METAR" card to go live.
