# Hyperlocal Weather

A hyperlocal weather analytics & forecasting dashboard that blends official
[National Weather Service](https://www.weather.gov/documentation/services-web-api)
data with readings from a personal Davis Vantage Pro 2 station (via
[WeatherLink](https://www.weatherlink.com/)). Built as a static site so it can
run entirely on GitHub's free hosting (GitHub Pages) with GitHub Actions doing
the data collection — no server to run or pay for.

**Live site:** `https://midcon07.github.io/hyperlocal-weather/` (active once
the first deploy finishes)

## How it works

Two independent paths feed the "current conditions" cards, so each source
refreshes as fast as it reasonably can — plus a slower persisted path for
the historical comparison chart.

**Live NWS (client-side, ~60s):** `src/api/nws.ts` calls `api.weather.gov`
directly from the browser (no key needed, and NWS's API allows cross-origin
requests). `useNwsLive` polls it every 60 seconds with a manual "Refresh
now" too. Not limited by GitHub Actions' cron floor.

**Live station (client-side via proxy, ~60s):** WeatherLink requires a
signed, secret-holding request, so the browser can't call it directly.
`src/api/weatherlink.ts` instead calls a small Cloudflare Worker
(`cloudflare-worker/`) that holds your WeatherLink secret and signs the
request server-side. If that Worker isn't deployed yet, the "Your Station"
card falls back to the last GitHub-Actions-synced reading — see
[cloudflare-worker/README.md](cloudflare-worker/README.md) to enable it.

**Persisted history (GitHub Actions, every 5 min):**

```
┌─────────────────┐     ┌──────────────────┐
│  api.weather.gov │     │ WeatherLink v2 API│
└────────┬─────────┘     └────────┬─────────┘
         │                        │
         └──────────┬─────────────┘
                     ▼
     .github/workflows/fetch-data.yml   (cron: every 5 min — GitHub's floor)
        scripts/build-data.mjs
                     │
                     ▼
       public/data/latest.json, history.json   (committed to main)
                     │
                     ▼
     .github/workflows/deploy.yml   (on push, or when fetch-data completes)
        npm run build → dist/  →  GitHub Pages
```

This slower path exists so the comparison chart has a continuous trend even
when nobody has the site open (the live client-side polling only runs while
a browser tab is active), and so both cards have *something* to show on
first load before the live fetches complete.

- **`scripts/fetch-nws.mjs` / `scripts/fetch-weatherlink.mjs` /
  `scripts/build-data.mjs`** — the Node versions of the same fetches, run by
  GitHub Actions to build the persisted snapshot/history.
- **`src/api/nws.ts` / `src/api/weatherlink.ts`** — the browser versions,
  used for live polling.
- **`src/hooks/useLiveSource.ts`** — generic polling hook (fetch on mount,
  auto-refresh on an interval, manual refresh, countdown) used by both
  `useNwsLive` and `useStationLive`.

## One-time setup (do this before the site has real data)

1. **Set your location.** Edit [`config/site.config.json`](config/site.config.json)
   with your town name, latitude, and longitude.
2. **Get WeatherLink v2 API credentials:**
   - Log in at [weatherlink.com](https://www.weatherlink.com/), go to your
     account's API settings, and generate a v2 API key/secret.
   - Find your station ID (visible in the WeatherLink app/site, or via the
     `/v2/stations` endpoint once you have a key).
3. **Add repo secrets** (Settings → Secrets and variables → Actions → New
   repository secret, or via `gh secret set NAME`):
   - `WEATHERLINK_API_KEY`
   - `WEATHERLINK_API_SECRET`
   - `WEATHERLINK_STATION_ID`
4. **Enable GitHub Pages** (Settings → Pages → Source → "GitHub Actions").
   This repo's `deploy.yml` workflow handles the rest.
5. Push to `main` (or run the `fetch-data` and `build-and-deploy` workflows
   manually from the Actions tab) and the dashboard will populate on the
   next scheduled run.
6. **(Optional, for real-time station updates)** deploy the Cloudflare
   Worker proxy — see [cloudflare-worker/README.md](cloudflare-worker/README.md).
   Without it, the station card still works, just synced every 5 min
   instead of every 60s.

Until secrets are configured, the site still deploys and renders — it just
shows "no station data yet" in place of your station's readings.

## Local development

```bash
npm install
npm run dev          # starts Vite dev server
```

To test the data-fetch scripts locally, copy `.env.example` to `.env`, fill
in your WeatherLink credentials, then:

```bash
npm run fetch:data   # writes public/data/latest.json and history.json
```

## Continuing development from an iPad

This repo is the source of truth on GitHub, so you can keep building from
anywhere:

- **Claude app (iPad):** open this repo (`midcon07/hyperlocal-weather`) in a
  Claude Code session to keep making changes — commits pushed to `main`
  trigger the deploy workflow automatically.
- **Safari / Edge (iPad):** open the live Pages URL above to review the site,
  and the GitHub repo's **Actions** tab to check on data-fetch/deploy runs.

## Project structure

```
config/site.config.json   Location + non-secret settings
scripts/                   Node scripts run by GitHub Actions to fetch data
public/data/               Generated JSON consumed by the frontend (committed)
src/api/                   Browser-side live fetchers (NWS direct, station via proxy)
src/hooks/                 useLiveSource (polling) and the two source-specific hooks
src/                        React + TypeScript dashboard
cloudflare-worker/         Optional serverless proxy for real-time station data
.github/workflows/         fetch-data.yml (cron) and deploy.yml (Pages)
```
