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

```
┌─────────────────┐     ┌──────────────────┐
│  api.weather.gov │     │ WeatherLink v2 API│
└────────┬─────────┘     └────────┬─────────┘
         │                        │
         └──────────┬─────────────┘
                     ▼
     .github/workflows/fetch-data.yml   (runs every 15 min)
        scripts/build-data.mjs
                     │
                     ▼
       public/data/latest.json, history.json   (committed to main)
                     │
                     ▼
     .github/workflows/deploy.yml   (runs on every push to main)
        npm run build → dist/  →  GitHub Pages
                     │
                     ▼
              React dashboard (src/)
```

- **`scripts/fetch-nws.mjs`** — pulls the point forecast, hourly forecast, and
  nearest station's latest observation from `api.weather.gov` for the
  location in `config/site.config.json`. No API key needed.
- **`scripts/fetch-weatherlink.mjs`** — pulls current conditions for your
  station from the WeatherLink v2 API (signed request using your API
  key/secret).
- **`scripts/build-data.mjs`** — runs both, writes `public/data/latest.json`,
  and appends a capped rolling window to `public/data/history.json` for the
  station-vs-NWS comparison chart.
- **`src/`** — a Vite + React + TypeScript dashboard that fetches those two
  JSON files client-side and renders current conditions, the forecast, and
  the comparison chart. Nothing server-side is required at request time.

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
src/                       React + TypeScript dashboard
.github/workflows/         fetch-data.yml (cron) and deploy.yml (Pages)
```
